import BaseAgent from './baseAgent.js';

/**
 * HR Agent - Evaluates soft skills, culture fit, and professional development
 * Focuses on communication, teamwork, career progression, and organizational alignment
 */
class HRAgent extends BaseAgent {
  constructor() {
    super('HR', 'Human Resources - Culture & Soft Skills Assessment');
  }

  /**
   * Get HR-specific system prompt
   * @returns {string} System prompt for HR perspective
   */
  getSystemPrompt() {
    return `You are a senior HR professional with 15+ years of experience in talent acquisition, organizational development, and people management. You evaluate candidates through the lens of cultural fit, soft skills, and long-term potential within the organization.

Your assessment focuses on:

1. **Communication Skills**:
   - Written communication quality (from resume)
   - Presentation and articulation
   - Stakeholder management indicators
   - Cross-functional collaboration

2. **Teamwork & Collaboration**:
   - Team player indicators
   - Collaborative project examples
   - Mentoring and knowledge sharing
   - Conflict resolution skills

3. **Cultural Alignment**:
   - Value alignment indicators
   - Work style and approach
   - Adaptability and flexibility
   - Diversity and inclusion awareness

4. **Professional Development**:
   - Career progression patterns
   - Learning agility
   - Self-improvement initiatives
   - Professional certifications and training

5. **Work Stability & Commitment**:
   - Employment history patterns
   - Tenure at companies
   - Reasons for transitions (if evident)
   - Long-term career vision

6. **Red Flags & Risks**:
   - Unexplained gaps
   - Frequent job changes without progression
   - Lack of teamwork indicators
   - Overqualification concerns

Provide empathetic, balanced feedback that considers the whole person, not just their technical qualifications. Focus on potential and growth opportunities.

When providing recommendations:
- for_recruiter: Focus on cultural and soft skill assessment (e.g., "Schedule panel interview with team members", "Check references for teamwork abilities", "Assess retention risk factors")
- for_candidate: Suggest professional and soft skill development (e.g., "Develop stakeholder management skills", "Build cross-functional collaboration experience", "Strengthen written communication")
- interview_focus: HR and culture topics to explore (e.g., "Team collaboration examples", "Conflict resolution approaches", "Career motivations and goals", "Work style preferences")

Your tone should be warm and supportive, while maintaining professional objectivity in assessment.

RELEVANCE SCORING FOCUS:
As HR, prioritize insights based on their cultural and soft skills relevance:
- For leadership roles (eng_manager, exec_leader): Weight communication, teamwork, and cultural fit higher (80-100)
- For technical roles (technical_ic, tech_lead): Focus on collaboration and professional development (60-80)
- Use soft skills importance score from positionAppliedFor to adjust relevance
- Score pure technical skills lower unless they relate to collaboration or learning
- Emphasize insights about retention, cultural fit, and team dynamics
- Consider work stability patterns more relevant for senior positions`;
  }

  /**
   * Analyze resume from HR perspective
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} HR assessment
   */
  async analyze({ structuredData, rawText, evaluationScores, jobRequirements }) {
    try {
      const llmClient = await this.getLLMClient();

      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt({
        structuredData,
        rawText,
        evaluationScores,
        jobRequirements,
      });

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await llmClient.complete(messages);

      const parsed = this.parseResponse(response);

      // Add agent metadata
      return {
        ...parsed,
        agent: this.name,
        role: this.role,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`HR Agent analysis failed: ${error.message}`);
    }
  }

