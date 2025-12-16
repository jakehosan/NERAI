import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import { ClaudeService } from './services/ClaudeService';
import { KnowledgeBaseService } from './services/KnowledgeBaseService';
import { TwitterService } from './services/TwitterService';
import { loadConfig } from './config/config';
import { logger } from './utils/logger';

loadEnv();

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generic retry helper
async function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  onError?: (err: any, attempt: number) => void
): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (onError) onError(err, i);
      if (i < attempts) await delay(delayMs);
    }
  }
  throw lastError;
}

// Rate limit handler
async function handleRateLimit(resetTimestamp: number): Promise<void> {
  const currentTime = Date.now();
  const resetDate = new Date(resetTimestamp * 1000);
  const timeToWait = Math.max(0, resetDate.getTime() - currentTime);

  if (timeToWait > 0 && timeToWait < 900000) { // <15 minutes
    logger.info(
      `Pausing due to rate limit until ${resetDate.toISOString()} (${Math.ceil(timeToWait / 1000)}s)`
    );
    await delay(timeToWait);
  } else {
    throw new Error('Rate limit reset time exceeds acceptable wait period');
  }
}

export class CustomFinanceBot {
  private twitterClient: TwitterService;
  private languageModel: ClaudeService;
  private knowledgeBase: KnowledgeBaseService;

  constructor(private appConfig: any) {
    this.twitterClient = new TwitterService(
      appConfig.twitter.apiKey,
      appConfig.twitter.apiSecret,
      appConfig.twitter.accessToken,
      appConfig.twitter.accessTokenSecret,
      appConfig.twitter.bearerToken
    );

    this.languageModel = new ClaudeService(appConfig.llm.apiKey);

    const kbPath =
      process.env.KB_PATH ||
      path.join(__dirname, '../knowledge_base/custom_info.txt');

    this.knowledgeBase = new KnowledgeBaseService(kbPath);
  }

  private async fetchTweet(tweetId: string): Promise<any> {
    return retry(
      async () => {
        return await this.twitterClient.getTweetById(tweetId);
      },
      this.appConfig.bot?.maxRetries || 3,
      this.appConfig.bot?.rateLimitSleepMs || 15000,
      (err, attempt) => {
        logger.warn(`Attempt ${attempt} to fetch tweet failed: ${err.message}`);
      }
    );
  }

  private async getLanguageModelResponse(promptText: string): Promise<string> {
    return retry(
      async () => {
        let response = await this.languageModel.getResponse(promptText);
        if (response.length > 280) response = response.slice(0, 277) + '...';
        return response;
      },
      this.appConfig.bot?.maxRetries || 3,
      5000,
      (err, attempt) => {
        logger.warn(`Attempt ${attempt} to get LM response failed: ${err.message}`);
      }
    );
  }

  private async replyToTweet(response: string, tweetId: string): Promise<void> {
    return retry(
      async () => {
        if (this.appConfig.bot?.dryRun) {
          logger.info('[Dry run] Would reply:', { response, tweetId });
          return;
        }
        await this.twitterClient.replyToTweet(response, tweetId);
        logger.info('Reply posted successfully', { tweetId });
      },
      this.appConfig.bot?.maxRetries || 3,
      this.appConfig.bot?.rateLimitSleepMs || 15000,
      async (err, attempt) => {
        logger.warn(`Attempt ${attempt} to reply failed: ${err.message}`);
        if (err?.rateLimit?.reset) {
          try {
            await handleRateLimit(err.rateLimit.reset);
          } catch {
            logger.error('Rate limit wait too long, will retry later');
          }
        }
      }
    );
  }

  public async run(): Promise<void> {
    try {
      const targetTweetId =
        process.env.TARGET_TWEET_ID || '1876120727234937208';

      const tweetData = await this.fetchTweet(targetTweetId);

      logger.info('Fetched tweet', {
        id: tweetData.id,
        text: tweetData.text
      });

      const userQuestion = tweetData.text
        .replace(/\$CUSTOMTAG/gi, '')
        .replace(/@\w+/g, '')
        .trim();

      const relevantInfo =
        await this.knowledgeBase.searchKnowledge(userQuestion);

      const promptText = `Answer this question regarding Custom Finance: "${userQuestion}"
Based on the following knowledge base excerpts:
${relevantInfo}
Respond concisely within 280 characters to suit a tweet.`;

      const lmResponse =
        await this.getLanguageModelResponse(promptText);

      logger.info('Generated LM response', {
        response: lmResponse,
        length: lmResponse.length
      });

      await this.replyToTweet(lmResponse, tweetData.id);
    } catch (err: any) {
      logger.error('Fatal error in bot operation:', err.message || err);
      throw err;
    }
  }
}

// Run bot
(async (): Promise<void> => {
  try {
    const appConfig = loadConfig();
    const bot = new CustomFinanceBot(appConfig);
    await bot.run();
  } catch (fatalErr: any) {
    logger.error('Unrecoverable error:', fatalErr.message || fatalErr);
    process.exit(1);
  }
})();
