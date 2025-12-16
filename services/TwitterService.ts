import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { Tweet, User, RateLimit, TwitterResponse } from '../types';
import { logger } from '../utils/logger';

export class TwitterService {
  private client: TwitterApi;
  private userId: string = '';
  private initialized: boolean = false;
  private retryCount = 0;
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second base delay
  private rateLimitDelay = 15000; // 15 seconds delay for rate limits

  constructor(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    bearerToken: string,
  ) {
    // Initialize user client with OAuth 1.0a
    this.client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });
    logger.info('Initialized Twitter client with OAuth 1.0a');
    
    // Test connectivity immediately
    this.testConnectivity().catch(error => {
      logger.error('Failed initial connectivity test:', error);
    });
  }

  private async testConnectivity(): Promise<void> {
    try {
      logger.info('Testing Twitter API connectivity...');
      const me = await this.client.v2.me();
      this.userId = me.data.id;
      this.initialized = true;
      logger.info('Twitter API test successful:', {
        id: me.data.id,
        username: me.data.username,
      });
    } catch (error) {
      logger.error('Twitter API connectivity test failed:', error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleRateLimit(error: any): Promise<void> {
    const resetTime = error.rateLimit?.reset;
    if (resetTime) {
      const now = Date.now();
      const resetDate = new Date(resetTime * 1000);
      const waitTime = Math.max(0, resetDate.getTime() - now);
      
      if (waitTime > 0 && waitTime < 900000) { // Only wait if less than 15 minutes
        logger.info(`Rate limited. Waiting ${waitTime}ms until ${resetDate}`);
        await this.delay(waitTime);
      } else {
        logger.info('Rate limit too long, using default delay');
        await this.delay(this.rateLimitDelay);
      }
    } else {
      await this.delay(this.rateLimitDelay);
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (error.code === 429 || (typeof error.message === 'string' && error.message.includes('Rate limit'))) {
          await this.handleRateLimit(error);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  private async initializeUserId(): Promise<void> {
    try {
      if (!this.userId) {
        logger.info('Initializing Twitter user ID...');
        const me = await this.retryOperation(() => this.client.v2.me());
        this.userId = me.data.id;
        logger.info(`Initialized Twitter user ID: ${this.userId} (@${me.data.username})`);
        this.initialized = true;
      }
    } catch (error) {
      logger.error('Failed to initialize user ID:', error);
      throw error;
    }
  }

  async getMentionsWithRateLimit(sinceId?: string): Promise<TwitterResponse> {
    try {
      if (!this.initialized) {
        await this.initializeUserId();
      }
      
      logger.info('Fetching mentions...', { sinceId });
      const response = await this.retryOperation(() => 
        this.client.v2.userMentionTimeline(this.userId, {
          since_id: sinceId,
          expansions: ['referenced_tweets.id', 'in_reply_to_user_id', 'author_id'],
          'tweet.fields': ['created_at', 'conversation_id', 'referenced_tweets', 'author_id'],
          'user.fields': ['id', 'name', 'username'],
          max_results: 1, // Only fetch 1 tweet for testing
        })
      );

      if (!response.data || !Array.isArray(response.data)) {
        logger.warn('No mentions found or invalid response format', response);
        return { 
          mentions: [], 
          rateLimit: response.rateLimit as RateLimit 
        };
      }

      const tweets = response.data.map((tweet: TweetV2) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id || '',
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        conversationId: tweet.conversation_id,
        referencedTweets: tweet.referenced_tweets?.map(ref => ({
          type: ref.type as 'replied_to' | 'quoted' | 'retweeted',
          id: ref.id,
        })),
      }));

      logger.info(`Found ${tweets.length} mention(s) for testing`);
      return { 
        mentions: tweets, 
        rateLimit: response.rateLimit as RateLimit 
      };
    } catch (error) {
      logger.error('Failed to fetch mentions:', error);
      throw error;
    }
  }

  async getTweetById(tweetId: string): Promise<Tweet | null> {
    return this.retryOperation(async () => {
      try {
        logger.info(`Fetching tweet by ID: ${tweetId}`);
        const tweet = await this.client.v2.singleTweet(tweetId);
        
        if (!tweet.data) {
          return null;
        }

        return {
          id: tweet.data.id,
          text: tweet.data.text,
          authorId: tweet.data.author_id || '',
          createdAt: new Date(), // Use current time if no created_at available
          conversationId: tweet.data.conversation_id
        };
      } catch (error) {
        logger.error(`Error fetching tweet ${tweetId}:`, error);
        throw error;
      }
    });
  }

  async replyToTweet(text: string, replyToTweetId: string): Promise<void> {
    return this.retryOperation(async () => {
      try {
        if (!this.initialized) {
          await this.initializeUserId();
        }
        
        logger.info(`Replying to tweet ${replyToTweetId}`);
        await this.client.v2.reply(text, replyToTweetId);
        logger.info(`Successfully replied to tweet ${replyToTweetId}`);
      } catch (error) {
        logger.error(`Error replying to tweet ${replyToTweetId}:`, error);
        throw error;
      }
    });
  }

  async getUserInfo(userId: string): Promise<User> {
    try {
      logger.info(`Fetching user info for ${userId}`);
      const response = await this.retryOperation(() =>
        this.client.v2.user(userId, {
          'user.fields': ['description', 'public_metrics', 'username'],
        })
      );

      const user: UserV2 = response.data;

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        description: user.description,
        metrics: {
          followersCount: user.public_metrics?.followers_count || 0,
          followingCount: user.public_metrics?.following_count || 0,
          tweetCount: user.public_metrics?.tweet_count || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch user info:', error);
      throw error;
    }
  }
}