  /**
   * Get LLM client instance
   * @returns {Promise<Object>} LLM client
   */
  async getLLMClient() {
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Dynamic import to avoid circular dependencies
    const { LLMClient } = await import('@/lib/llm-client/src/index.js');

    const client = new LLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.2,
    });

    await client.initialize();
    return client;
  }

  /**
   * Enhanced HR-specific prompt formatting
   * @param {Object} data - Resume and evaluation data
   * @returns {string} Formatted prompt
   */
  getUserPrompt(data) {
    const basePrompt = super.getUserPrompt(data);

    // Calculate career stability metrics
    const careerMetrics = this.calculateCareerMetrics(data.structuredData);

    return `${basePrompt}

ADDITIONAL HR FOCUS AREAS:

1. **Career Trajectory Analysis**:
   - Total experience: ${careerMetrics.totalExperience}
   - Number of positions: ${careerMetrics.positionCount}
   - Average tenure: ${careerMetrics.averageTenure}
   - Career progression: ${careerMetrics.progressionIndicator}

2. **Soft Skills Evidence**: Look for teamwork, leadership, communication, problem-solving, and interpersonal skills demonstrated through achievements and responsibilities.

3. **Cultural Fit Indicators**: Assess alignment with company values:
   - Innovation and creativity
   - Collaboration and teamwork
   - Customer focus
   - Continuous learning
   - Integrity and accountability

4. **Professional Development**: 
   - Learning initiatives found: ${data.structuredData?.selfEvaluation?.learningInitiatives?.length || 0}
   - Certifications: ${data.structuredData?.skillsAndSpecialties?.certifications?.length || 0}
   - Languages: ${data.structuredData?.skillsAndSpecialties?.languages?.length || 0}

5. **Risk Assessment**: Identify any concerns regarding:
   - Job stability and commitment
   - Overqualification or underqualification
   - Geographic or schedule constraints
   - Salary expectations alignment

6. **Diversity & Inclusion**: Consider how this candidate might contribute to team diversity in terms of background, experience, perspective, and skills.

Provide recommendations for interview focus areas and onboarding considerations if hired.`;
  }

  /**
   * Calculate career metrics for HR analysis
   * @param {Object} structuredData - Structured resume data
   * @returns {Object} Career metrics
   */
  calculateCareerMetrics(structuredData) {
    const workExperience = structuredData?.workExperience || [];

    // Calculate total experience
    let totalMonths = 0;
    const positionCount = workExperience.length;

    workExperience.forEach((job) => {
      const duration = job.duration || '';
      const yearsMatch = duration.match(/(\d+)\s*year/);
      const monthsMatch = duration.match(/(\d+)\s*month/);

      const years = yearsMatch ? parseInt(yearsMatch[1]) : 0;
      const months = monthsMatch ? parseInt(monthsMatch[1]) : 0;

      totalMonths += years * 12 + months;
    });

    const totalYears = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    const averageTenureMonths = positionCount > 0 ? totalMonths / positionCount : 0;

    // Determine progression indicator
    let progressionIndicator = 'Unclear';
    if (workExperience.length >= 2) {
      const recentRole = workExperience[0]?.position?.toLowerCase() || '';
      const previousRole = workExperience[1]?.position?.toLowerCase() || '';

      if (recentRole.includes('senior') && !previousRole.includes('senior')) {
        progressionIndicator = 'Upward';
      } else if (recentRole.includes('lead') || recentRole.includes('manager')) {
        progressionIndicator = 'Leadership growth';
      } else if (positionCount > 0) {
        progressionIndicator = 'Lateral movement';
      }
    }

    return {
      totalExperience: `${totalYears} years ${remainingMonths} months`,
      positionCount,
      averageTenure: `${Math.floor(averageTenureMonths / 12)} years ${Math.floor(averageTenureMonths % 12)} months`,
      progressionIndicator,
      totalMonths,
    };
  }

  /**
   * HR-specific response validation
   * @param {Object} response - Agent response
   * @returns {boolean} True if valid
   */
  validateResponse(response) {
    if (!super.validateResponse(response)) {
      return false;
    }

    // HR-specific validations
    if (!response.assessment || response.assessment.length < 100) {
      return false;
    }

    // Ensure HR perspective is included
    const hrKeywords = [
      'culture',
      'team',
      'communication',
      'soft skills',
      'career',
      'professional',
    ];
    const hasHRFocus = hrKeywords.some((keyword) =>
      response.assessment.toLowerCase().includes(keyword),
    );

    return hasHRFocus;
  }
}

export default HRAgent;
