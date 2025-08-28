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
  "highlights": ["Key strength 1", "Key strength 2", "..."],
  "concerns": ["Concern 1", "Concern 2", "..."],
  "recommendations": ["Recommendation 1", "Recommendation 2", "..."]
}`;
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

    if (
      !Array.isArray(response.highlights) ||
      !Array.isArray(response.concerns) ||
      !Array.isArray(response.recommendations)
    ) {
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
    console.log('🔍 Parsing LLM response:', {
      type: typeof llmResponse,
      isString: typeof llmResponse === 'string',
      length: llmResponse?.length,
      preview:
        typeof llmResponse === 'string'
          ? llmResponse.substring(0, 200)
          : JSON.stringify(llmResponse).substring(0, 200),
    });

    // Handle case where response is already an object
    if (typeof llmResponse === 'object' && llmResponse !== null) {
      // Check if it's a direct valid response
      if (this.validateResponse(llmResponse)) {
        console.log('✅ Response is already a valid object');
        return llmResponse;
      }

      // Check if it has a 'content' property (common LLM response format)
      if (llmResponse.content && typeof llmResponse.content === 'string') {
        console.log(
          '🔍 Found content property in response object, content preview:',
          llmResponse.content.substring(0, 200),
        );

        // Try multiple parsing approaches for the content
        const contentStr = llmResponse.content.trim();

        // Approach 1: Direct JSON parse of content
        try {
          console.log('🔄 Attempting direct JSON parse of content');
          const parsed = JSON.parse(contentStr);
          if (this.validateResponse(parsed)) {
            console.log('✅ Successfully parsed content property as direct JSON');
            return parsed;
          } else {
            console.log('❌ Content parsed but failed validation');
          }
        } catch (directParseError) {
          console.log('❌ Direct JSON parse of content failed:', directParseError.message);
        }

        // Approach 2: Extract JSON from content if it contains additional text
        if (contentStr.includes('{')) {
          console.log('🔄 Attempting JSON extraction from content text');

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
            console.log('🔍 Extracted JSON string:', jsonStr.substring(0, 100));

            try {
              const parsed = JSON.parse(jsonStr);
              if (this.validateResponse(parsed)) {
                console.log('✅ Successfully extracted and parsed JSON from content');
                return parsed;
              } else {
                console.log('❌ Extracted JSON failed validation');
              }
            } catch (extractParseError) {
              console.log('❌ JSON extraction parse failed:', extractParseError.message);
            }
          } else {
            console.log('❌ Could not find complete JSON object in content');
          }
        }

        // Continue with content as responseText for further processing
        console.log('🔄 Falling back to string processing with content');
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

    console.log('🔍 Processing as string:', responseText.substring(0, 200));

    try {
      // Try to parse as JSON directly
      const parsed = JSON.parse(responseText);
      if (this.validateResponse(parsed)) {
        console.log('✅ Successfully parsed response as direct JSON');
        return parsed;
      } else {
        console.log('❌ Direct parse succeeded but failed validation');
      }
    } catch (directError) {
      console.log('❌ Direct string JSON parse failed:', directError.message);

      // If direct parsing fails, try to extract JSON from text
      if (typeof responseText === 'string' && responseText.includes('{')) {
        console.log('🔄 Attempting regex-based JSON extraction from string');
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (this.validateResponse(parsed)) {
              console.log('✅ Successfully extracted JSON from response text');
              return parsed;
            } else {
              console.log('❌ Regex extraction succeeded but failed validation');
            }
          } catch (regexError) {
            console.log('❌ Regex extraction parse failed:', regexError.message);
          }
        } else {
          console.log('❌ No JSON pattern found in response text');
        }
      }
    }

    console.log('⚠️ Using fallback response due to parsing failure');
    console.log('📝 Final response text preview:', responseText?.substring(0, 300));

    // Fallback response if parsing fails
    return {
      assessment: `Unable to generate proper assessment. Raw response: ${responseText?.substring(0, 200)}...`,
      score: 0.5,
      highlights: [],
      concerns: ['Assessment parsing failed'],
      recommendations: ['Please retry the evaluation'],
    };
  }
}

export default BaseAgent;
