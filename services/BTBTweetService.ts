import { ClaudeService } from './ClaudeService';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { TwitterService } from './TwitterService';
import { logger } from '../utils/logger';
import { RateLimit, Tweet } from '../types';


export class BTBTweetService {
  private twitterService: TwitterService;
  private claudeService: ClaudeService;
  private knowledgeBaseService: KnowledgeBaseService;
  private lastProcessedTweetId?: string;
  private isProcessing: boolean = false;
  private nextPollTime: Date = new Date();
  private defaultIntervalMs: number = 60000; // 1 minute default

  constructor(
    twitterService: TwitterService,
    claudeService: ClaudeService,
    knowledgeBaseService: KnowledgeBaseService
  ) {
    this.twitterService = twitterService;
    this.claudeService = claudeService;
    this.knowledgeBaseService = knowledgeBaseService;
  }

  private extractQuestion(tweetText: string): string {
    // Remove $BTB mention, @mentions, and any URLs
    const cleanText = tweetText
      .replace(/\$BTB/gi, '')
      .replace(/@\w+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    return cleanText;
  }

  private updateNextPollTime(rateLimit?: RateLimit): void {
    if (rateLimit?.remaining === 0 && rateLimit?.reset) {
      // Convert reset timestamp to milliseconds and  1 second buffer
      const resetTime = new Date(rateLimit.reset * 1000 + 1000);
      this.nextPollTime = resetTime;
    logger.info('Rate limit hit. Next poll scheduled at:', {
        nextPollISO: this.nextPollTime.toISOString(),
    });

    } else {
      // Use default interval if no rate limit info
      this.nextPollTime = new Date(Date.now() + this.defaultIntervalMs);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processBTBTweets(): Promise<void> {
    if (this.isProcessing) {
      logger.info('Already processing tweets, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      logger.info('Processing $BTB tweets...', { lastProcessedTweetId: this.lastProcessedTweetId });

      // Get mentions since last processed tweet
      const { mentions, rateLimit } = await this.twitterService.getMentionsWithRateLimit(this.lastProcessedTweetId);
      
      // Update next poll time based on rate limit info
      this.updateNextPollTime(rateLimit);

      // Filter for tweets containing $BTB
      const btbTweets = mentions.filter((tweet: Tweet) => 
        tweet.text.toLowerCase().includes('$btb')
      );

      logger.info(`Found ${btbTweets.length} $BTB tweets to process`);

      // Process each tweet
      for (const tweet of btbTweets) {
        try {
          // Skip if we've already processed this tweet
          if (this.lastProcessedTweetId && tweet.id <= this.lastProcessedTweetId) {
            continue;
          }

          // Extract the question from the tweet
          const question = this.extractQuestion(tweet.text);
          
          if (!question) {
            logger.info('No question found in tweet, skipping', { tweetId: tweet.id });
            continue;
          }

          // Get knowledge base context
          const prompt = await this.knowledgeBaseService.searchKnowledge(question);

          // Get Claude's response
          const claudeResponse = await this.claudeService.getResponse(prompt);

          // Format the response to fit Twitter's character limit
          const formattedResponse = this.formatTwitterResponse(claudeResponse);

          // Reply to the tweet
          await this.twitterService.replyToTweet(formattedResponse, tweet.id);

          logger.info('Successfully processed tweet', { tweetId: tweet.id });
          
          // Update last processed tweet ID
          this.lastProcessedTweetId = tweet.id;

          //  a small delay between processing tweets to avoid rate limits
          await this.sleep(1000);
        } catch (error) {
          logger.error('Failed to process tweet:', error, { tweetId: tweet.id });
          // Continue processing other tweets even if one fails
          continue;
        }
      }
    } catch (error: any) {
      logger.error('Failed to process $BTB tweets:', error);
      // Update next poll time if we hit a rate limit
      if (error?.rateLimit) {
        this.updateNextPollTime(error.rateLimit);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private formatTwitterResponse(response: string): string {
    // Twitter's character limit is 280
    const MAX_LENGTH = 280;
    
    if (response.length <= MAX_LENGTH) {
      return response;
    }

  // If response exceeds Twitter's 280 character limit, truncate and append "..."

    return response.substring(0, MAX_LENGTH - 3) + '...';
  }

  // Start processing tweets at regular intervals
  async startProcessing(intervalMs: number = 300000): Promise<void> { // Default to 5 minutes for testing
    this.defaultIntervalMs = intervalMs;
    logger.info('Starting $BTB tweet processing...', { intervalMs });
    
    // Initial processing
    await this.processBTBTweets();

    // Set up interval for continuous processing
    while (true) {
      try {
        const now = new Date();
        const timeUntilNextPoll = Math.max(0, this.nextPollTime.getTime() - now.getTime());

        if (timeUntilNextPoll > 0) {
          logger.info('Waiting for next poll...', {
            timeUntilNextPoll,
            nextPollTime: this.nextPollTime.toISOString(),
          });
          await this.sleep(timeUntilNextPoll);
        }

        await this.processBTBTweets();
      } catch (error) {
        logger.error('Error in processing interval:', error);
        // Wait for the default interval before retrying
        await this.sleep(this.defaultIntervalMs);
      }
    }
  }
}
