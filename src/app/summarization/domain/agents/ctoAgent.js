import BaseAgent from './baseAgent.js';

/**
 * CTO Agent - Evaluates technical depth and engineering excellence
 * Focuses on technical skills, architecture, problem-solving, and innovation
 */
class CTOAgent extends BaseAgent {
  constructor() {
    super('CTO', 'Chief Technology Officer - Technical Excellence Assessment');
  }

  /**
   * Get CTO-specific system prompt
   * @returns {string} System prompt for CTO perspective
   */
  getSystemPrompt() {
    return `You are an experienced CTO with deep technical expertise across multiple domains and a track record of building scalable technology organizations. You evaluate candidates through the lens of technical excellence, architectural thinking, and engineering leadership.

Your assessment focuses on:

1. **Technical Depth**:
   - Mastery of core technologies
   - Understanding of fundamentals (algorithms, data structures, design patterns)
   - Depth vs. breadth balance
   - Continuous learning and technology adoption

2. **Architecture & Design**:
   - System design capabilities
   - Scalability considerations
   - Security awareness
   - Performance optimization
   - Clean code principles

3. **Problem-Solving**:
   - Analytical thinking
   - Debugging and troubleshooting approach
   - Complex problem decomposition
   - Trade-off analysis

4. **Innovation & Technology Leadership**:
   - Technical innovation examples
   - Research and experimentation
   - Technology selection and evaluation
   - Technical mentorship

5. **Engineering Excellence**:
   - Code quality and best practices
   - Testing and reliability focus
   - DevOps and deployment practices
   - Documentation and knowledge sharing

Provide specific, technical feedback that demonstrates your understanding of their technical journey and potential. Reference actual technologies and projects from their resume.

Your tone should be that of a senior technologist evaluating a peer, respectful of their experience while identifying areas for growth.`;
  }

  /**
   * Analyze resume from CTO perspective
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} CTO assessment
   */
  async analyze({ structuredData, rawText, evaluationScores, jobRequirements }) {
    console.log('⚙️ CTO Agent starting analysis...');

    try {
      const llmClient = await this.getLLMClient();
      console.log('✅ CTO Agent LLM client initialized');

      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt({
        structuredData,
        rawText,
        evaluationScores,
        jobRequirements,
      });

      console.log('📝 CTO Agent prompts prepared, calling LLM...');

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await llmClient.complete(messages);
      console.log('✅ CTO Agent received LLM response');

      const parsed = this.parseResponse(response);
      console.log('✅ CTO Agent parsed response successfully');

      // Add agent metadata
      return {
        ...parsed,
        agent: this.name,
        role: this.role,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ CTO Agent analysis failed:`, error);
      throw new Error(`CTO Agent analysis failed: ${error.message}`);
    }
  }

  /**
   * Get LLM client instance
   * @returns {Promise<Object>} LLM client
   */
  async getLLMClient() {
    console.log('🔧 CTO Agent initializing LLM client...');

    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
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
    console.log('✅ CTO Agent LLM client initialized');
    return client;
  }

  /**
   * Enhanced CTO-specific prompt formatting
   * @param {Object} data - Resume and evaluation data
   * @returns {string} Formatted prompt
   */
  getUserPrompt(data) {
    const basePrompt = super.getUserPrompt(data);

    // Extract technical stack from structured data
    const techStack = [
      ...(data.structuredData?.skillsAndSpecialties?.technical || []),
      ...(data.structuredData?.skillsAndSpecialties?.frameworks || []),
      ...(data.structuredData?.skillsAndSpecialties?.tools || []),
    ];

    return `${basePrompt}

ADDITIONAL CTO FOCUS AREAS:

1. **Technical Stack Assessment**: 
   Candidate's technologies: ${techStack.join(', ')}
   Evaluate depth, relevance, and modernity of their technical skills.

2. **Architecture Experience**: Look for system design, microservices, distributed systems, cloud architecture, or infrastructure decisions.

3. **Code Quality Indicators**: Assess mentions of testing, CI/CD, code reviews, refactoring, technical debt management, or quality metrics.

4. **Problem Complexity**: Evaluate the scale and complexity of problems they've solved (users, data volume, performance requirements).

5. **Technical Leadership**: Look for technical mentorship, architecture decisions, technology selection, or leading technical initiatives.

6. **Innovation & Learning**: Identify personal projects (${data.structuredData?.selfEvaluation?.personalProjects?.length || 0} found), 
   learning initiatives (${data.structuredData?.selfEvaluation?.learningInitiatives?.length || 0} found), 
   open source contributions, or research work.

Consider both their current technical capabilities and their potential for technical growth and leadership.`;
  }

  /**
   * CTO-specific response validation
   * @param {Object} response - Agent response
   * @returns {boolean} True if valid
   */
  validateResponse(response) {
    if (!super.validateResponse(response)) {
      return false;
    }

    // CTO-specific validations
    if (!response.assessment || response.assessment.length < 100) {
      return false;
    }

    // Ensure technical perspective is included
    const technicalKeywords = [
      'technical',
      'technology',
      'architecture',
      'engineering',
      'code',
      'system',
    ];
    const hasTechnicalFocus = technicalKeywords.some((keyword) =>
      response.assessment.toLowerCase().includes(keyword),
    );

    return hasTechnicalFocus;
  }

  /**
   * Calculate technical alignment score
   * @param {Object} data - Resume data
   * @param {Object} requirements - Job requirements
   * @returns {number} Alignment score (0-1)
   */
  calculateTechnicalAlignment(data, requirements) {
    const candidateTech = new Set(
      [
        ...(data.skillsAndSpecialties?.technical || []),
        ...(data.skillsAndSpecialties?.frameworks || []),
        ...(data.skillsAndSpecialties?.tools || []),
      ].map((t) => t.toLowerCase()),
    );

    const requiredTech = new Set((requirements?.technical || []).map((t) => t.toLowerCase()));

    if (requiredTech.size === 0) return 0.5;

    let matches = 0;
    for (const tech of requiredTech) {
      if (candidateTech.has(tech)) {
        matches++;
      }
    }

    return matches / requiredTech.size;
  }
}

export default CTOAgent;
