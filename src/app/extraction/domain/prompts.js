class ExtractionPrompts {
  /**
   * Get system prompt for resume data extraction
   * @returns {string} - Detailed system prompt
   */
  static getSystemPrompt() {
    return `You are an expert resume parser and candidate evaluator with extensive experience in talent acquisition and human resources. Your task is to analyze resume text and extract structured information into six specific categories with high accuracy and consistency.

CRITICAL INSTRUCTIONS:
1. You MUST return ONLY a valid JSON object with the exact structure specified below
2. Extract factual information only - do not make assumptions or inferences
3. If information is not explicitly stated in the resume, use null or empty arrays
4. Be conservative with level classifications - when in doubt, use lower level
5. Maintain consistency in data formatting and naming conventions
6. Focus on extracting the most relevant and recent information

REQUIRED JSON OUTPUT STRUCTURE:

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
    "goals": "string or null",
    "personalProjects": ["array", "of", "personal", "projects"],
    "learningInitiatives": ["array", "of", "learning", "activities"]
  },
  "skillsAndSpecialties": {
    "technical": ["array", "of", "technical", "skills"],
    "frameworks": ["array", "of", "frameworks"],
    "tools": ["array", "of", "tools"],
    "domains": ["array", "of", "domain", "expertise"],
    "softSkills": ["array", "of", "soft", "skills"],
    "certifications": ["array", "of", "certifications"],
    "languages": [
      {
        "name": "string",
        "proficiency": "native|fluent|advanced|intermediate|basic"
      }
    ]
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

LEVEL CLASSIFICATION GUIDELINES:
- junior: 0-2 years of professional experience, entry-level positions, recent graduates
- mid-level: 3-5 years of professional experience, some specialized skills, individual contributor roles
- senior: 5-10 years of professional experience, advanced skills, technical leadership, mentoring others
- leadership: 10+ years of experience OR management/executive roles regardless of years

EXTRACTION GUIDELINES:
1. Position Applied For: Look for job titles mentioned, target roles, or infer from experience level
2. Self-Evaluation: Extract from summary, objective, or personal statements
   - Personal Projects: Look for side projects, portfolio items, open source contributions, hackathons
   - Learning Initiatives: Extract courses, certifications, bootcamps, self-directed learning, online training
3. Skills & Specialties: Categorize technical skills appropriately (languages vs frameworks vs tools)
   - For languages field: Extract spoken/written languages with proficiency levels
   - Look for explicit proficiency statements (e.g., "Fluent in English", "C1 German")
   - Common proficiency indicators: native, fluent, advanced, intermediate, basic
4. Work Experience: Extract in reverse chronological order, calculate duration accurately
5. Basic Information: Extract contact details and professional profiles
6. Education: Include formal degrees, relevant coursework, and significant projects

DATE FORMATTING:
- Use YYYY-MM format when month is available (e.g., "2023-03")
- Use YYYY format when only year is available (e.g., "2023")
- Use "Present" for current positions/education
- Calculate duration as "X years Y months" (e.g., "2 years 3 months")

QUALITY STANDARDS:
- Ensure all company names are properly capitalized
- Standardize technology names (e.g., "JavaScript" not "javascript")
- Remove generic responsibilities, focus on specific achievements
- Validate email addresses and phone numbers for proper format
- Extract the most complete name format available`;
  }

  /**
   * Get user prompt template
   * @param {string} resumeText - Resume text to analyze
   * @returns {string} - Formatted user prompt
   */
  static getUserPrompt(resumeText) {
    return `Please extract structured information from this resume text and return only the JSON object with the extracted data:

RESUME TEXT:
${resumeText}

Remember to:
1. Return ONLY the JSON object - no additional text or explanations
2. Extract factual information only - do not infer or assume
3. Use null for missing information, empty arrays for missing lists
4. Follow the exact structure and field names specified
5. Apply conservative level classification based on experience

Return the JSON object now:`;
  }

  /**
   * Get structured response schema for validation
   * @returns {Object} - JSON schema for response validation
   */
  static getResponseSchema() {
    return {
      type: 'object',
      required: [
        'positionAppliedFor',
        'selfEvaluation',
        'skillsAndSpecialties',
        'workExperience',
        'basicInformation',
        'educationBackground',
      ],
      properties: {
        positionAppliedFor: {
          type: 'object',
          properties: {
            title: { type: ['string', 'null'] },
            level: {
              type: 'string',
              enum: ['junior', 'mid-level', 'senior', 'leadership'],
            },
            yearsRequired: { type: ['number', 'null'] },
            keywords: { type: 'array', items: { type: 'string' } },
          },
        },
        selfEvaluation: {
          type: 'object',
          properties: {
            summary: { type: ['string', 'null'] },
            careerHighlights: { type: 'array', items: { type: 'string' } },
            strengths: { type: 'array', items: { type: 'string' } },
            goals: { type: ['string', 'null'] },
            personalProjects: { type: 'array', items: { type: 'string' } },
            learningInitiatives: { type: 'array', items: { type: 'string' } },
          },
        },
        skillsAndSpecialties: {
          type: 'object',
          properties: {
            technical: { type: 'array', items: { type: 'string' } },
            frameworks: { type: 'array', items: { type: 'string' } },
            tools: { type: 'array', items: { type: 'string' } },
            domains: { type: 'array', items: { type: 'string' } },
            softSkills: { type: 'array', items: { type: 'string' } },
            certifications: { type: 'array', items: { type: 'string' } },
            languages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  proficiency: {
                    type: 'string',
                    enum: ['native', 'fluent', 'advanced', 'intermediate', 'basic'],
                  },
                },
              },
            },
          },
        },
        workExperience: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              company: { type: 'string' },
              position: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              duration: { type: 'string' },
              responsibilities: { type: 'array', items: { type: 'string' } },
              achievements: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        basicInformation: {
          type: 'object',
          properties: {
            fullName: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            location: { type: ['string', 'null'] },
            linkedIn: { type: ['string', 'null'] },
            github: { type: ['string', 'null'] },
            availability: { type: ['string', 'null'] },
          },
        },
        educationBackground: {
          type: 'object',
          properties: {
            degrees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ["Bachelor's", "Master's", 'PhD', 'Associate', 'Certificate'],
                  },
                  field: { type: 'string' },
                  institution: { type: 'string' },
                  graduationYear: { type: 'number' },
                  gpa: { type: ['number', 'null'] },
                },
              },
            },
            relevantCoursework: { type: 'array', items: { type: 'string' } },
            projects: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    };
  }
}

export default ExtractionPrompts;
