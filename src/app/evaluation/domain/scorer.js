import { jobRequirements } from '../data/jobRequirements.js';
import { resumeAgent } from '../../../lib/agents/resumeAgent.js';

/**
 * LLM-based Resume Scoring Module
 * Implements 10-point scoring system with integrated evaluation signals
 */
export class ResumeScorer {
  constructor() {
    this.jobReqs = jobRequirements;
    this.llmAgent = resumeAgent;
  }

  /**
   * Score self-evaluation section (0-1 scale) with Passion & Communication signals
   */
  async scoreSelfEvaluation(selfEvaluation) {
    const prompt = this.buildSelfEvaluationPrompt(selfEvaluation);

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
    const prompt = this.buildSkillsPrompt(skillsSpecialties);

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
    const prompt = this.buildExperiencePrompt(workExperience);

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
    const prompt = this.buildBasicInfoPrompt(basicInformation);

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
    const prompt = this.buildEducationPrompt(educationBackground);

    try {
      const result = await this.evaluateWithLLM(prompt);
      return this.parseLLMResponse(result, 2);
    } catch {
      return this.getErrorResponse(2, 'Education scoring failed');
    }
  }

  /**
   * Build self-evaluation LLM prompt
   */
  buildSelfEvaluationPrompt(selfEvaluation) {
    return [
      {
        role: 'system',
        content: `You are evaluating a candidate's self-evaluation for a Shopify Junior Developer role.
        
Score 0-1 points considering:
- Summary quality and clarity (0.4 points)
- Career goals alignment with role (0.3 points)
- PASSION signal: Personal projects, side projects, learning initiatives (0.2 points)
- COMMUNICATION signal: Clear, well-structured presentation (0.1 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "passion": boolean,
    "communication": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this self-evaluation data:
${JSON.stringify(selfEvaluation, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build skills LLM prompt
   */
  buildSkillsPrompt(skillsSpecialties) {
    return [
      {
        role: 'system',
        content: `You are evaluating a candidate's skills for a Shopify Junior Developer role.

Required skills: ${this.jobReqs.skills.required.join(', ')}
Preferred skills: ${this.jobReqs.skills.preferred.join(', ')}

Score 0-2 points considering:
- Required skills match (up to 1.2 points)
- Preferred skills match (up to 0.5 points)
- BRAINS signal: Deep technical understanding, complex problem-solving (0.2 points)
- SELECTIVITY signal: Certifications, continuous learning, competitions (0.1 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "brains": boolean,
    "selectivity": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate these skills:
${JSON.stringify(skillsSpecialties, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build experience LLM prompt
   */
  buildExperiencePrompt(workExperience) {
    return [
      {
        role: 'system',
        content: `You are evaluating work experience for a Shopify Junior Developer role.

CRITICAL REQUIREMENTS:
- Minimum 1 year Shopify experience (MANDATORY - return 0 if missing)
- Relevant roles: ${this.jobReqs.experience.relevantRoles.join(', ')}

Score 0-4 points considering:
- Shopify experience (2.5 points - MANDATORY)
- Years of relevant experience (1 point)
- HARDCORE signal: Ambitious projects, startup experience, high-pressure situations (0.2 points)
- COMMUNICATION signal: Client-facing work, team leadership (0.2 points)
- DIVERSITY signal: Varied industries, international experience (0.1 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "shopify_experience": "description of shopify experience found",
  "signals_found": {
    "hardcore": boolean,
    "communication": boolean,
    "diversity": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this work experience:
${JSON.stringify(workExperience, null, 2)}

Provide score and reasoning. Return 0 if no Shopify experience is found.`,
      },
    ];
  }

  /**
   * Build basic info LLM prompt
   */
  buildBasicInfoPrompt(basicInformation) {
    return [
      {
        role: 'system',
        content: `You are evaluating basic information for a Shopify Junior Developer role.

Requirements:
- Preferred locations: ${this.jobReqs.location.preferred.join(', ')}
- Required language proficiency: C1 English or German with evidence

Score 0-1 points considering:
- Contact completeness (name, email, phone) (0.4 points)
- Location alignment with DACH region (0.3 points)
- Language proficiency evidence (C1 English/German) (0.3 points)

Look for language evidence in:
- Explicit proficiency statements
- Education in English/German-speaking countries
- Work experience in these countries
- Language certifications

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "language_evidence": "description of language proficiency evidence found"
}`,
      },
      {
        role: 'user',
        content: `Evaluate this basic information:
${JSON.stringify(basicInformation, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build education LLM prompt
   */
  buildEducationPrompt(educationBackground) {
    return [
      {
        role: 'system',
        content: `You are evaluating education for a Shopify Junior Developer role.

Acceptable education:
- Formal degrees: ${this.jobReqs.education.preferredFields.join(', ')}
- Alternatives: ${this.jobReqs.education.alternatives.join(', ')}

Score 0-2 points considering:
- Relevant formal education (up to 1.3 points)
- Alternative education paths (bootcamps, self-taught) (up to 1 point)
- SELECTIVITY signal: Bootcamp completion, competitions, selective programs (0.4 points)
- BRAINS signal: Academic achievements, complex projects (0.3 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "selectivity": boolean,
    "brains": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this education background:
${JSON.stringify(educationBackground, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Evaluate with LLM using existing resumeAgent
   */
  async evaluateWithLLM(messages) {
    // Override the buildExtractionPrompt method temporarily
    const originalMethod = this.llmAgent.buildExtractionPrompt;
    this.llmAgent.buildExtractionPrompt = () => messages;

    try {
      const result = await this.llmAgent.extractResumeData('', {
        model: 'gpt-3.5-turbo',
        temperature: 0,
        maxTokens: 1000,
      });

      return result;
    } finally {
      // Restore original method
      this.llmAgent.buildExtractionPrompt = originalMethod;
    }
  }

  /**
   * Parse LLM response and validate
   */
  parseLLMResponse(result, maxScore) {
    try {
      // Extract the response content
      let responseContent = result;
      if (result.positionAppliedFor) {
        // If it's a full extraction result, we need to look for our scoring data
        responseContent = result.metadata?.rawResponse || result;
      }

      const score = Math.max(0, Math.min(parseFloat(responseContent.score || 0), maxScore));

      return {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        reasoning: responseContent.reasoning || 'LLM evaluation completed',
        signals: responseContent.signals_found || {},
        details: responseContent,
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
