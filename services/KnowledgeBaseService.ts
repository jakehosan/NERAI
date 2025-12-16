import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export class KnowledgeBaseService {
  private knowledgeBasePath: string;

  constructor(knowledgeBasePath: string) {
    this.knowledgeBasePath = knowledgeBasePath;
  }

  async loadKnowledgeBase(): Promise<string> {
    try {
      logger.info('Loading knowledge base...');
      const content = await fs.readFile(this.knowledgeBasePath, 'utf-8');
      logger.info('Knowledge base loaded successfully', { contentLength: content.length });
      return content;
    } catch (error) {
      logger.error('Failed to load knowledge base:', error);
      throw error;
    }
  }

  async searchKnowledge(query: string): Promise<string> {
    try {
      const knowledgeBase = await this.loadKnowledgeBase();
      
      // Create a prompt that combines the query with the knowledge base
      const prompt = `
Based on the following knowledge base about $BTB, please provide a relevant and concise response to the query.

Knowledge Base:
${knowledgeBase}

Query: ${query}

Please provide a clear, concise response that directly addresses the query using information from the knowledge base.
`;

      return prompt;
    } catch (error) {
      logger.error('Failed to search knowledge base:', error);
      throw error;
    }
  }
}
