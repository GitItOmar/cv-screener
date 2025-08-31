/**
 * Base Agent class defining the interface for all evaluation agents
 * Each agent provides a specialized perspective on candidate assessment
 */
class BaseAgent {
  /**
   * @param {string} name - Agent identifier (e.g., 'CEO', 'CTO', 'HR')
   * @param {string} role - Agent's role description
   */
  constructor(name, role) {
    this.name = name;
    this.role = role;
  }

  /**
   * Analyze resume and provide assessment from agent's perspective
   * @param {Object} params - Analysis parameters
   * @param {Object} params.structuredData - Extracted structured resume data
   * @param {string} params.rawText - Raw resume text
   * @param {Object} params.evaluationScores - Evaluation scores and categories
   * @param {Object} params.jobRequirements - Job requirements and criteria
   * @returns {Promise<Object>} Agent's assessment
   */
  // eslint-disable-next-line no-unused-vars
  async analyze({ structuredData, rawText, evaluationScores, jobRequirements }) {
    throw new Error('analyze() method must be implemented by subclass');
  }

  /**
   * Get the system prompt for this agent
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    throw new Error('getSystemPrompt() method must be implemented by subclass');
  }

  /**
   * Format the user prompt with resume data
   * @param {Object} data - Resume and evaluation data
   * @returns {string} Formatted user prompt
   */
  getUserPrompt(data) {
    return `Please analyze this candidate from your perspective as ${this.role}.

STRUCTURED DATA:
${JSON.stringify(data.structuredData, null, 2)}

EVALUATION SCORES:
${JSON.stringify(data.evaluationScores, null, 2)}

RAW RESUME TEXT:
${data.rawText}

JOB REQUIREMENTS:
${JSON.stringify(data.jobRequirements, null, 2)}

Provide your assessment in the following JSON format:
{
  "assessment": "Your detailed assessment (2-3 paragraphs)",
  "score": 0.0-1.0,
  "highlights": [
    {
      "text": "Key strength or positive observation",
      "relevance": 0-100,
      "reasoning": "Why this is relevant for the specific role"
    }
  ],
  "concerns": [
    {
      "text": "Concern or area for improvement",
      "relevance": 0-100,
      "reasoning": "Why this matters for the specific role"
    }
  ],
  "recommendations": {
    "for_recruiter": ["Action item for recruiter", "Another action for recruiter", "..."],
    "for_candidate": ["Improvement area for candidate", "Skill to develop", "..."],
    "interview_focus": ["Topic to explore in interview", "Question area to probe", "..."]
  }
}

RELEVANCE SCORING INSTRUCTIONS:
For each highlight and concern, provide a relevance score (0-100) based on the specific job requirements:
- 90-100: Critical for role success (e.g., React expertise for React Developer role)
- 70-89: Important but not critical (e.g., AWS knowledge for Full Stack role)
- 50-69: Relevant but secondary (e.g., Docker for Frontend Developer)
- 30-49: Minor relevance (e.g., design skills for Backend Developer)
- 0-29: Minimal relevance (e.g., public speaking for Junior Developer)

Consider the job context from positionAppliedFor:
- Job title and seniority level
- Role type (technical_ic, tech_lead, eng_manager, exec_leader)
- Domain focus (frontend, backend, fullstack, etc.)
- Soft skills importance (0.0-1.0 scale)
- Specific keywords and requirements

IMPORTANT: Structure your recommendations into three categories:
- for_recruiter: Actionable items for the recruiting team (e.g., "Fast-track to final round", "Verify technical skills with coding test")
- for_candidate: Development areas and feedback for the candidate (e.g., "Gain more leadership experience", "Strengthen cloud architecture knowledge")
- interview_focus: Specific topics to explore during interviews (e.g., "Discuss approach to scaling distributed systems", "Explore conflict resolution examples")`;
  }

