import { jobRequirements } from './jobRequirements.js';
import { LLMClient, ResponseParser } from '@/lib/llm-client/src/index.js';
import EvaluationPrompts from './prompts.js';
import { keywordDetector } from '@/app/extraction/public';

/**
 * LLM-based Resume Scoring Module
 * Implements 10-point scoring system with integrated evaluation signals
 * Supports dynamic keywords from job settings
 */
export class ResumeScorer {
  constructor(customJobRequirements = null) {
    // Use custom requirements if provided, otherwise use default
    this.jobReqs = customJobRequirements || jobRequirements;

    // Initialize the unified LLM client with GPT-4o
    this.client = new LLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0,
      timeout: 60000,
      costTracking: true,
      logging: process.env.NODE_ENV === 'development',
    });

    this.responseParser = new ResponseParser();

    // Configure keyword detector based on job requirements
    this.configureKeywordDetector();
  }

  /**
   * Configure keyword detector based on job requirements
   * Uses required/preferred keywords from job settings if available
   */
  configureKeywordDetector() {
    const required = this.jobReqs.skills?.required || [];
    const preferred = this.jobReqs.skills?.preferred || [];

    keywordDetector.setKeywords(required, preferred);
  }

  /**
   * Get required keywords from job requirements
   * @returns {string[]} Array of required keywords
   */
  getRequiredKeywords() {
    return this.jobReqs.skills?.required || [];
  }

  /**
   * Check if any required keyword is found in scan results
   * @param {Object} keywordScan - Scan results from keywordDetector
   * @returns {boolean} True if at least one required keyword was found
   */
  hasAnyRequiredKeyword(keywordScan) {
    const required = this.getRequiredKeywords();

    // If no required keywords defined, don't gate
    if (required.length === 0) {
      return true;
    }

    return required.some((keyword) => {
      const key = keyword.toLowerCase().trim();
      return keywordScan.detectedKeywords[key]?.found;
    });
  }

  /**
   * Get keyword detection results for required keywords
   * @param {Object} keywordScan - Scan results from keywordDetector
   * @returns {Object} Detection results for required keywords
   */
  getRequiredKeywordMatches(keywordScan) {
    const required = this.getRequiredKeywords();
    const matches = {};

    required.forEach((keyword) => {
      const key = keyword.toLowerCase().trim();
      matches[keyword] = keywordScan.detectedKeywords[key] || { found: false, confidence: 0 };
    });

    return matches;
  }

  /**
   * Get keyword detection results for preferred keywords
   * @param {Object} keywordScan - Scan results from keywordDetector
   * @returns {Object} Detection results for preferred keywords
   */
  getPreferredKeywordMatches(keywordScan) {
    const preferred = this.jobReqs.skills?.preferred || [];
    const matches = {};

    preferred.forEach((keyword) => {
      const key = keyword.toLowerCase().trim();
      matches[keyword] = keywordScan.detectedKeywords[key] || { found: false, confidence: 0 };
    });

    return matches;
  }

  /**
   * Score self-evaluation section (0-1 scale) with Passion & Communication signals
   */
  async scoreSelfEvaluation(selfEvaluation) {
    const prompt = EvaluationPrompts.buildSelfEvaluationPrompt(selfEvaluation, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 1);
    } catch {
      return this.getErrorResponse(1, 'Self-evaluation scoring failed');
    }
  }

  /**
   * Score skills and specialties (0-2 scale) with Brains & Selectivity signals
   */
  async scoreSkillsSpecialties(skillsSpecialties, fullResumeData = null) {
    // Scan for keywords (uses dynamic keywords from job settings)
    const skillsText = JSON.stringify(skillsSpecialties);
    const keywordScan = keywordDetector.scanText(skillsText);

    const prompt = EvaluationPrompts.buildSkillsPrompt(
      skillsSpecialties,
      this.jobReqs,
      fullResumeData,
    );

    try {
      const result = await this.evaluateWithLLM(prompt);
      const parsedResult = this.parseLLMResponse(result, 2);

      // Add keyword detection info using dynamic keywords
      parsedResult.details.keywordDetection = {
        required: this.getRequiredKeywordMatches(keywordScan),
        preferred: this.getPreferredKeywordMatches(keywordScan),
      };

      return parsedResult;
    } catch {
      return this.getErrorResponse(2, 'Skills scoring failed');
    }
  }

  /**
   * Score work experience (0-4 scale) with Hardcore, Communication & Diversity signals
   */
  async scoreWorkExperience(workExperience) {
    // Scan for keywords (uses dynamic keywords from job settings)
    const workExpText = JSON.stringify(workExperience);
    const keywordScan = keywordDetector.scanText(workExpText);

    // Check if any required keyword is found
    const hasRequired = this.hasAnyRequiredKeyword(keywordScan);
    const requiredKeywords = this.getRequiredKeywords();

    // Gate on required keywords (only if required keywords are defined)
    if (!hasRequired && requiredKeywords.length > 0) {
      return {
        score: 0,
        maxScore: 4,
        percentage: 0,
        reasoning: `No required experience detected (${requiredKeywords.join(', ')}) - critical requirement not met`,
        signals: {},
        details: {
          keywordDetection: {
            required: this.getRequiredKeywordMatches(keywordScan),
            preferred: this.getPreferredKeywordMatches(keywordScan),
          },
        },
      };
    }

    const prompt = EvaluationPrompts.buildExperiencePrompt(workExperience, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      const parsedResult = this.parseLLMResponse(result, 4);

      // Add keyword detection info using dynamic keywords
      parsedResult.details.keywordDetection = {
        required: this.getRequiredKeywordMatches(keywordScan),
        preferred: this.getPreferredKeywordMatches(keywordScan),
      };

      return parsedResult;
    } catch {
      return this.getErrorResponse(4, 'Work experience scoring failed');
    }
  }

  /**
   * Score basic information (0-1 scale)
   */
  async scoreBasicInformation(basicInformation) {
    const prompt = EvaluationPrompts.buildBasicInfoPrompt(basicInformation, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 1);
    } catch {
      return this.getErrorResponse(1, 'Basic information scoring failed');
    }
  }

  /**
   * Score education background (0-2 scale) with Selectivity & Brains signals
   */
  async scoreEducationBackground(educationBackground) {
    const prompt = EvaluationPrompts.buildEducationPrompt(educationBackground, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 2);
    } catch {
      return this.getErrorResponse(2, 'Education scoring failed');
    }
  }

  /**
   * Evaluate with LLM using unified client
   */
  async evaluateWithLLM(messages) {
    try {
      // Initialize client if needed
      await this.client.initialize();

      // Make the LLM call with our unified client (always returns JSON)
      const response = await this.client.complete(messages);

      // Parse the JSON response
      const parseResult = this.responseParser.parse(response);

      if (!parseResult.success) {
        throw new Error(`Response parsing failed: ${parseResult.error}`);
      }

      return parseResult.data;
    } catch (error) {
      throw new Error(`LLM evaluation failed: ${error.message}`);
    }
  }

  /**
   * Parse LLM response and validate
   */
  parseLLMResponse(result, maxScore) {
    try {
      const score = Math.max(0, Math.min(parseFloat(result.score || 0), maxScore));

      return {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        reasoning: result.reasoning || 'LLM evaluation completed',
        signals: result.signals_found || {},
        details: result,
      };
    } catch (error) {
      return this.getErrorResponse(maxScore, `Failed to parse LLM response: ${error.message}`);
    }
  }

  /**
   * Check if any required keyword was found in a category result
   * @private
   */
  checkRequiredKeywordsInResult(categoryResult) {
    const requiredMatches = categoryResult.details?.keywordDetection?.required;
    if (!requiredMatches) return false;

    return Object.values(requiredMatches).some((match) => match.found);
  }

  /**
   * Apply critical requirement gates to final score
   * Uses dynamic required keywords from job settings
   */
  applyCriticalGates(categoryScores, overallScore) {
    let finalPercentage = overallScore.percentage;
    const penalties = [];

    const requiredKeywords = this.getRequiredKeywords();
    const workExperienceResult = categoryScores.workExperience;
    const skillsResult = categoryScores.skillsSpecialties;

    // Only apply keyword gate if required keywords are defined
    if (requiredKeywords.length > 0) {
      const hasRequiredInWork = this.checkRequiredKeywordsInResult(workExperienceResult);
      const hasRequiredInSkills = this.checkRequiredKeywordsInResult(skillsResult);

      if (!hasRequiredInWork && !hasRequiredInSkills) {
        finalPercentage = Math.min(finalPercentage, 40);
        penalties.push(`Missing required skills (${requiredKeywords.join(', ')}) - capped at 40%`);
      }
    }

    // Check for language proficiency gate (only if language requirements are defined)
    const languageRequirements = this.jobReqs.languages?.required?.requirements || [];
    const skillsSpecialtiesResult = categoryScores.skillsSpecialties;

    if (languageRequirements.length > 0) {
      if (
        !skillsSpecialtiesResult.details?.language_evidence ||
        skillsSpecialtiesResult.details.language_evidence.toLowerCase().includes('no evidence')
      ) {
        finalPercentage = Math.min(finalPercentage, 50);
        const langNames = languageRequirements.map((r) => r.language).join(', ');
        penalties.push(`Insufficient language proficiency evidence (${langNames}) - capped at 50%`);
      }
    }

    return {
      ...overallScore,
      finalPercentage,
      penalties,
      gatesApplied: penalties.length > 0,
    };
  }

  /**
   * Calculate overall score from all categories
   */
  calculateOverallScore(categoryScores) {
    const totalScore = Object.values(categoryScores).reduce(
      (sum, category) => sum + category.score,
      0,
    );
    const maxTotalScore = Object.values(categoryScores).reduce(
      (sum, category) => sum + category.maxScore,
      0,
    );

    const baseResult = {
      totalScore: Math.round(totalScore * 10) / 10,
      maxTotalScore,
      percentage: Math.round((totalScore / maxTotalScore) * 100),
    };

    // Apply critical requirement gates
    return this.applyCriticalGates(categoryScores, baseResult);
  }

  /**
   * Get error response for failed evaluations
   */
  getErrorResponse(maxScore, message) {
    return {
      score: 0,
      maxScore,
      percentage: 0,
      reasoning: message,
      signals: {},
      error: true,
    };
  }

  /**
   * Handle missing data gracefully
   */
  handleMissingData(data, category) {
    if (!data) {
      return this.getErrorResponse(
        this.getMaxScoreForCategory(category),
        `No ${category} data provided`,
      );
    }
    return null;
  }

  /**
   * Get max score for category
   */
  getMaxScoreForCategory(category) {
    const maxScores = {
      selfEvaluation: 1,
      skillsSpecialties: 2,
      workExperience: 4,
      basicInformation: 1,
      educationBackground: 2,
    };
    return maxScores[category] || 1;
  }
}
