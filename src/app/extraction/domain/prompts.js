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

LEVEL CLASSIFICATION GUIDELINES:
- junior: 0-2 years of professional experience, entry-level positions, recent graduates
- mid-level: 3-5 years of professional experience, some specialized skills, individual contributor roles
- senior: 5-10 years of professional experience, advanced skills, technical leadership, mentoring others
- leadership: 10+ years of experience OR management/executive roles regardless of years

EXTRACTION GUIDELINES:
1. Position Applied For: Look for job titles mentioned, target roles, or infer from experience level
2. Self-Evaluation: Extract from summary, objective, or personal statements
3. Skills & Specialties: Categorize technical skills appropriately (languages vs frameworks vs tools)
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
   * Get few-shot examples for better extraction accuracy
   * @returns {Array} - Array of example conversations
   */
  static getFewShotExamples() {
    return [
      {
        role: 'user',
        content: `Please extract structured information from this resume text and return only the JSON object with the extracted data:

RESUME TEXT:
John Smith
Senior Software Engineer
Email: john.smith@email.com | Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johnsmith | GitHub: github.com/johnsmith
Location: San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software engineer with 7 years of experience in full-stack development, specializing in React, Node.js, and cloud technologies. Proven track record of leading development teams and delivering scalable web applications.

WORK EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2021-Present
• Lead a team of 4 developers building e-commerce platform
• Implemented microservices architecture reducing response time by 40%
• Mentored junior developers and conducted code reviews

Software Engineer | StartupXYZ | 2018-2021
• Developed React applications serving 100K+ users
• Built REST APIs using Node.js and Express
• Implemented CI/CD pipelines using Docker and AWS

SKILLS
Programming: JavaScript, Python, TypeScript, Java
Frameworks: React, Node.js, Express, Django
Tools: Docker, AWS, Git, Jenkins
Databases: PostgreSQL, MongoDB, Redis

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2017
GPA: 3.8/4.0

Return the JSON object now:`,
        assistant: `{
  "positionAppliedFor": {
    "title": "Senior Software Engineer",
    "level": "senior",
    "yearsRequired": null,
    "keywords": ["full-stack", "React", "Node.js", "cloud", "microservices", "team lead"]
  },
  "selfEvaluation": {
    "summary": "Experienced software engineer with 7 years of experience in full-stack development, specializing in React, Node.js, and cloud technologies. Proven track record of leading development teams and delivering scalable web applications.",
    "careerHighlights": ["7 years of full-stack development experience", "Leading development teams", "Delivering scalable web applications"],
    "strengths": ["Team leadership", "Full-stack development", "Cloud technologies", "Mentoring"],
    "goals": null
  },
  "skillsAndSpecialties": {
    "technical": ["JavaScript", "Python", "TypeScript", "Java"],
    "frameworks": ["React", "Node.js", "Express", "Django"],
    "tools": ["Docker", "AWS", "Git", "Jenkins"],
    "domains": ["Full-stack development", "E-commerce", "Microservices", "Cloud technologies"],
    "softSkills": ["Team leadership", "Mentoring", "Code reviews"],
    "certifications": []
  },
  "workExperience": [
    {
      "company": "TechCorp Inc.",
      "position": "Senior Software Engineer",
      "startDate": "2021",
      "endDate": "Present",
      "duration": "3 years",
      "responsibilities": ["Lead a team of 4 developers building e-commerce platform", "Implemented microservices architecture", "Mentored junior developers and conducted code reviews"],
      "achievements": ["Reduced response time by 40%"]
    },
    {
      "company": "StartupXYZ",
      "position": "Software Engineer",
      "startDate": "2018",
      "endDate": "2021",
      "duration": "3 years",
      "responsibilities": ["Developed React applications", "Built REST APIs using Node.js and Express", "Implemented CI/CD pipelines"],
      "achievements": ["Served 100K+ users"]
    }
  ],
  "basicInformation": {
    "fullName": "John Smith",
    "email": "john.smith@email.com",
    "phone": "(555) 123-4567",
    "location": "San Francisco, CA",
    "linkedIn": "linkedin.com/in/johnsmith",
    "github": "github.com/johnsmith",
    "availability": null
  },
  "educationBackground": {
    "degrees": [
      {
        "type": "Bachelor's",
        "field": "Computer Science",
        "institution": "University of California, Berkeley",
        "graduationYear": 2017,
        "gpa": 3.8
      }
    ],
    "relevantCoursework": [],
    "projects": []
  }
}`,
      },
      {
        role: 'user',
        content: `Please extract structured information from this resume text and return only the JSON object with the extracted data:

RESUME TEXT:
Sarah Johnson
Data Scientist
sarah.johnson@gmail.com | (555) 987-6543
New York, NY

CAREER OBJECTIVE
Recent graduate seeking entry-level data scientist position to apply machine learning skills and statistical analysis knowledge in real-world business problems.

EDUCATION
Master of Science in Data Science | Columbia University | 2024
Relevant Coursework: Machine Learning, Statistical Analysis, Data Visualization, Python Programming
Capstone Project: Predictive model for customer churn using ensemble methods

Bachelor of Arts in Mathematics | NYU | 2022
GPA: 3.6/4.0

SKILLS
Programming Languages: Python, R, SQL
Libraries: Pandas, NumPy, Scikit-learn, TensorFlow
Tools: Jupyter, Git, Tableau
Statistical Methods: Regression, Classification, Clustering

INTERNSHIP EXPERIENCE
Data Science Intern | DataTech Solutions | Summer 2023
• Analyzed customer data to identify trends and patterns
• Built machine learning models for sales forecasting
• Created dashboards using Tableau for executive reporting

Return the JSON object now:`,
        assistant: `{
  "positionAppliedFor": {
    "title": "Data Scientist",
    "level": "junior",
    "yearsRequired": null,
    "keywords": ["entry-level", "machine learning", "statistical analysis", "data science"]
  },
  "selfEvaluation": {
    "summary": "Recent graduate seeking entry-level data scientist position to apply machine learning skills and statistical analysis knowledge in real-world business problems.",
    "careerHighlights": ["Recent Master's graduate in Data Science", "Machine learning experience", "Statistical analysis knowledge"],
    "strengths": ["Machine learning", "Statistical analysis", "Data visualization"],
    "goals": "Apply machine learning skills and statistical analysis knowledge in real-world business problems"
  },
  "skillsAndSpecialities": {
    "technical": ["Python", "R", "SQL"],
    "frameworks": ["Pandas", "NumPy", "Scikit-learn", "TensorFlow"],
    "tools": ["Jupyter", "Git", "Tableau"],
    "domains": ["Data Science", "Machine Learning", "Statistical Analysis", "Data Visualization"],
    "softSkills": [],
    "certifications": []
  },
  "workExperience": [
    {
      "company": "DataTech Solutions",
      "position": "Data Science Intern",
      "startDate": "2023",
      "endDate": "2023",
      "duration": "3 months",
      "responsibilities": ["Analyzed customer data to identify trends and patterns", "Built machine learning models for sales forecasting", "Created dashboards using Tableau for executive reporting"],
      "achievements": []
    }
  ],
  "basicInformation": {
    "fullName": "Sarah Johnson",
    "email": "sarah.johnson@gmail.com",
    "phone": "(555) 987-6543",
    "location": "New York, NY",
    "linkedIn": null,
    "github": null,
    "availability": null
  },
  "educationBackground": {
    "degrees": [
      {
        "type": "Master's",
        "field": "Data Science",
        "institution": "Columbia University",
        "graduationYear": 2024,
        "gpa": null
      },
      {
        "type": "Bachelor's",
        "field": "Mathematics",
        "institution": "NYU",
        "graduationYear": 2022,
        "gpa": 3.6
      }
    ],
    "relevantCoursework": ["Machine Learning", "Statistical Analysis", "Data Visualization", "Python Programming"],
    "projects": ["Predictive model for customer churn using ensemble methods"]
  }
}`,
      },
    ];
  }

  /**
   * Get minimal prompt for faster processing
   * @param {string} resumeText - Resume text to analyze
   * @returns {Array} - Minimal message array for API
   */
  static getMinimalPrompt(resumeText) {
    return [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: this.getUserPrompt(resumeText) },
    ];
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
