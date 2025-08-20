export class DataValidator {
  constructor() {
    this.validationRules = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[+]?[1-9][\d\s\-().]{8,20}$/,
      url: /^https?:\/\/.+\..+/i,
      year: /^\d{4}$/,
      dateFormat: /^\d{4}(-\d{2})?$/,
      gpa: /^[0-4](\.\d{1,2})?$/,
    };

    this.validLevels = ['junior', 'mid-level', 'senior', 'leadership'];
    this.validDegreeTypes = ["Bachelor's", "Master's", 'PhD', 'Associate', 'Certificate'];

    this.currentYear = new Date().getFullYear();
  }

  /**
   * Validate complete resume data structure
   * @param {Object} data - Resume data to validate
   * @returns {Promise<Object>} - Validation results
   */
  async validateResumeData(data) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      fieldValidation: {},
      statistics: {
        totalFields: 0,
        validFields: 0,
        invalidFields: 0,
        warningFields: 0,
      },
    };

    try {
      // Validate overall structure
      this.validateStructure(data, validationResult);

      // Validate each section
      await this.validatePositionAppliedFor(data.positionAppliedFor, validationResult);
      await this.validateSelfEvaluation(data.selfEvaluation, validationResult);
      await this.validateSkillsAndSpecialties(data.skillsAndSpecialties, validationResult);
      await this.validateWorkExperience(data.workExperience, validationResult);
      await this.validateBasicInformation(data.basicInformation, validationResult);
      await this.validateEducationBackground(data.educationBackground, validationResult);

      // Cross-validation between sections
      this.performCrossValidation(data, validationResult);

      // Calculate final statistics
      this.calculateStatistics(validationResult);

      // Determine overall validity
      validationResult.isValid = validationResult.errors.length === 0;

      return validationResult;
    } catch (error) {
      validationResult.isValid = false;
      validationResult.errors.push(`Validation process failed: ${error.message}`);
      return validationResult;
    }
  }

  /**
   * Validate overall data structure
   * @param {Object} data - Data to validate
   * @param {Object} result - Validation result object
   */
  validateStructure(data, result) {
    const requiredSections = [
      'positionAppliedFor',
      'selfEvaluation',
      'skillsAndSpecialties',
      'workExperience',
      'basicInformation',
      'educationBackground',
    ];

    // Check for required sections
    const missingSections = requiredSections.filter((section) => !(section in data));
    missingSections.forEach((section) => {
      result.errors.push(`Missing required section: ${section}`);
    });

    // Check for unexpected top-level properties
    const extraSections = Object.keys(data).filter(
      (key) => !requiredSections.includes(key) && key !== 'metadata',
    );
    extraSections.forEach((section) => {
      result.warnings.push(`Unexpected section found: ${section}`);
    });
  }

  /**
   * Validate position applied for section
   * @param {Object} section - Position data
   * @param {Object} result - Validation result
   */
  async validatePositionAppliedFor(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!section || typeof section !== 'object') {
      sectionResult.errors.push('Position applied for section is missing or invalid');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.positionAppliedFor = sectionResult;
      return;
    }

    // Validate level
    if (section.level) {
      if (!this.validLevels.includes(section.level)) {
        sectionResult.errors.push(
          `Invalid level: ${section.level}. Must be one of: ${this.validLevels.join(', ')}`,
        );
      }
    } else {
      sectionResult.warnings.push('Position level not specified');
    }

    // Validate years required
    if (section.yearsRequired !== null && section.yearsRequired !== undefined) {
      if (
        typeof section.yearsRequired !== 'number' ||
        section.yearsRequired < 0 ||
        section.yearsRequired > 50
      ) {
        sectionResult.errors.push(`Invalid years required: ${section.yearsRequired}`);
      }
    }

    // Validate keywords array
    if (section.keywords) {
      if (!Array.isArray(section.keywords)) {
        sectionResult.errors.push('Keywords must be an array');
      } else if (section.keywords.length === 0) {
        sectionResult.warnings.push('No position keywords provided');
      }
    }

    // Check if position title is meaningful
    if (!section.title || section.title.trim().length < 2) {
      sectionResult.warnings.push('Position title is missing or too short');
    }

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.positionAppliedFor = sectionResult;
  }

  /**
   * Validate self evaluation section
   * @param {Object} section - Self evaluation data
   * @param {Object} result - Validation result
   */
  async validateSelfEvaluation(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!section || typeof section !== 'object') {
      sectionResult.errors.push('Self evaluation section is missing or invalid');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.selfEvaluation = sectionResult;
      return;
    }

    // Validate arrays
    const arrayFields = ['careerHighlights', 'strengths'];
    arrayFields.forEach((field) => {
      if (section[field] && !Array.isArray(section[field])) {
        sectionResult.errors.push(`${field} must be an array`);
      }
    });

    // Check for empty self evaluation
    const hasContent =
      section.summary ||
      (section.careerHighlights && section.careerHighlights.length > 0) ||
      (section.strengths && section.strengths.length > 0) ||
      section.goals;

    if (!hasContent) {
      sectionResult.warnings.push('Self evaluation section appears to be empty');
    }

    // Validate summary length
    if (section.summary && section.summary.length < 20) {
      sectionResult.warnings.push(
        'Professional summary is very short - consider adding more detail',
      );
    }

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.selfEvaluation = sectionResult;
  }

  /**
   * Validate skills and specialties section
   * @param {Object} section - Skills data
   * @param {Object} result - Validation result
   */
  async validateSkillsAndSpecialties(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!section || typeof section !== 'object') {
      sectionResult.errors.push('Skills and specialties section is missing or invalid');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.skillsAndSpecialties = sectionResult;
      return;
    }

    // Validate skill arrays
    const skillFields = [
      'technical',
      'frameworks',
      'tools',
      'domains',
      'softSkills',
      'certifications',
    ];
    skillFields.forEach((field) => {
      if (section[field]) {
        if (!Array.isArray(section[field])) {
          sectionResult.errors.push(`${field} must be an array`);
        } else {
          // Check for empty or very short skill names
          section[field].forEach((skill, index) => {
            if (!skill || skill.trim().length < 2) {
              sectionResult.warnings.push(`${field}[${index}] is too short or empty`);
            }
          });
        }
      }
    });

    // Check for overall skill completeness
    const totalSkills = skillFields.reduce((total, field) => {
      return total + (section[field] ? section[field].length : 0);
    }, 0);

    if (totalSkills === 0) {
      sectionResult.warnings.push('No skills or specialties listed');
    } else if (totalSkills < 5) {
      sectionResult.warnings.push('Very few skills listed - consider adding more relevant skills');
    }

    // Check for technical skills in non-technical positions
    if (section.technical && section.technical.length > 0) {
      result.suggestions.push('Strong technical skills detected - suitable for technical roles');
    }

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.skillsAndSpecialties = sectionResult;
  }

  /**
   * Validate work experience section
   * @param {Array} section - Work experience array
   * @param {Object} result - Validation result
   */
  async validateWorkExperience(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!Array.isArray(section)) {
      sectionResult.errors.push('Work experience must be an array');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.workExperience = sectionResult;
      return;
    }

    if (section.length === 0) {
      sectionResult.warnings.push('No work experience listed');
    }

    // Validate each job entry
    section.forEach((job, index) => {
      this.validateJobEntry(job, index, sectionResult);
    });

    // Cross-validate job dates for chronological order
    this.validateJobChronology(section, sectionResult);

    // Calculate total experience
    const totalExperience = this.calculateTotalExperience(section);
    if (totalExperience.years < 1 && totalExperience.months < 6) {
      sectionResult.warnings.push('Limited work experience detected');
    }

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.workExperience = sectionResult;
  }

  /**
   * Validate individual job entry
   * @param {Object} job - Job entry
   * @param {number} index - Job index
   * @param {Object} sectionResult - Section validation result
   */
  validateJobEntry(job, index, sectionResult) {
    const jobPrefix = `Job ${index + 1}`;

    // Required fields
    if (!job.company || job.company.trim().length < 2) {
      sectionResult.errors.push(`${jobPrefix}: Company name is missing or too short`);
    }

    if (!job.position || job.position.trim().length < 2) {
      sectionResult.errors.push(`${jobPrefix}: Position title is missing or too short`);
    }

    // Date validation
    if (job.startDate) {
      if (!this.isValidDate(job.startDate)) {
        sectionResult.errors.push(`${jobPrefix}: Invalid start date format: ${job.startDate}`);
      }
    } else {
      sectionResult.warnings.push(`${jobPrefix}: Start date is missing`);
    }

    if (job.endDate) {
      if (job.endDate !== 'Present' && !this.isValidDate(job.endDate)) {
        sectionResult.errors.push(`${jobPrefix}: Invalid end date format: ${job.endDate}`);
      }
    } else {
      sectionResult.warnings.push(`${jobPrefix}: End date is missing`);
    }

    // Date logic validation
    if (job.startDate && job.endDate && job.endDate !== 'Present') {
      const startYear = parseInt(job.startDate.substring(0, 4));
      const endYear = parseInt(job.endDate.substring(0, 4));

      if (startYear > endYear) {
        sectionResult.errors.push(`${jobPrefix}: Start date is after end date`);
      }

      if (endYear > this.currentYear) {
        sectionResult.warnings.push(`${jobPrefix}: End date is in the future`);
      }
    }

    // Responsibilities and achievements
    if (
      !job.responsibilities ||
      !Array.isArray(job.responsibilities) ||
      job.responsibilities.length === 0
    ) {
      sectionResult.warnings.push(`${jobPrefix}: No responsibilities listed`);
    }

    if (job.achievements && !Array.isArray(job.achievements)) {
      sectionResult.errors.push(`${jobPrefix}: Achievements must be an array`);
    }

    // Duration validation
    if (job.duration && !this.isValidDuration(job.duration)) {
      sectionResult.warnings.push(
        `${jobPrefix}: Duration format may be incorrect: ${job.duration}`,
      );
    }
  }

  /**
   * Validate job chronology
   * @param {Array} jobs - Array of job entries
   * @param {Object} sectionResult - Section validation result
   */
  validateJobChronology(jobs, sectionResult) {
    if (jobs.length < 2) return;

    // Sort jobs by start date to check for gaps
    const sortedJobs = jobs
      .filter((job) => job.startDate && this.isValidDate(job.startDate))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Check for overlapping positions
    for (let i = 0; i < sortedJobs.length - 1; i++) {
      const current = sortedJobs[i];
      const next = sortedJobs[i + 1];

      if (current.endDate && current.endDate !== 'Present' && this.isValidDate(current.endDate)) {
        const currentEnd = new Date(current.endDate);
        const nextStart = new Date(next.startDate);

        if (currentEnd > nextStart) {
          sectionResult.warnings.push(
            `Overlapping employment periods detected between ${current.company} and ${next.company}`,
          );
        }
      }
    }
  }

  /**
   * Validate basic information section
   * @param {Object} section - Basic information data
   * @param {Object} result - Validation result
   */
  async validateBasicInformation(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!section || typeof section !== 'object') {
      sectionResult.errors.push('Basic information section is missing or invalid');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.basicInformation = sectionResult;
      return;
    }

    // Validate email
    if (section.email) {
      if (!this.validationRules.email.test(section.email)) {
        sectionResult.errors.push(`Invalid email format: ${section.email}`);
      }
    } else {
      sectionResult.warnings.push('Email address is missing');
    }

    // Validate phone
    if (section.phone) {
      const cleanPhone = section.phone.replace(/\s/g, '');
      if (!this.validationRules.phone.test(cleanPhone)) {
        sectionResult.warnings.push(`Phone number format may be invalid: ${section.phone}`);
      }
    } else {
      sectionResult.warnings.push('Phone number is missing');
    }

    // Validate URLs
    ['linkedIn', 'github'].forEach((field) => {
      if (section[field]) {
        if (!this.validationRules.url.test(section[field])) {
          sectionResult.warnings.push(`${field} URL format may be invalid: ${section[field]}`);
        }
      }
    });

    // Check for name
    if (!section.fullName || section.fullName.trim().length < 2) {
      sectionResult.warnings.push('Full name is missing or too short');
    }

    // Check for location
    if (!section.location) {
      sectionResult.warnings.push('Location information is missing');
    }

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.basicInformation = sectionResult;
  }

  /**
   * Validate education background section
   * @param {Object} section - Education data
   * @param {Object} result - Validation result
   */
  async validateEducationBackground(section, result) {
    const sectionResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!section || typeof section !== 'object') {
      sectionResult.errors.push('Education background section is missing or invalid');
      result.errors.push(...sectionResult.errors);
      result.fieldValidation.educationBackground = sectionResult;
      return;
    }

    // Validate degrees array
    if (!section.degrees || !Array.isArray(section.degrees)) {
      sectionResult.errors.push('Degrees must be an array');
    } else if (section.degrees.length === 0) {
      sectionResult.warnings.push('No educational degrees listed');
    } else {
      // Validate each degree
      section.degrees.forEach((degree, index) => {
        this.validateDegree(degree, index, sectionResult);
      });
    }

    // Validate other arrays
    ['relevantCoursework', 'projects'].forEach((field) => {
      if (section[field] && !Array.isArray(section[field])) {
        sectionResult.errors.push(`${field} must be an array`);
      }
    });

    result.errors.push(...sectionResult.errors);
    result.warnings.push(...sectionResult.warnings);
    result.fieldValidation.educationBackground = sectionResult;
  }

  /**
   * Validate individual degree entry
   * @param {Object} degree - Degree entry
   * @param {number} index - Degree index
   * @param {Object} sectionResult - Section validation result
   */
  validateDegree(degree, index, sectionResult) {
    const degreePrefix = `Degree ${index + 1}`;

    // Validate degree type
    if (!degree.type || !this.validDegreeTypes.includes(degree.type)) {
      sectionResult.errors.push(`${degreePrefix}: Invalid degree type: ${degree.type}`);
    }

    // Validate required fields
    if (!degree.field || degree.field.trim().length < 2) {
      sectionResult.errors.push(`${degreePrefix}: Field of study is missing or too short`);
    }

    if (!degree.institution || degree.institution.trim().length < 2) {
      sectionResult.errors.push(`${degreePrefix}: Institution name is missing or too short`);
    }

    // Validate graduation year
    if (degree.graduationYear) {
      if (
        typeof degree.graduationYear !== 'number' ||
        degree.graduationYear < 1950 ||
        degree.graduationYear > this.currentYear + 10
      ) {
        sectionResult.errors.push(
          `${degreePrefix}: Invalid graduation year: ${degree.graduationYear}`,
        );
      }
    } else {
      sectionResult.warnings.push(`${degreePrefix}: Graduation year is missing`);
    }

    // Validate GPA if provided
    if (degree.gpa !== null && degree.gpa !== undefined) {
      if (typeof degree.gpa !== 'number' || degree.gpa < 0 || degree.gpa > 4.0) {
        sectionResult.errors.push(`${degreePrefix}: Invalid GPA: ${degree.gpa}`);
      }
    }
  }

  /**
   * Perform cross-validation between sections
   * @param {Object} data - Complete resume data
   * @param {Object} result - Validation result
   */
  performCrossValidation(data, result) {
    // Validate level classification against experience
    if (data.positionAppliedFor?.level && data.workExperience) {
      const totalExperience = this.calculateTotalExperience(data.workExperience);
      const levelExperience = this.getExpectedExperienceForLevel(data.positionAppliedFor.level);

      if (totalExperience.years < levelExperience.min) {
        result.warnings.push(
          `Position level "${data.positionAppliedFor.level}" may be too high for ${totalExperience.years} years of experience`,
        );
      }
    }

    // Check education vs position requirements
    if (data.educationBackground?.degrees && data.positionAppliedFor?.title) {
      const hasRelevantDegree = data.educationBackground.degrees.some((degree) =>
        this.isRelevantDegree(degree.field, data.positionAppliedFor.title),
      );

      if (!hasRelevantDegree) {
        result.suggestions.push(
          'Consider highlighting how your educational background relates to the target position',
        );
      }
    }

    // Check skills vs experience alignment
    if (data.skillsAndSpecialties && data.workExperience) {
      const experienceKeywords = this.extractExperienceKeywords(data.workExperience);
      const skillKeywords = this.extractSkillKeywords(data.skillsAndSpecialties);

      const overlap = experienceKeywords.filter((keyword) =>
        skillKeywords.some((skill) => skill.toLowerCase().includes(keyword.toLowerCase())),
      );

      if (overlap.length < 3) {
        result.suggestions.push(
          'Consider aligning listed skills more closely with work experience',
        );
      }
    }
  }

  /**
   * Calculate validation statistics
   * @param {Object} result - Validation result
   */
  calculateStatistics(result) {
    const sections = Object.keys(result.fieldValidation);

    result.statistics.totalSections = sections.length;
    result.statistics.validSections = sections.filter(
      (section) => result.fieldValidation[section].errors.length === 0,
    ).length;
    result.statistics.sectionsWithWarnings = sections.filter(
      (section) => result.fieldValidation[section].warnings.length > 0,
    ).length;
    result.statistics.sectionsWithErrors = sections.filter(
      (section) => result.fieldValidation[section].errors.length > 0,
    ).length;
  }

  /**
   * Helper method to validate date strings
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} - Whether date is valid
   */
  isValidDate(dateStr) {
    if (!dateStr || dateStr === 'Present') return true;
    return this.validationRules.dateFormat.test(dateStr) || this.validationRules.year.test(dateStr);
  }

  /**
   * Helper method to validate duration strings
   * @param {string} duration - Duration string to validate
   * @returns {boolean} - Whether duration format is valid
   */
  isValidDuration(duration) {
    if (!duration) return false;

    const patterns = [
      /^\d+ years?$/,
      /^\d+ months?$/,
      /^\d+ years? \d+ months?$/,
      /^less than \d+ months?$/i,
      /^about \d+ years?$/i,
    ];

    return patterns.some((pattern) => pattern.test(duration.trim()));
  }

  /**
   * Calculate total work experience in years and months
   * @param {Array} workExperience - Work experience array
   * @returns {Object} - Total experience
   */
  calculateTotalExperience(workExperience) {
    let totalMonths = 0;

    workExperience.forEach((job) => {
      if (job.startDate && job.endDate) {
        try {
          const start = new Date(job.startDate);
          const end = job.endDate === 'Present' ? new Date() : new Date(job.endDate);
          const months =
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          totalMonths += Math.max(0, months);
        } catch {
          // Skip invalid dates
        }
      }
    });

    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      totalMonths,
    };
  }

  /**
   * Get expected experience range for position level
   * @param {string} level - Position level
   * @returns {Object} - Experience range
   */
  getExpectedExperienceForLevel(level) {
    const ranges = {
      junior: { min: 0, max: 2 },
      'mid-level': { min: 3, max: 5 },
      senior: { min: 5, max: 10 },
      leadership: { min: 10, max: 50 },
    };

    return ranges[level] || { min: 0, max: 50 };
  }

  /**
   * Check if degree is relevant to position
   * @param {string} degreeField - Degree field
   * @param {string} positionTitle - Position title
   * @returns {boolean} - Whether degree is relevant
   */
  isRelevantDegree(degreeField, positionTitle) {
    // Simple keyword matching - could be enhanced with more sophisticated logic
    const degreeKeywords = degreeField.toLowerCase().split(/\s+/);
    const positionKeywords = positionTitle.toLowerCase().split(/\s+/);

    return degreeKeywords.some((keyword) =>
      positionKeywords.some(
        (posKeyword) => posKeyword.includes(keyword) || keyword.includes(posKeyword),
      ),
    );
  }

  /**
   * Extract keywords from work experience
   * @param {Array} workExperience - Work experience array
   * @returns {Array} - Keywords array
   */
  extractExperienceKeywords(workExperience) {
    const keywords = new Set();

    workExperience.forEach((job) => {
      if (job.position) {
        job.position
          .toLowerCase()
          .split(/\s+/)
          .forEach((word) => {
            if (word.length > 3) keywords.add(word);
          });
      }

      if (job.responsibilities) {
        job.responsibilities.forEach((resp) => {
          resp
            .toLowerCase()
            .split(/\s+/)
            .forEach((word) => {
              if (word.length > 4) keywords.add(word);
            });
        });
      }
    });

    return Array.from(keywords);
  }

  /**
   * Extract keywords from skills
   * @param {Object} skillsAndSpecialties - Skills data
   * @returns {Array} - Keywords array
   */
  extractSkillKeywords(skillsAndSpecialties) {
    const keywords = new Set();

    Object.values(skillsAndSpecialties).forEach((skillArray) => {
      if (Array.isArray(skillArray)) {
        skillArray.forEach((skill) => {
          if (typeof skill === 'string') {
            keywords.add(skill.toLowerCase());
          }
        });
      }
    });

    return Array.from(keywords);
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();
export default dataValidator;
