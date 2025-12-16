import axios from 'axios';
import { logger } from '../utils/logger';

export class ClaudeService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds between retries

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Claude API request failed (attempt ${i + 1}/${this.maxRetries}):`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (i < this.maxRetries - 1) {
          await this.delay(this.retryDelay);
        }
      }
    }
    
    throw lastError;
  }

  async getResponse(prompt: string): Promise<string> {
    return this.retryOperation(async () => {
      try {
        logger.info('Requesting Claude response...', { promptLength: prompt.length });
        
        const response = await axios.post(
          `${this.baseUrl}/messages`,
          {
            model: 'claude-3-opus-20240229',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: prompt
            }]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01'
            },
            timeout: 30000, // 30 second timeout
            proxy: false
          }
        );

        if (response.data && response.data.content) {
          logger.info('Successfully received Claude response');
          return response.data.content;
        } else {
          logger.error('Unexpected response format from Claude API', { response: JSON.stringify(response.data) });
          throw new Error('Unexpected response format from Claude API');
        }
      } catch (error) {
        logger.error('Failed to get Claude response:', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });
  }
}