  /**
   * Validate agent response structure
   * @param {Object} response - Agent response
   * @returns {boolean} True if valid
   */
  validateResponse(response) {
    const required = ['assessment', 'score', 'highlights', 'concerns', 'recommendations'];

    for (const field of required) {
      if (!(field in response)) {
        return false;
      }
    }

    if (typeof response.score !== 'number' || response.score < 0 || response.score > 1) {
      return false;
    }

    if (!Array.isArray(response.highlights) || !Array.isArray(response.concerns)) {
      return false;
    }

    // Validate new insight structure with relevance scores
    const validateInsights = (insights) => {
      return insights.every((insight) => {
        // Handle both old (string) and new (object) formats for backwards compatibility
        if (typeof insight === 'string') {
          return true; // Accept old format
        }
        return (
          insight.text &&
          typeof insight.relevance === 'number' &&
          insight.relevance >= 0 &&
          insight.relevance <= 100 &&
          insight.reasoning
        );
      });
    };

    if (!validateInsights(response.highlights) || !validateInsights(response.concerns)) {
      return false;
    }

    // Handle both old format (array) and new format (object with categories)
    if (typeof response.recommendations === 'object' && !Array.isArray(response.recommendations)) {
      // New format validation
      const recommendationCategories = ['for_recruiter', 'for_candidate', 'interview_focus'];
      for (const category of recommendationCategories) {
        if (
          !(category in response.recommendations) ||
          !Array.isArray(response.recommendations[category])
        ) {
          return false;
        }
      }
    } else if (!Array.isArray(response.recommendations)) {
      // Old format must be an array
      return false;
    }

    return true;
  }

  /**
   * Parse LLM response and extract structured data
   * @param {string|Object} llmResponse - Raw LLM response
   * @returns {Object} Parsed assessment
   */
  parseResponse(llmResponse) {
    // Handle case where response is already an object
    if (typeof llmResponse === 'object' && llmResponse !== null) {
      // Check if it's a direct valid response
      if (this.validateResponse(llmResponse)) {
        return llmResponse;
      }

      // Check if it has a 'content' property (common LLM response format)
      if (llmResponse.content && typeof llmResponse.content === 'string') {
        const contentStr = llmResponse.content.trim();

        // Approach 1: Direct JSON parse of content
        try {
          const parsed = JSON.parse(contentStr);
          if (this.validateResponse(parsed)) {
            return parsed;
          }
        } catch {
          // ignore
        }

        // Approach 2: Extract JSON from content if it contains additional text
        if (contentStr.includes('{')) {
          // Find the JSON object within the content
          let braceCount = 0;
          const startIndex = contentStr.indexOf('{');
          let endIndex = -1;

          for (let i = startIndex; i < contentStr.length; i++) {
            if (contentStr[i] === '{') braceCount++;
            if (contentStr[i] === '}') braceCount--;
            if (braceCount === 0 && i > startIndex) {
              endIndex = i;
              break;
            }
          }

          if (startIndex !== -1 && endIndex !== -1) {
            const jsonStr = contentStr.substring(startIndex, endIndex + 1);

            try {
              const parsed = JSON.parse(jsonStr);
              if (this.validateResponse(parsed)) {
                return parsed;
              }
            } catch {
              // ignore
            }
          }
        }
        // Continue with content as responseText for further processing
      }
    }

    // Convert to string if not already - prioritize content property if available
    let responseText = '';
    if (typeof llmResponse === 'object' && llmResponse !== null && llmResponse.content) {
      responseText = llmResponse.content;
    } else if (typeof llmResponse === 'string') {
      responseText = llmResponse;
    } else {
      responseText = JSON.stringify(llmResponse);
    }

    try {
      // Try to parse as JSON directly
      const parsed = JSON.parse(responseText);
      if (this.validateResponse(parsed)) {
        return parsed;
      }
    } catch {
      // If direct parsing fails, try to extract JSON from text
      if (typeof responseText === 'string' && responseText.includes('{')) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (this.validateResponse(parsed)) {
              return parsed;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Fallback response if parsing fails
    return {
      assessment: `Unable to generate proper assessment. Raw response: ${responseText?.substring(0, 200)}...`,
      score: 0.5,
      highlights: [],
      concerns: ['Assessment parsing failed'],
      recommendations: {
        for_recruiter: ['Please retry the evaluation'],
        for_candidate: [],
        interview_focus: [],
      },
    };
  }
}

export default BaseAgent;
