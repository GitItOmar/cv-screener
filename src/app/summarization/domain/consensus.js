import { jobRequirements } from '@/app/evaluation/public';

/**
 * Consensus mechanism for reconciling multiple agent assessments
 * Generates unified recommendations based on weighted agent opinions
 */
class ConsensusMechanism {
  constructor(config = {}) {
    this.config = {
      weights: {
        ceo: 0.34,
        cto: 0.33,
        hr: 0.33,
      },
      consensusThreshold: 0.6, // Agreement threshold for strong recommendation
      ...config,
    };
  }

  /**
   * Build consensus from multiple agent assessments
   * @param {Object} agentResults - Results from all agents
   * @param {Object} context - Additional context (job requirements, etc.)
   * @returns {Object} Consensus results
   */
  buildConsensus(agentResults, context = {}) {
    // Filter out failed agents
    const validAgents = Object.entries(agentResults)
      .filter(([, result]) => !result.error)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(validAgents).length === 0) {
      return this.getFailureConsensus();
    }

    // Calculate weighted scores
    const weightedScore = this.calculateWeightedScore(validAgents);

    // Determine recommendation
    const recommendation = this.determineRecommendation(weightedScore);

    // Aggregate highlights and concerns
    const aggregated = this.aggregateInsights(validAgents, { jobRequirements });

    // Identify conflicts and agreements
    const analysis = this.analyzeAgreement(validAgents);

    // Generate consensus reasoning
    const reasoning = this.generateReasoning(validAgents, weightedScore, analysis);

    // Create recommendations
    const recommendations = this.generateRecommendations(validAgents, context);

