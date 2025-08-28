import { LLMClient, PromptBuilder, ResponseParser } from '@/lib/llm-client/src/index.js';
import ExtractionPrompts from './prompts.js';
import { keywordDetector } from './keywordDetector.js';

class LLMExtractor {
  constructor() {
    this.client = new LLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0,
    });

    this.responseParser = new ResponseParser();
  }

  /**
   * Extract structured data from resume text using LLM
   * @param {string} resumeText - Cleaned resume text
   * @returns {Promise<Object>} - Structured resume data
   */
  async extractResumeData(resumeText) {
    try {
      const preScanResult = keywordDetector.scanText(resumeText);

      const enhancedText = keywordDetector.enhanceTextForExtraction(resumeText, preScanResult);

      await this.client.initialize();

      const prompt = new PromptBuilder()
        .setRole('resume_extractor')
        .addSystemMessage(ExtractionPrompts.getSystemPrompt())
        .addUserMessage(ExtractionPrompts.getUserPrompt(enhancedText))
        .build();

      const response = await this.client.complete(prompt.messages);

      const parseResult = this.responseParser.parse(response);

      if (!parseResult.success) {
        throw new Error(`Response parsing failed: ${parseResult.error}`);
      }

      const validation = keywordDetector.validateExtraction(parseResult.data, resumeText);

      if (!validation.valid) {
        // Removed info/warning logs for post-extraction validation

        if (validation.errors.some((e) => e.includes('Critical keyword'))) {
          // Removed info log for retrying extraction
          return await this.extractWithKeywordPreservation(resumeText, preScanResult);
        }
      }

      parseResult.data._keywordMetadata = {
        preScan: preScanResult.summary,
        postValidation: validation.keywordComparison,
        validationPassed: validation.valid,
      };

      return parseResult.data;
    } catch (error) {
      throw new Error(`Resume extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract with explicit keyword preservation instructions
   * @private
   */
  async extractWithKeywordPreservation(resumeText, preScanResult) {
    try {
      const keywordList = Object.entries(preScanResult.detectedKeywords)
        .filter(([, detection]) => detection.found)
        .map(([keyword]) => keyword);

      const enhancedSystemPrompt = `${ExtractionPrompts.getSystemPrompt()}

CRITICAL INSTRUCTION: The following keywords were detected in the resume and MUST be preserved in the extraction:
${keywordList.map((k) => `- ${k.toUpperCase()}`).join('\n')}

Ensure these keywords appear in the appropriate sections (work experience, skills, etc.) where they were originally found.`;

      const prompt = new PromptBuilder()
        .setRole('resume_extractor')
        .addSystemMessage(enhancedSystemPrompt)
        .addUserMessage(ExtractionPrompts.getUserPrompt(resumeText))
        .build();

      const response = await this.client.complete(prompt.messages);
      const parseResult = this.responseParser.parse(response);

      if (!parseResult.success) {
        throw new Error(`Retry extraction failed: ${parseResult.error}`);
      }

      const retryValidation = keywordDetector.validateExtraction(parseResult.data, resumeText);

      // Removed info/warning logs for retry validation

      parseResult.data._keywordMetadata = {
        preScan: preScanResult.summary,
        postValidation: retryValidation.keywordComparison,
        validationPassed: retryValidation.valid,
        retryAttempted: true,
      };

      return parseResult.data;
    } catch (error) {
      throw new Error(`Keyword preservation extraction failed: ${error.message}`);
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

export const llmExtractor = new LLMExtractor();
