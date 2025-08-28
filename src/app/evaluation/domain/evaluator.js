'use server';

import { ResumeScorer } from './scorer.js';

/**
 * Resume Evaluation Service
 * Orchestrates the complete evaluation process for extracted resume data
 */
class ResumeEvaluator {
  constructor() {
    this.scorer = new ResumeScorer();
  }

  /**
   * Evaluate complete resume data and return scored results
   * @param {Object} resumeData - Extracted resume data structure
   * @returns {Promise<Object>} - Complete evaluation results
   */
  async evaluateResume(resumeData) {
    const startTime = Date.now();

    try {
      // Validate input data structure
      this.validateResumeData(resumeData);

      // Score each category in parallel for better performance
      const [
        selfEvaluationScore,
        skillsScore,
        workExperienceScore,
        basicInfoScore,
        educationScore,
      ] = await Promise.all([
        this.scorer.scoreSelfEvaluation(resumeData.selfEvaluation),
        this.scorer.scoreSkillsSpecialties(resumeData.skillsAndSpecialties, resumeData),
        this.scorer.scoreWorkExperience(resumeData.workExperience),
        this.scorer.scoreBasicInformation(resumeData.basicInformation),
        this.scorer.scoreEducationBackground(resumeData.educationBackground),
      ]);

      // Organize category scores
      const categoryScores = {
        selfEvaluation: selfEvaluationScore,
        skillsSpecialties: skillsScore,
        workExperience: workExperienceScore,
        basicInformation: basicInfoScore,
        educationBackground: educationScore,
      };

      // Calculate overall score with critical gates and contact penalties
      const overallScore = this.scorer.calculateOverallScore(
        categoryScores,
        resumeData.basicInformation,
      );

      // Build comprehensive evaluation result
      const evaluation = {
        overall: overallScore,
        categories: categoryScores,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          scoringVersion: '1.0',
          model: 'gpt-4o',
        },
        summary: this.generateEvaluationSummary(overallScore, categoryScores),
      };

      return {
        success: true,
        data: evaluation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: {
          processingTime: Date.now() - startTime,
          failedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Validate resume data structure
   * @param {Object} resumeData - Resume data to validate
   * @throws {Error} If validation fails
   */
  validateResumeData(resumeData) {
    if (!resumeData || typeof resumeData !== 'object') {
      throw new Error('Invalid resume data: must be an object');
    }

    const requiredSections = [
      'selfEvaluation',
      'skillsAndSpecialties',
      'workExperience',
      'basicInformation',
      'educationBackground',
    ];

    const missingSections = requiredSections.filter((section) => !resumeData[section]);

    if (missingSections.length > 0) {
      throw new Error(`Missing required sections: ${missingSections.join(', ')}`);
    }

    // Validate workExperience is an array
    if (!Array.isArray(resumeData.workExperience)) {
      throw new Error('workExperience must be an array');
    }

    // Validate educationBackground has degrees array
    if (
      !resumeData.educationBackground.degrees ||
      !Array.isArray(resumeData.educationBackground.degrees)
    ) {
      throw new Error('educationBackground.degrees must be an array');
    }

    // Validate contact information - critical gate
    this.validateContactInformation(resumeData.basicInformation);
  }

  /**
   * Validate contact information for candidate reachability
   * @param {Object} basicInformation - Basic information section
   * @throws {Error} If both phone and email are missing
   */
  validateContactInformation(basicInformation) {
    if (!basicInformation) {
      throw new Error('Invalid resume: No contact information (both phone and email missing)');
    }

    const hasPhone = basicInformation.phone && basicInformation.phone.trim() !== '';
    const hasEmail = basicInformation.email && basicInformation.email.trim() !== '';

    // Critical gate: If both phone and email are missing, CV is invalid
    if (!hasPhone && !hasEmail) {
      throw new Error('Invalid resume: No contact information (both phone and email missing)');
    }
  }

  /**
   * Generate evaluation summary
   * @param {Object} overallScore - Overall score results
   * @param {Object} categoryScores - Individual category scores
   * @returns {Object} - Evaluation summary
   */
  generateEvaluationSummary(overallScore, categoryScores) {
    // Find strongest and weakest categories
    const categoryPerformance = Object.entries(categoryScores)
      .map(([category, score]) => ({
        category,
        percentage: score.percentage,
        score: score.score,
        maxScore: score.maxScore,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const strongest = categoryPerformance[0];
    const weakest = categoryPerformance[categoryPerformance.length - 1];

    // Determine recommendation
    let recommendation = 'reject';
    if (overallScore.finalPercentage >= 70) {
      recommendation = 'strong_hire';
    } else if (overallScore.finalPercentage >= 50) {
      recommendation = 'hire';
    } else if (overallScore.finalPercentage >= 30) {
      recommendation = 'maybe';
    }

    return {
      recommendation,
      finalScore: overallScore.finalPercentage,
      totalScore: overallScore.totalScore,
      maxTotalScore: overallScore.maxTotalScore,
      gatesApplied: overallScore.gatesApplied || false,
      penalties: overallScore.penalties || [],
      strengths: {
        category: strongest.category,
        score: strongest.percentage,
        details: categoryScores[strongest.category].reasoning,
      },
      improvements: {
        category: weakest.category,
        score: weakest.percentage,
        details: categoryScores[weakest.category].reasoning,
      },
      categoryBreakdown: categoryPerformance,
    };
  }

  /**
   * Get evaluation statistics
   * @returns {Object} - Current evaluation statistics
   */
  getEvaluationStats() {
    return this.scorer.getScoringStats();
  }

  /**
   * Test evaluation system connection
   * @returns {Promise<boolean>} - Whether evaluation system is working
   */
  async testConnection() {
    try {
      return await this.scorer.testConnection();
    } catch {
      return false;
    }
  }
}

// Export singleton instance for use across the application
export const resumeEvaluator = new ResumeEvaluator();
