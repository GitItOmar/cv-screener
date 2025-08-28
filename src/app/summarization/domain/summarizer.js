'use server';

import AgentCoordinator from './coordinator.js';
import ConsensusMechanism from './consensus.js';

/**
 * Main Summarizer class that orchestrates the multi-agent evaluation system
 * Manages the complete pipeline from data input to consensus feedback generation
 */
class ResumeSummarizer {
  constructor(config = {}) {
    this.config = {
      ...config,
    };

    // Initialize components
    this.coordinator = new AgentCoordinator(config.coordinatorConfig);
    this.consensus = new ConsensusMechanism(config.consensusConfig);
  }

  /**
   * Generate comprehensive feedback for a resume
   * @param {Object} params - Summarization parameters
   * @returns {Promise<Object>} Comprehensive feedback with agent perspectives
   */
  async generateFeedback(params) {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(params);

      // Execute agents
      const coordinatorResult = await this.coordinator.executeAgents({
        structuredData: params.structuredData,
        rawText: params.rawText,
        evaluationScores: params.evaluationScores,
        jobRequirements: params.jobRequirements || {},
      });

      // Build consensus
      const consensus = this.consensus.buildConsensus(coordinatorResult.agentResults, {
        jobRequirements: params.jobRequirements,
      });

      // Format final output
      const result = this.formatOutput(
        consensus,
        coordinatorResult.agentResults,
        coordinatorResult.metadata,
      );

      return result;
    } catch (error) {
      console.error('Summarization failed:', error);
      return this.getErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Format the final output structure
   * @param {Object} consensus - Consensus results
   * @param {Object} agentResults - Individual agent results
   * @param {Object} metadata - Execution metadata
   * @returns {Object} Formatted output
   */
  formatOutput(consensus, agentResults, metadata) {
    return {
      summary: consensus.summary,
      agent_perspectives: {
        ceo: this.formatAgentPerspective(agentResults.ceo),
        cto: this.formatAgentPerspective(agentResults.cto),
        hr: this.formatAgentPerspective(agentResults.hr),
      },
      recommendations: consensus.recommendations,
      agreement_analysis: consensus.agreement_analysis,
      metadata,
    };
  }

  /**
   * Format individual agent perspective
   * @param {Object} agentResult - Agent result
   * @returns {Object} Formatted perspective
   */
  formatAgentPerspective(agentResult) {
    if (!agentResult || agentResult.error) {
      return {
        assessment: agentResult?.assessment || 'Assessment unavailable',
        score: agentResult?.score || 0.5,
        highlights: agentResult?.highlights || [],
        concerns: agentResult?.concerns || [],
        error: true,
      };
    }

    return {
      assessment: agentResult.assessment,
      score: agentResult.score,
      highlights: agentResult.highlights,
      concerns: agentResult.concerns,
    };
  }

  /**
   * Validate input parameters
   * @param {Object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validateInput(params) {
    const required = ['structuredData', 'rawText', 'evaluationScores'];

    for (const field of required) {
      if (!params[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate structuredData structure
    if (!params.structuredData || typeof params.structuredData !== 'object') {
      throw new Error('Invalid structuredData format');
    }

    // Validate rawText
    if (typeof params.rawText !== 'string' || params.rawText.length < 100) {
      throw new Error('Invalid rawText: must be a string with at least 100 characters');
    }

    // Validate evaluationScores
    if (!params.evaluationScores || typeof params.evaluationScores !== 'object') {
      throw new Error('Invalid evaluationScores format');
    }

    return true;
  }

  /**
   * Get error response
   * @param {Error} error - Error object
   * @param {number} executionTime - Execution time
   * @returns {Object} Error response
   */
  getErrorResponse(error, executionTime) {
    return {
      summary: {
        overall_recommendation: 'error',
        confidence_level: 0,
        key_strengths: [],
        key_concerns: ['System error occurred during evaluation'],
        consensus_reasoning: 'Unable to complete evaluation due to system error.',
      },
      agent_perspectives: {
        ceo: { assessment: 'Error', score: 0, highlights: [], concerns: [], error: true },
        cto: { assessment: 'Error', score: 0, highlights: [], concerns: [], error: true },
        hr: { assessment: 'Error', score: 0, highlights: [], concerns: [], error: true },
      },
      recommendations: {
        for_recruiter: ['Please retry the evaluation'],
        for_candidate: [],
        interview_focus: [],
      },
      metadata: {
        processing_time_ms: executionTime,
        error: true,
        error_message: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export default ResumeSummarizer;
