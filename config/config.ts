import { config as loadEnv } from 'dotenv';
import { AgentConfig } from '../types';
import { logger } from '../utils/logger';

const envResult = loadEnv();
if (envResult.error) {
  logger.error('Failed to load .env file:', envResult.error);
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function isConfigValid(cfg: Partial<AgentConfig>): cfg is AgentConfig {
  const mandatory = [
    'twitter.apiKey',
    'twitter.apiSecret',
    'twitter.accessToken',
    'twitter.accessTokenSecret',
    'twitter.bearerToken',
    'llm.apiKey',
    'wallet.privateKey',
    'wallet.rpcUrl'
  ];

  for (const key of mandatory) {
    const val = getNestedValue(cfg, key);
    if (!val) {
      logger.error(`Config missing required field: ${key}`, process.env);
      throw new Error(`Required config missing: ${key}`);
    }
  }

  return true;
}

export function loadConfig(): AgentConfig {
  logger.info('Starting configuration load...');
  logger.debug('Loaded environment variables:', {
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN ? '***REDACTED***' : undefined,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? '***REDACTED***' : undefined,
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY ? '***REDACTED***' : undefined,
    ETH_RPC_URL: process.env.ETH_RPC_URL,
  });

  const cfg: AgentConfig = {
    twitter: {
      apiKey: process.env.TWITTER_API_KEY ?? '',
      apiSecret: process.env.TWITTER_API_SECRET ?? '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN ?? '',
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET ?? '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN ?? '',
    },
    llm: {
      provider: 'claude',
      apiKey: process.env.CLAUDE_API_KEY ?? '',
      model: 'claude-3-opus-20240229',
      maxTokens: 1024,
    },
    wallet: {
      network: process.env.ETH_NETWORK ?? 'mainnet',
      rpcUrl: process.env.ETH_RPC_URL ?? '',
      privateKey: process.env.WALLET_PRIVATE_KEY ?? '',
    },
    monitoring: {
      enabled: true,
      interval: 60000,
      logLevel: 'info',
      enableMetrics: true,
    },
  };

  if (!isConfigValid(cfg)) {
    throw new Error('Configuration validation failed.');
  }

  return cfg;
}
