import OpenAI from 'openai';

class ResumeAgent {
  constructor() {
    this.client = null;
    this.costTracker = {
      totalTokensUsed: 0,
      totalCost: 0,
      requestCount: 0,
    };
    this.rateLimiter = {
      requestsPerMinute: 60,
      lastRequestTime: 0,
      requestQueue: [],
    };
  }

  /**
   * Initialize the OpenAI client
   */
  initializeClient() {
    if (this.client) return this.client;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const config = {
      apiKey,
    };

    this.client = new OpenAI(config);

    return this.client;
  }

  /**
   * Extract structured data from resume text using LLM
   * @param {string} resumeText - Cleaned resume text
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Structured resume data
   */
  async extractResumeData(resumeText, options = {}) {
    const startTime = Date.now();

    try {
      // Initialize client if needed
      this.initializeClient();

      // Apply rate limiting
      await this.handleRateLimit();

      // Prepare the extraction request
      const extractionPrompt = this.buildExtractionPrompt(resumeText, options);

      const response = await this.makeAPIRequest(extractionPrompt, options);

      // Update cost tracking
      this.updateCostTracking(response.usage);

      // Parse and validate response
      const extractedData = this.parseAPIResponse(response);

      const processingTime = Date.now() - startTime;

      // Add metadata
      extractedData.metadata = {
        ...extractedData.metadata,
        processingTime,
        extractionDate: new Date().toISOString(),
        tokensUsed: response.usage?.total_tokens || 0,
        model: options.model || 'gpt-3.5-turbo',
      };

      return extractedData;
    } catch (error) {
      // Handle specific error types
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else {
        throw new Error(`Resume extraction failed: ${error.message}`);
      }
    }
  }

  /**
   * Build the extraction prompt for the LLM
   * @param {string} resumeText - Resume text to process
   * @param {Object} options - Extraction options
   * @returns {Array} - Messages array for OpenAI API
   */
  buildExtractionPrompt(resumeText) {
    const systemPrompt = `You are an expert resume parser that extracts structured information from resumes. Your task is to analyze the provided resume text and extract information into six specific categories.

You must return ONLY a valid JSON object with the following exact structure:

{
  "positionAppliedFor": {
    "title": "string or null",
    "level": "junior|mid-level|senior|leadership",
    "yearsRequired": number or null,
    "keywords": ["array", "of", "relevant", "keywords"]
  },
  "selfEvaluation": {
    "summary": "string or null",
    "careerHighlights": ["array", "of", "highlights"],
    "strengths": ["array", "of", "strengths"],
    "goals": "string or null"
  },
  "skillsAndSpecialties": {
    "technical": ["array", "of", "technical", "skills"],
    "frameworks": ["array", "of", "frameworks"],
    "tools": ["array", "of", "tools"],
    "domains": ["array", "of", "domain", "expertise"],
    "softSkills": ["array", "of", "soft", "skills"],
    "certifications": ["array", "of", "certifications"]
  },
  "workExperience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or 'Present'",
      "duration": "X years Y months",
      "responsibilities": ["array", "of", "key", "responsibilities"],
      "achievements": ["array", "of", "achievements"]
    }
  ],
  "basicInformation": {
    "fullName": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "linkedIn": "string or null",
    "github": "string or null",
    "availability": "string or null"
  },
  "educationBackground": {
    "degrees": [
      {
        "type": "Bachelor's|Master's|PhD|Associate|Certificate",
        "field": "string",
        "institution": "string",
        "graduationYear": number,
        "gpa": number or null
      }
    ],
    "relevantCoursework": ["array", "of", "courses"],
    "projects": ["array", "of", "academic", "projects"]
  }
}

Classification Guidelines:
- Level: junior (0-2 years), mid-level (3-5 years), senior (5-10 years), leadership (10+ years or management)
- Extract exact dates when possible, use approximations if needed
- If information is not found, use null or empty arrays
- Be conservative with classifications - when in doubt, use lower level
- Focus on extracting factual information, not making assumptions`;

    const userPrompt = `Please extract structured information from this resume:

${resumeText}

Return only the JSON object with the extracted information.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Make API request to OpenAI with retry logic
   * @param {Array} messages - Messages for API request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - API response
   */
  async makeAPIRequest(messages, options) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestConfig = {
          model: options.model || 'gpt-3.5-turbo',
          messages,
          temperature: options.temperature || 0.3,
          max_tokens: options.maxTokens || 2000,
          response_format: { type: 'json_object' },
        };

        const response = await this.client.chat.completions.create(requestConfig);

        return response;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }

  /**
   * Parse and validate API response
   * @param {Object} response - OpenAI API response
   * @returns {Object} - Parsed resume data
   */
  parseAPIResponse(response) {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from API');
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('No content in API response');
    }

    try {
      const parsedData = JSON.parse(choice.message.content);

      // Basic validation
      this.validateResponseStructure(parsedData);

      return parsedData;
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM: ${error.message}`);
    }
  }

  /**
   * Validate the structure of the parsed response
   * @param {Object} data - Parsed response data
   */
  validateResponseStructure(data) {
    const requiredSections = [
      'positionAppliedFor',
      'selfEvaluation',
      'skillsAndSpecialties',
      'workExperience',
      'basicInformation',
      'educationBackground',
    ];

    for (const section of requiredSections) {
      if (!(section in data)) {
        // Don't throw error, just warn and continue
      }
    }

    // Ensure workExperience is an array
    if (data.workExperience && !Array.isArray(data.workExperience)) {
      data.workExperience = [];
    }

    // Ensure educationBackground.degrees is an array
    if (
      data.educationBackground &&
      data.educationBackground.degrees &&
      !Array.isArray(data.educationBackground.degrees)
    ) {
      data.educationBackground.degrees = [];
    }
  }

  /**
   * Handle rate limiting
   */
  async handleRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    const minInterval = (60 * 1000) / this.rateLimiter.requestsPerMinute; // ms between requests

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimiter.lastRequestTime = Date.now();
  }

  /**
   * Update cost tracking
   * @param {Object} usage - Token usage from API response
   */
  updateCostTracking(usage) {
    if (!usage) return;

    this.costTracker.requestCount++;
    this.costTracker.totalTokensUsed += usage.total_tokens || 0;

    // Rough cost calculation (based on GPT-3.5-turbo pricing)
    const inputCost = ((usage.prompt_tokens || 0) * 0.0015) / 1000;
    const outputCost = ((usage.completion_tokens || 0) * 0.002) / 1000;
    this.costTracker.totalCost += inputCost + outputCost;
  }

  /**
   * Get cost tracking information
   * @returns {Object} - Cost tracking data
   */
  getCostTracking() {
    return { ...this.costTracker };
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking() {
    this.costTracker = {
      totalTokensUsed: 0,
      totalCost: 0,
      requestCount: 0,
    };
  }

  /**
   * Test the connection to OpenAI API
   * @returns {Promise<boolean>} - Whether connection is successful
   */
  async testConnection() {
    try {
      this.initializeClient();

      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const resumeAgent = new ResumeAgent();
