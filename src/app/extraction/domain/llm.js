import { LLMClient, PromptBuilder, ResponseParser } from '@/lib/llm-client/src/index.js';
import ExtractionPrompts from './prompts.js';
import { keywordDetector } from './keywordDetector.js';

class LLMExtractor {
  constructor() {
    // Initialize the unified LLM client with GPT-4o
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
      // Pre-extraction keyword scanning
      const preScanResult = keywordDetector.scanText(resumeText);

      // Log critical keyword detection
      if (preScanResult.missingCritical.length > 0) {
        console.warn(
          '[KeywordDetector] Original text missing critical keywords:',
          preScanResult.missingCritical,
        );
      } else {
        console.log('[KeywordDetector] All critical keywords detected in original text');
      }

      // Enhance text with keyword markers for better extraction
      const enhancedText = keywordDetector.enhanceTextForExtraction(resumeText, preScanResult);

      // Initialize client if needed
      await this.client.initialize();

      // Build the prompt using the extraction domain prompts
      const prompt = new PromptBuilder()
        .setRole('resume_extractor')
        .addSystemMessage(ExtractionPrompts.getSystemPrompt())
        .addUserMessage(ExtractionPrompts.getUserPrompt(enhancedText))
        .build();

      // Make the LLM call with our unified client (always returns JSON)
      const response = await this.client.complete(prompt.messages);

      // Parse the JSON response
      const parseResult = this.responseParser.parse(response, {
        schema: ExtractionPrompts.getResponseSchema(),
      });

      if (!parseResult.success) {
        throw new Error(`Response parsing failed: ${parseResult.error}`);
      }

      // Post-extraction validation
      const validation = keywordDetector.validateExtraction(parseResult.data, resumeText);

      if (!validation.valid) {
        console.error('[KeywordDetector] Post-extraction validation failed:', validation.errors);

        // If critical keywords are missing, retry with more explicit instructions
        if (validation.errors.some((e) => e.includes('Critical keyword'))) {
          console.log(
            '[KeywordDetector] Retrying extraction with explicit keyword preservation...',
          );
          return await this.extractWithKeywordPreservation(resumeText, preScanResult);
        }
      }

      // Add keyword detection metadata to the result
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
      // Create enhanced prompt with explicit keyword instructions
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
      const parseResult = this.responseParser.parse(response, {
        schema: ExtractionPrompts.getResponseSchema(),
      });

      if (!parseResult.success) {
        throw new Error(`Retry extraction failed: ${parseResult.error}`);
      }

      // Validate the retry
      const retryValidation = keywordDetector.validateExtraction(parseResult.data, resumeText);

      if (!retryValidation.valid) {
        console.error('[KeywordDetector] Retry validation still failed:', retryValidation.errors);
      }

      // Add metadata
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

// Export singleton instance
export const llmExtractor = new LLMExtractor();
