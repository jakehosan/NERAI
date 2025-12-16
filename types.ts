// Defines Twitter-related data structures and app configuration types

export interface TweetData {
  readonly id: string;
  readonly content: string;
  readonly authorId: string;
  readonly timestamp: Date;
  readonly conversationId?: string;
  readonly referencedTweets?: {
    readonly relation: 'replied_to' | 'quoted' | 'retweeted';
    readonly tweetId: string;
  }[];
}

export interface TwitterUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly bio?: string;
  readonly profileImageUrl?: string; // optional field for avatar URL
  readonly stats?: {
    readonly followers: number;
    readonly following: number;
    readonly totalTweets: number;
  };
}

export interface RateLimitInfo {
  readonly maxCalls: number;
  readonly remainingCalls: number;
  readonly resetEpochSeconds: number;
}

export interface TwitterApiResponse {
  readonly mentions: TweetData[];
  readonly rateLimit: RateLimitInfo;
}

export interface BlockchainTransaction {
  readonly id?: string;
  readonly transactionHash: string;
  readonly sender: string;
  readonly receiver: string;
  readonly amountRaw: string;
  readonly amountFormatted?: string;
  readonly currencySymbol?: string;
  readonly date: Date;
  readonly status?: 'pending' | 'confirmed' | 'failed' | 'completed';
}

export interface AppConfig {
  readonly twitter: {
    readonly apiKey: string;
    readonly apiSecretKey: string;
    readonly accessToken: string;
    readonly accessTokenSecret: string;
    readonly bearerToken: string;
  };
  readonly languageModel: {
    readonly apiKey: string;
    readonly modelName: string;
    readonly maxTokens: number;
    readonly provider?: string;
  };
  readonly wallet: {
    readonly privateKey: string;
    readonly rpcEndpoint: string;
    readonly networkName?: string;
  };
  readonly monitoring?: {
    readonly enabled: boolean;
    readonly pollingIntervalMs: number;
    readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
    readonly metricsEnabled?: boolean;
  };
}