    return {
      summary: {
        overall_recommendation: recommendation,
        confidence_level: this.calculateConfidence(validAgents, analysis),
        weighted_score: weightedScore,
        key_strengths: aggregated.topStrengths,
        key_concerns: aggregated.topConcerns,
        mixed_insights: aggregated.mixedInsightsByRelevance, // New: mixed insights for card display
        consensus_reasoning: reasoning,
      },
      agreement_analysis: analysis,
      recommendations,
    };
  }

  /**
   * Calculate weighted average score from agents
   * @param {Object} agentResults - Valid agent results
   * @returns {number} Weighted score (0-1)
   */
  calculateWeightedScore(agentResults) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [agent, result] of Object.entries(agentResults)) {
      const weight = this.config.weights[agent] || 0.33;
      totalScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Determine hiring recommendation based on score
   * @param {number} score - Weighted score
   * @returns {string} Recommendation
   */
  determineRecommendation(score) {
    if (score >= 0.8) return 'strong_hire';
    if (score >= 0.65) return 'hire';
    if (score >= 0.5) return 'maybe';
    if (score >= 0.35) return 'lean_no';
    return 'reject';
  }

  /**
   * Aggregate insights from all agents with relevance filtering
   * @param {Object} agentResults - Agent results
   * @param {Object} context - Job context for relevance filtering
   * @returns {Object} Aggregated insights
   */
  aggregateInsights(agentResults, context = {}) {
    const allStrengths = [];
    const allConcerns = [];
    const strengthData = new Map();
    const concernData = new Map();

    // Extract job context for relevance weighting
    const jobContext = context.jobRequirements?.positionAppliedFor || {};
    const roleType = jobContext.roleType || 'technical_ic';

    // Collect all strengths and concerns with relevance scores
    for (const [agent, result] of Object.entries(agentResults)) {
      (result.highlights || []).forEach((strength) => {
        // Handle both old (string) and new (object with relevance) formats
        const text = typeof strength === 'string' ? strength : strength.text;
        const relevance = typeof strength === 'object' ? strength.relevance : 70;
        const reasoning = typeof strength === 'object' ? strength.reasoning : '';

        allStrengths.push(text);
        const key = this.normalizeInsight(text);

        if (!strengthData.has(key)) {
          strengthData.set(key, {
            text,
            count: 0,
            agents: [],
            maxRelevance: relevance,
            weightedRelevance: this.applyAgentWeighting(relevance, agent, roleType),
            reasoning,
            source: agent,
          });
        } else {
          const existing = strengthData.get(key);
          const weighted = this.applyAgentWeighting(relevance, agent, roleType);
          if (weighted > existing.weightedRelevance) {
            existing.weightedRelevance = weighted;
            existing.maxRelevance = relevance;
            existing.reasoning = reasoning;
            existing.source = agent;
          }
        }
        strengthData.get(key).count++;
        strengthData.get(key).agents.push(agent);
      });

      (result.concerns || []).forEach((concern) => {
        // Handle both old (string) and new (object with relevance) formats
        const text = typeof concern === 'string' ? concern : concern.text;
        const relevance = typeof concern === 'object' ? concern.relevance : 70;
        const reasoning = typeof concern === 'object' ? concern.reasoning : '';

        allConcerns.push(text);
        const key = this.normalizeInsight(text);

        if (!concernData.has(key)) {
          concernData.set(key, {
            text,
            count: 0,
            agents: [],
            maxRelevance: relevance,
            weightedRelevance: this.applyAgentWeighting(relevance, agent, roleType),
            reasoning,
            source: agent,
          });
        } else {
          const existing = concernData.get(key);
          const weighted = this.applyAgentWeighting(relevance, agent, roleType);
          if (weighted > existing.weightedRelevance) {
            existing.weightedRelevance = weighted;
            existing.maxRelevance = relevance;
            existing.reasoning = reasoning;
            existing.source = agent;
          }
        }
        concernData.get(key).count++;
        concernData.get(key).agents.push(agent);
      });
    }

    // Get relevance thresholds based on role type
    const minRelevance = this.getMinRelevanceThreshold(roleType);
    const maxInsights = this.getMaxInsights(roleType);

    // Combine strengths and concerns, then sort by relevance
    const allInsights = [
      ...Array.from(strengthData.values()).map((s) => ({ ...s, type: 'strength' })),
      ...Array.from(concernData.values()).map((c) => ({ ...c, type: 'concern' })),
    ];

    // Filter by minimum relevance and sort by weighted relevance
    const topInsights = allInsights
      .filter((insight) => insight.weightedRelevance >= minRelevance)
      .sort((a, b) => {
        // Primary sort by relevance, secondary by consensus
        if (Math.abs(b.weightedRelevance - a.weightedRelevance) > 5) {
          return b.weightedRelevance - a.weightedRelevance;
        }
        return b.count - a.count;
      })
      .slice(0, maxInsights);

    // Separate back into strengths and concerns for backward compatibility
    const topStrengths = topInsights
      .filter((insight) => insight.type === 'strength')
      .map((s) => s.text);

    const topConcerns = topInsights
      .filter((insight) => insight.type === 'concern')
      .map((c) => c.text);

    // Create a mixed insights array sorted by relevance for the candidate card
    const mixedInsightsByRelevance = topInsights.map((insight) => insight.text);

    return {
      topStrengths,
      topConcerns,
      mixedInsightsByRelevance, // New: insights mixed and sorted by relevance
      allStrengths,
      allConcerns,
      strengthConsensus: this.calculateInsightConsensus(
        Object.fromEntries(Array.from(strengthData.entries()).map(([k, v]) => [k, v.count])),
        Object.keys(agentResults).length,
      ),
      concernConsensus: this.calculateInsightConsensus(
        Object.fromEntries(Array.from(concernData.entries()).map(([k, v]) => [k, v.count])),
        Object.keys(agentResults).length,
      ),
      relevanceData: {
        strengths: Array.from(strengthData.values()),
        concerns: Array.from(concernData.values()),
        mixedInsights: topInsights, // Full insight data with types and relevance scores
      },
    };
  }

  /**
   * Analyze agreement between agents
   * @param {Object} agentResults - Agent results
   * @returns {Object} Agreement analysis
   */
  analyzeAgreement(agentResults) {
    const scores = Object.values(agentResults).map((r) => r.score);
    const recommendations = Object.values(agentResults).map((r) =>
      this.determineRecommendation(r.score),
    );

    // Calculate score variance
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Check recommendation agreement
    const uniqueRecommendations = new Set(recommendations);
    const agreementLevel =
      uniqueRecommendations.size === 1
        ? 'unanimous'
        : uniqueRecommendations.size === 2
          ? 'majority'
          : 'split';

    // Identify dissenting opinions
    const dissentingAgents = [];
    Object.entries(agentResults).forEach(([agent, result]) => {
      const agentRec = this.determineRecommendation(result.score);
      const majorityRec = this.getMajorityRecommendation(recommendations);
      if (agentRec !== majorityRec) {
        dissentingAgents.push({
          agent,
          recommendation: agentRec,
          score: result.score,
        });
      }
    });

    return {
      scoreRange: {
        min: Math.min(...scores),
        max: Math.max(...scores),
        average: avgScore,
        stdDev,
      },
      agreementLevel,
      unanimousAgreement: agreementLevel === 'unanimous',
      dissentingOpinions: dissentingAgents,
      confidenceIndicator: stdDev < 0.15 ? 'high' : stdDev < 0.25 ? 'medium' : 'low',
    };
  }

  /**
   * Generate consensus reasoning
   * @param {Object} agentResults - Agent results
   * @param {number} weightedScore - Weighted score
   * @param {Object} analysis - Agreement analysis
   * @returns {string} Reasoning text
   */
  generateReasoning(agentResults, weightedScore, analysis) {
    const agentCount = Object.keys(agentResults).length;
    const recommendation = this.determineRecommendation(weightedScore);

    let reasoning = `Based on assessment by ${agentCount} evaluation agents, `;

    if (analysis.unanimousAgreement) {
      reasoning += `there is unanimous agreement to ${recommendation.replace('_', ' ')} this candidate. `;
    } else if (analysis.agreementLevel === 'majority') {
      reasoning += `the majority recommendation is to ${recommendation.replace('_', ' ')} this candidate. `;
    } else {
      reasoning += `there are mixed opinions, with the weighted recommendation to ${recommendation.replace('_', ' ')}. `;
    }

    reasoning += `The combined score of ${(weightedScore * 100).toFixed(1)}% reflects `;

    if (weightedScore >= 0.7) {
      reasoning += 'strong alignment with the position requirements. ';
    } else if (weightedScore >= 0.5) {
      reasoning += 'moderate alignment with potential for growth. ';
    } else {
      reasoning += 'significant gaps that would need to be addressed. ';
    }

    if (analysis.dissentingOpinions.length > 0) {
      const dissenter = analysis.dissentingOpinions[0];
      reasoning += `Note that the ${dissenter.agent.toUpperCase()} agent has a differing perspective, `;
      reasoning += `recommending to ${dissenter.recommendation.replace('_', ' ')}. `;
    }

    return reasoning;
  }

  /**
   * Generate actionable recommendations
   * @param {Object} agentResults - Agent results
   * @returns {Object} Recommendations
   */

  generateRecommendations(agentResults) {
    const forRecruiter = [];
    const forCandidate = [];
    const interviewFocus = [];

    // Aggregate recommendations from agents
    Object.values(agentResults).forEach((result) => {
      if (result.recommendations) {
        // Handle new structured format
        if (typeof result.recommendations === 'object' && !Array.isArray(result.recommendations)) {
          // New format with categories
          if (result.recommendations.for_recruiter) {
            forRecruiter.push(...result.recommendations.for_recruiter);
          }
          if (result.recommendations.for_candidate) {
            forCandidate.push(...result.recommendations.for_candidate);
          }
          if (result.recommendations.interview_focus) {
            interviewFocus.push(...result.recommendations.interview_focus);
          }
        } else if (Array.isArray(result.recommendations)) {
          // Old format - backwards compatibility
          result.recommendations.forEach((rec) => {
            const lower = rec.toLowerCase();
            if (lower.includes('interview') || lower.includes('ask about')) {
              interviewFocus.push(rec);
            } else if (lower.includes('candidate should') || lower.includes('improve')) {
              forCandidate.push(rec);
            } else {
              forRecruiter.push(rec);
            }
          });
        }
      }
    });

    // Add consensus-based recommendations
    const weightedScore = this.calculateWeightedScore(agentResults);

    if (weightedScore >= 0.7) {
      forRecruiter.push('Consider fast-tracking this candidate through the interview process');
    } else if (weightedScore < 0.5) {
      forRecruiter.push(
        'Consider whether the candidate meets minimum requirements before proceeding',
      );
    }

    // Remove duplicates and limit count
    return {
      for_recruiter: [...new Set(forRecruiter)],
      for_candidate: [...new Set(forCandidate)],
      interview_focus: [...new Set(interviewFocus)],
    };
  }

  /**
   * Calculate confidence level based on agent agreement
   * @param {Object} agentResults - Agent results
   * @param {Object} analysis - Agreement analysis
   * @returns {number} Confidence level (0-1)
   */
  calculateConfidence(agentResults, analysis) {
    const agentCount = Object.keys(agentResults).length;

    // Base confidence on number of agents
    let confidence = agentCount / 3; // Max 1.0 with 3 agents

    // Adjust based on score variance
    if (analysis.scoreRange.stdDev < 0.1) {
      confidence *= 1.1;
    } else if (analysis.scoreRange.stdDev > 0.2) {
      confidence *= 0.8;
    }

    // Adjust based on agreement level
    if (analysis.unanimousAgreement) {
      confidence *= 1.15;
    } else if (analysis.agreementLevel === 'split') {
      confidence *= 0.85;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Apply agent expertise weighting based on role type
   * @param {number} relevance - Base relevance score from agent
   * @param {string} agent - Agent type (ceo, cto, hr)
   * @param {string} roleType - Role type from job context
   * @returns {number} Weighted relevance score
   */
  applyAgentWeighting(relevance, agent, roleType) {
    // Agent expertise multipliers by role type
    const expertiseMultipliers = {
      technical_ic: { cto: 1.3, hr: 0.9, ceo: 0.8 },
      tech_lead: { cto: 1.2, ceo: 1.0, hr: 0.9 },
      eng_manager: { ceo: 1.2, hr: 1.1, cto: 0.9 },
      exec_leader: { ceo: 1.3, hr: 1.0, cto: 0.7 },
    };

    const multiplier = expertiseMultipliers[roleType]?.[agent] || 1.0;
    return Math.min(relevance * multiplier, 100); // Cap at 100
  }

  /**
   * Get minimum relevance threshold for role type
   * @param {string} roleType - Role type
   * @returns {number} Minimum relevance threshold
   */
  getMinRelevanceThreshold(roleType) {
    const thresholds = {
      technical_ic: 50,
      tech_lead: 55,
      eng_manager: 60,
      exec_leader: 65,
    };
    return thresholds[roleType] || 50;
  }

  /**
   * Get maximum number of insights for role type
   * @param {string} roleType - Role type
   * @returns {number} Maximum insights to display
   */
  getMaxInsights(roleType) {
    const maxInsights = {
      technical_ic: 5,
      tech_lead: 5,
      eng_manager: 6,
      exec_leader: 6,
    };
    return maxInsights[roleType] || 5;
  }

  /**
   * Normalize insight text for comparison
   * @param {string} insight - Insight text
   * @returns {string} Normalized text
   */
  normalizeInsight(insight) {
    // Handle both string and object formats
    const text = typeof insight === 'string' ? insight : insight.text || insight;
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join(' ');
  }

  /**
   * Denormalize insight to original form
   * @param {string} normalized - Normalized insight
   * @param {Array} originals - Original insights
   * @returns {string} Original insight
   */
  denormalizeInsight(normalized, originals) {
    for (const original of originals) {
      if (this.normalizeInsight(original) === normalized) {
        return original;
      }
    }
    return normalized;
  }

  /**
   * Calculate consensus level for insights
   * @param {Object} counts - Insight frequency counts
   * @param {number} agentCount - Number of agents
   * @returns {number} Consensus level (0-1)
   */
  calculateInsightConsensus(counts, agentCount) {
    if (agentCount === 0) return 0;

    const maxCount = Math.max(...Object.values(counts), 0);
    return maxCount / agentCount;
  }

  /**
   * Get majority recommendation from list
   * @param {Array} recommendations - List of recommendations
   * @returns {string} Majority recommendation
   */
  getMajorityRecommendation(recommendations) {
    const counts = {};
    recommendations.forEach((rec) => {
      counts[rec] = (counts[rec] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Get failure consensus when all agents fail
   * @returns {Object} Failure consensus
   */
  getFailureConsensus() {
    return {
      summary: {
        overall_recommendation: 'unable_to_assess',
        confidence_level: 0,
        weighted_score: 0,
        key_strengths: [],
        key_concerns: ['All agents failed to complete assessment'],
        consensus_reasoning: 'Unable to generate consensus due to system errors.',
      },
      agreement_analysis: {
        scoreRange: { min: 0, max: 0, average: 0, stdDev: 0 },
        agreementLevel: 'none',
        unanimousAgreement: false,
        dissentingOpinions: [],
        confidenceIndicator: 'none',
      },
      recommendations: {
        for_recruiter: ['Please retry the evaluation'],
        for_candidate: [],
        interview_focus: [],
      },
    };
  }
}

export default ConsensusMechanism;
