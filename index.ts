import path from 'path';
import { config } from 'dotenv';
import { TwitterService } from './services/TwitterService';
import { ClaudeService } from './services/ClaudeService';
import { KnowledgeBaseService } from './services/KnowledgeBaseService';
import { BTBTweetService } from './services/BTBTweetService';
import { logger } from './utils/logger';

// Load environment variables
config();

async function main() {
  try {
    logger.info('Loading configuration...');

    // Initialize services
    const twitterService = new TwitterService(
      process.env.TWITTER_API_KEY!,
      process.env.TWITTER_API_SECRET!,
      process.env.TWITTER_ACCESS_TOKEN!,
      process.env.TWITTER_ACCESS_TOKEN_SECRET!,
      process.env.TWITTER_BEARER_TOKEN!
    );

    const claudeService = new ClaudeService(
      process.env.CLAUDE_API_KEY!
    );

    const knowledgeBaseService = new KnowledgeBaseService(
      path.join(__dirname, '..', 'knowledge_base', 'btb_info.txt')
    );

    // Initialize BTB tweet service
    const btbTweetService = new BTBTweetService(
      twitterService,
      claudeService,
      knowledgeBaseService
    );

    logger.info('Starting Autonomous AI Agent');

    // Start processing tweets every minute
    await btbTweetService.startProcessing(60000);
  } catch (error) {
    logger.error('Error in main loop:', error);
    process.exit(1);
  }
}

main();
