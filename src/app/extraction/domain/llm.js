import { resumeAgent } from '../../../lib/agents/resumeAgent.js';
import PromptTemplates from '../../../lib/agents/promptTemplates.js';
import TextExtractor from './parser.js';

class LLMExtractor {
  constructor() {
    this.agent = resumeAgent;
    this.extractionOptions = {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 2000,
      useEnhancedPrompts: true,
      validateResults: true,
      retryOnFailure: true,
      maxRetries: 2,
    };
  }

  /**
   * Extract structured data from resume text using LLM
   * @param {string} resumeText - Cleaned resume text
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Structured resume data
   */
  async extractResumeData(resumeText, options = {}) {
    const startTime = Date.now();
    const config = { ...this.extractionOptions, ...options };

    try {
      // Prepare text for LLM processing
      const preparedText = TextExtractor.prepareForLLM(resumeText);

      // Extract basic text statistics for metadata
      const textStats = TextExtractor.getTextStatistics(preparedText);

      // Perform extraction with retry logic
      let extractedData = null;
      let lastError = null;
      const maxRetries = config.retryOnFailure ? config.maxRetries : 0;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          extractedData = await this.performExtraction(preparedText, config, attempt);

          if (extractedData) {
            break;
          }
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries + 1) {
            break;
          }

          // Wait before retry
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      if (!extractedData) {
        throw lastError || new Error('Extraction failed after all retry attempts');
      }

      // Validate extraction results if enabled
      if (config.validateResults) {
        extractedData = await this.validateAndCleanResults(extractedData);
      }

      // Add processing metadata
      const processingTime = Date.now() - startTime;
      extractedData.metadata = {
        ...extractedData.metadata,
        processingTime,
        textStatistics: textStats,
        extractionConfig: {
          model: config.model,
          temperature: config.temperature,
          useEnhancedPrompts: config.useEnhancedPrompts,
          attemptsUsed: extractedData.metadata?.tokensUsed ? 1 : maxRetries + 1,
        },
      };

      return extractedData;
    } catch (error) {
      // Return structured error response
      throw new Error(`Resume extraction failed: ${error.message}`);
    }
  }

  /**
   * Perform the actual LLM extraction
   * @param {string} preparedText - Text prepared for LLM
   * @param {Object} config - Extraction configuration
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} - Extracted data
   */
  async performExtraction(preparedText, config, attempt) {
    // Build the appropriate prompt
    let messages;
    if (config.useEnhancedPrompts && attempt === 1) {
      messages = PromptTemplates.getEnhancedPrompt(preparedText);
    } else {
      messages = PromptTemplates.getMinimalPrompt(preparedText);
    }

    // Prepare extraction options for the agent
    const agentOptions = {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      messages,
    };

    // Use the buildExtractionPrompt method but override with our messages
    const originalBuildMethod = this.agent.buildExtractionPrompt;
    this.agent.buildExtractionPrompt = () => messages;

    try {
      const result = await this.agent.extractResumeData(preparedText, agentOptions);
      return result;
    } finally {
      // Restore original method
      this.agent.buildExtractionPrompt = originalBuildMethod;
    }
  }

  /**
   * Validate and clean extraction results
   * @param {Object} extractedData - Raw extracted data
   * @returns {Promise<Object>} - Validated and cleaned data
   */
  async validateAndCleanResults(extractedData) {
    try {
      // Basic structure validation
      this.validateDataStructure(extractedData);

      // Clean and normalize the data
      const cleanedData = this.cleanExtractedData(extractedData);

      // Validate data consistency
      this.validateDataConsistency(cleanedData);

      return cleanedData;
    } catch (error) {
      // Try to fix common issues
      const fixedData = this.attemptDataRepair(extractedData);

      if (fixedData) {
        return fixedData;
      }

      throw new Error(`Data validation failed: ${error.message}`);
    }
  }

  /**
   * Validate the basic structure of extracted data
   * @param {Object} data - Data to validate
   */
  validateDataStructure(data) {
    const requiredSections = [
      'positionAppliedFor',
      'selfEvaluation',
      'skillsAndSpecialties',
      'workExperience',
      'basicInformation',
      'educationBackground',
    ];

    const missingFields = requiredSections.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate specific field types
    if (!Array.isArray(data.workExperience)) {
      throw new Error('workExperience must be an array');
    }

    if (
      data.educationBackground &&
      data.educationBackground.degrees &&
      !Array.isArray(data.educationBackground.degrees)
    ) {
      throw new Error('educationBackground.degrees must be an array');
    }

    // Validate level classification
    if (data.positionAppliedFor?.level) {
      const validLevels = ['junior', 'mid-level', 'senior', 'leadership'];
      if (!validLevels.includes(data.positionAppliedFor.level)) {
        throw new Error(`Invalid level classification: ${data.positionAppliedFor.level}`);
      }
    }
  }

  /**
   * Clean and normalize extracted data
   * @param {Object} data - Data to clean
   * @returns {Object} - Cleaned data
   */
  cleanExtractedData(data) {
    const cleaned = JSON.parse(JSON.stringify(data)); // Deep copy

    // Clean basic information
    if (cleaned.basicInformation) {
      // Normalize email
      if (cleaned.basicInformation.email) {
        cleaned.basicInformation.email = cleaned.basicInformation.email.toLowerCase().trim();
      }

      // Clean phone number
      if (cleaned.basicInformation.phone) {
        cleaned.basicInformation.phone = cleaned.basicInformation.phone.replace(/[^\d+\-() ]/g, '');
      }

      // Clean URLs
      ['linkedIn', 'github'].forEach((field) => {
        if (cleaned.basicInformation[field]) {
          let url = cleaned.basicInformation[field].trim();
          if (!url.startsWith('http')) {
            url = url.replace(/^(www\.)?/, 'https://');
          }
          cleaned.basicInformation[field] = url;
        }
      });
    }

    // Clean work experience dates
    if (cleaned.workExperience) {
      cleaned.workExperience.forEach((job) => {
        if (job.startDate) job.startDate = this.normalizeDateString(job.startDate);
        if (job.endDate) job.endDate = this.normalizeDateString(job.endDate);

        // Recalculate duration if needed
        if (job.startDate && job.endDate) {
          job.duration = this.calculateDuration(job.startDate, job.endDate);
        }
      });
    }

    // Clean education graduation years
    if (cleaned.educationBackground?.degrees) {
      cleaned.educationBackground.degrees.forEach((degree) => {
        if (degree.graduationYear && typeof degree.graduationYear === 'string') {
          degree.graduationYear = parseInt(degree.graduationYear.replace(/\D/g, ''));
        }
      });
    }

    // Remove empty arrays and null values where appropriate
    this.removeEmptyValues(cleaned);

    return cleaned;
  }

  /**
   * Validate data consistency
   * @param {Object} data - Data to validate
   */
  validateDataConsistency(data) {
    // Check email format
    if (data.basicInformation?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.basicInformation.email)) {
        throw new Error(`Invalid email format: ${data.basicInformation.email}`);
      }
    }

    // Check graduation years are reasonable
    if (data.educationBackground?.degrees) {
      const currentYear = new Date().getFullYear();
      data.educationBackground.degrees.forEach((degree) => {
        if (degree.graduationYear) {
          if (degree.graduationYear < 1950 || degree.graduationYear > currentYear + 10) {
            throw new Error(`Unrealistic graduation year: ${degree.graduationYear}`);
          }
        }
      });
    }

    // Check work experience dates
    if (data.workExperience) {
      data.workExperience.forEach((job) => {
        if (job.startDate && job.endDate && job.endDate !== 'Present') {
          const start = new Date(job.startDate);
          const end = new Date(job.endDate);
          if (start > end) {
            throw new Error(`Invalid work dates for ${job.company}: start date after end date`);
          }
        }
      });
    }
  }

  /**
   * Attempt to repair common data issues
   * @param {Object} data - Data to repair
   * @returns {Object|null} - Repaired data or null if unrepairable
   */
  attemptDataRepair(data) {
    try {
      const repaired = JSON.parse(JSON.stringify(data));

      // Add missing required sections with defaults
      const defaultSections = {
        positionAppliedFor: {
          title: null,
          level: 'junior',
          yearsRequired: null,
          keywords: [],
        },
        selfEvaluation: {
          summary: null,
          careerHighlights: [],
          strengths: [],
          goals: null,
        },
        skillsAndSpecialties: {
          technical: [],
          frameworks: [],
          tools: [],
          domains: [],
          softSkills: [],
          certifications: [],
        },
        workExperience: [],
        basicInformation: {
          fullName: null,
          email: null,
          phone: null,
          location: null,
          linkedIn: null,
          github: null,
          availability: null,
        },
        educationBackground: {
          degrees: [],
          relevantCoursework: [],
          projects: [],
        },
      };

      Object.keys(defaultSections).forEach((section) => {
        if (!(section in repaired)) {
          repaired[section] = defaultSections[section];
        }
      });

      // Fix array fields
      if (!Array.isArray(repaired.workExperience)) {
        repaired.workExperience = [];
      }

      if (repaired.educationBackground && !Array.isArray(repaired.educationBackground.degrees)) {
        repaired.educationBackground.degrees = [];
      }

      // Fix level classification
      if (repaired.positionAppliedFor?.level) {
        const validLevels = ['junior', 'mid-level', 'senior', 'leadership'];
        if (!validLevels.includes(repaired.positionAppliedFor.level)) {
          repaired.positionAppliedFor.level = 'junior'; // Default to junior
        }
      }

      return repaired;
    } catch {
      return null;
    }
  }

  /**
   * Normalize date strings to consistent format
   * @param {string} dateStr - Date string to normalize
   * @returns {string} - Normalized date string
   */
  normalizeDateString(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') {
      return 'Present';
    }

    // Try to parse various date formats
    const cleanDate = dateStr.trim();

    // YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }

    // YYYY format
    if (/^\d{4}$/.test(cleanDate)) {
      return cleanDate;
    }

    // Month YYYY format
    const monthYearMatch = cleanDate.match(/(\w+)\s+(\d{4})/);
    if (monthYearMatch) {
      const months = {
        january: '01',
        february: '02',
        march: '03',
        april: '04',
        may: '05',
        june: '06',
        july: '07',
        august: '08',
        september: '09',
        october: '10',
        november: '11',
        december: '12',
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12',
      };
      const month = months[monthYearMatch[1].toLowerCase()];
      if (month) {
        return `${monthYearMatch[2]}-${month}`;
      }
    }

    // Return original if no pattern matches
    return cleanDate;
  }

  /**
   * Calculate duration between two dates
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @returns {string} - Duration string
   */
  calculateDuration(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = endDate === 'Present' ? new Date() : new Date(endDate);

      const diffTime = Math.abs(end - start);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average month length

      const years = Math.floor(diffMonths / 12);
      const months = diffMonths % 12;

      if (years === 0) {
        return `${months} month${months !== 1 ? 's' : ''}`;
      } else if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
      } else {
        return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
      }
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Remove empty values from object
   * @param {Object} obj - Object to clean
   */
  removeEmptyValues(obj) {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value === null || value === undefined || value === '') {
        // Keep null values as they're meaningful in our schema
        return;
      }

      if (Array.isArray(value)) {
        // Remove empty strings from arrays
        obj[key] = value.filter((item) => item !== null && item !== undefined && item !== '');
      } else if (typeof value === 'object' && value !== null) {
        this.removeEmptyValues(value);
      }
    });
  }

  /**
   * Get extraction statistics
   * @returns {Object} - Current extraction statistics
   */
  getExtractionStats() {
    return this.agent.getCostTracking();
  }

  /**
   * Reset extraction statistics
   */
  resetStats() {
    this.agent.resetCostTracking();
  }

  /**
   * Test LLM connection
   * @returns {Promise<boolean>} - Whether connection is working
   */
  async testConnection() {
    return await this.agent.testConnection();
  }

  /**
   * Update extraction options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.extractionOptions = { ...this.extractionOptions, ...newOptions };
  }
}

// Export singleton instance
export const llmExtractor = new LLMExtractor();
