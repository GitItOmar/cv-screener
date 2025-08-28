import BaseAgent from './baseAgent.js';

/**
 * CEO Agent - Evaluates leadership potential and strategic thinking
 * Focuses on vision, impact, growth mindset, and business acumen
 */
class CEOAgent extends BaseAgent {
  constructor() {
    super('CEO', 'Chief Executive Officer - Leadership & Strategic Assessment');
  }

  /**
   * Get CEO-specific system prompt
   * @returns {string} System prompt for CEO perspective
   */
  getSystemPrompt() {
    return `You are a seasoned CEO with 20+ years of experience building and scaling successful companies. You evaluate candidates through the lens of leadership potential, strategic thinking, and business impact.

Your assessment focuses on:

1. **Leadership Indicators**:
   - Evidence of leading teams or initiatives
   - Ability to inspire and motivate others
   - Decision-making capabilities
   - Conflict resolution and people management

2. **Strategic Thinking**:
   - Big picture vision
   - Problem-solving approach
   - Innovation and creative thinking
   - Market and business awareness

3. **Business Impact**:
   - Measurable results and achievements
   - Revenue/cost impact
   - Process improvements
   - Growth contributions

4. **Growth Mindset**:
   - Learning from failures
   - Adaptability and resilience
   - Continuous improvement
   - Ambition and career trajectory

5. **Entrepreneurial Spirit**:
   - Initiative and ownership
   - Risk-taking (calculated)
   - Resource optimization
   - Self-motivation

Provide balanced, actionable feedback that identifies both potential and areas for development. Be specific and reference actual content from the resume when possible.

Your tone should be professional yet approachable, as if you're providing mentorship to a promising candidate.`;
  }

  /**
   * Analyze resume from CEO perspective
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} CEO assessment
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
      throw new Error(`CEO Agent analysis failed: ${error.message}`);
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

    const clientConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.2,
    };

    const client = new LLMClient(clientConfig);

    await client.initialize();

    return client;
  }

  /**
   * Enhanced CEO-specific prompt formatting
   * @param {Object} data - Resume and evaluation data
   * @returns {string} Formatted prompt
   */
  getUserPrompt(data) {
    const basePrompt = super.getUserPrompt(data);

    return `${basePrompt}

ADDITIONAL CEO FOCUS AREAS:

1. **Leadership Potential**: Look for progression in responsibilities, team management experience, mentoring, or leading cross-functional initiatives.

2. **Strategic Contributions**: Identify strategic projects, business development, market expansion, or transformation initiatives.

3. **Business Acumen**: Assess understanding of business metrics, P&L responsibility, budget management, or customer/market insights.

4. **Innovation & Vision**: Look for examples of innovation, process improvements, new initiatives, or forward-thinking approaches.

5. **Cultural Fit**: Evaluate alignment with our values of innovation, collaboration, customer focus, and continuous improvement.

Consider the candidate's potential for growth into leadership roles, not just their current qualifications.`;
  }

  /**
   * CEO-specific response validation
   * @param {Object} response - Agent response
   * @returns {boolean} True if valid
   */
  validateResponse(response) {
    if (!super.validateResponse(response)) {
      return false;
    }

    // CEO-specific validations
    if (!response.assessment || response.assessment.length < 100) {
      return false;
    }

    // Ensure leadership perspective is included
    const leadershipKeywords = ['leadership', 'strategic', 'business', 'growth', 'impact'];
    const hasLeadershipFocus = leadershipKeywords.some((keyword) =>
      response.assessment.toLowerCase().includes(keyword),
    );

    return hasLeadershipFocus;
  }
}

export default CEOAgent;
