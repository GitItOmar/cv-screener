import { jobRequirements } from './jobRequirements.js';
import { LLMClient, ResponseParser } from '@/lib/llm-client/src/index.js';
import EvaluationPrompts from './prompts.js';

/**
 * LLM-based Resume Scoring Module
 * Implements 10-point scoring system with integrated evaluation signals
 */
export class ResumeScorer {
  constructor() {
    this.jobReqs = jobRequirements;

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
  }

  /**
   * Score self-evaluation section (0-1 scale) with Passion & Communication signals
   */
  async scoreSelfEvaluation(selfEvaluation) {
    const prompt = EvaluationPrompts.buildSelfEvaluationPrompt(selfEvaluation);

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
  async scoreSkillsSpecialties(skillsSpecialties) {
    const prompt = EvaluationPrompts.buildSkillsPrompt(skillsSpecialties, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 2);
    } catch {
      return this.getErrorResponse(2, 'Skills scoring failed');
    }
  }

  /**
   * Score work experience (0-4 scale) with Hardcore, Communication & Diversity signals
   */
  async scoreWorkExperience(workExperience) {
    const prompt = EvaluationPrompts.buildExperiencePrompt(workExperience, this.jobReqs);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 4);
    } catch {
      return this.getErrorResponse(4, 'Work experience scoring failed');
    }
  }

  /**
   * Score basic information (0-1 scale) with language proficiency check
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
      const response = await this.client.complete(messages, {
        temperature: 0,
        maxTokens: 1000,
      });

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
   * Apply critical requirement gates to final score
   */
  applyCriticalGates(categoryScores, overallScore) {
    let finalPercentage = overallScore.percentage;
    const penalties = [];

    // Check for Shopify experience gate
    const workExperienceResult = categoryScores.workExperience;
    if (workExperienceResult.score === 0 || !workExperienceResult.details?.shopify_experience) {
      finalPercentage = Math.min(finalPercentage, 40);
      penalties.push('No Shopify experience - capped at 40%');
    }

    // Check for language proficiency gate
    const basicInfoResult = categoryScores.basicInformation;
    if (
      !basicInfoResult.details?.language_evidence ||
      basicInfoResult.details.language_evidence.toLowerCase().includes('no evidence')
    ) {
      finalPercentage = Math.min(finalPercentage, 50);
      penalties.push('Insufficient language proficiency evidence - capped at 50%');
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

export default ResumeScorer;
