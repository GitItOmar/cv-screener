import { resumeAgent } from '../../../lib/agents/resumeAgent.js';
import PromptTemplates from '../../../lib/agents/promptTemplates.js';

class LLMExtractor {
  constructor() {
    this.agent = resumeAgent;
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
      // Simple single extraction attempt
      const messages = PromptTemplates.getMinimalPrompt(resumeText);

      // Prepare extraction options for the agent
      const agentOptions = {
        model: this.extractionOptions.model,
        temperature: this.extractionOptions.temperature,
        maxTokens: this.extractionOptions.maxTokens,
        messages,
      };

      // Use the buildExtractionPrompt method but override with our messages
      const originalBuildMethod = this.agent.buildExtractionPrompt;
      this.agent.buildExtractionPrompt = () => messages;

      try {
        const result = await this.agent.extractResumeData(resumeText, agentOptions);
        return result;
      } finally {
        // Restore original method
        this.agent.buildExtractionPrompt = originalBuildMethod;
      }
    } catch (error) {
      throw new Error(`Resume extraction failed: ${error.message}`);
    }
  }

  /**
   * Get extraction statistics
   * @returns {Object} - Current extraction statistics
   */
  getExtractionStats() {
    return this.agent.getCostTracking();
  }

  /**
   * Reset extraction statistics
   */
  resetStats() {
    this.agent.resetCostTracking();
  }

  /**
   * Test LLM connection
   * @returns {Promise<boolean>} - Whether connection is working
   */
  async testConnection() {
    return await this.agent.testConnection();
  }
}

// Export singleton instance
export const llmExtractor = new LLMExtractor();
