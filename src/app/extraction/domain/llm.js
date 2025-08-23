import { LLMClient, PromptBuilder, ResponseParser } from '@/lib/llm-client/src/index.js';
import ExtractionPrompts from './prompts.js';

class LLMExtractor {
  constructor() {
    // Initialize the unified LLM client with GPT-4o
    this.client = new LLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3,
      timeout: 60000,
      costTracking: true,
      logging: process.env.NODE_ENV === 'development',
    });

    this.responseParser = new ResponseParser();

    this.extractionOptions = {
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 2000,
    };
  }

  /**
   * Extract structured data from resume text using LLM
   * @param {string} resumeText - Cleaned resume text
   * @returns {Promise<Object>} - Structured resume data
   */
  async extractResumeData(resumeText) {
    try {
      // Initialize client if needed
      await this.client.initialize();

      // Build the prompt using the extraction domain prompts
      const prompt = new PromptBuilder()
        .setRole('resume_extractor')
        .addSystemMessage(ExtractionPrompts.getSystemPrompt())
        .addUserMessage(ExtractionPrompts.getUserPrompt(resumeText))
        .build();

      // Make the LLM call with our unified client (always returns JSON)
      const response = await this.client.complete(prompt.messages, {
        temperature: this.extractionOptions.temperature,
        maxTokens: this.extractionOptions.maxTokens,
      });

      // Parse the JSON response
      const parseResult = this.responseParser.parse(response, {
        schema: ExtractionPrompts.getResponseSchema(),
      });

      if (!parseResult.success) {
        throw new Error(`Response parsing failed: ${parseResult.error}`);
      }

      return parseResult.data;
    } catch (error) {
      throw new Error(`Resume extraction failed: ${error.message}`);
    }
  }

  /**
   * Get extraction statistics
   * @returns {Object} - Current extraction statistics
   */
  getExtractionStats() {
    return this.client.getCostTracking();
  }

  /**
   * Reset extraction statistics
   */
  resetStats() {
    this.client.resetCostTracking();
  }

  /**
   * Test LLM connection
   * @returns {Promise<boolean>} - Whether connection is working
   */
  async testConnection() {
    try {
      await this.client.initialize();
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const llmExtractor = new LLMExtractor();
