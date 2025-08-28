import CEOAgent from './agents/ceoAgent.js';
import CTOAgent from './agents/ctoAgent.js';
import HRAgent from './agents/hrAgent.js';

/**
 * Multi-agent coordinator that orchestrates parallel execution of evaluation agents
 * Manages agent lifecycle, error handling, and result aggregation
 */
class AgentCoordinator {
  constructor() {
    // Initialize agents
    this.agents = {
      ceo: new CEOAgent(),
      cto: new CTOAgent(),
      hr: new HRAgent(),
    };
  }

  /**
   * Execute all agents in parallel and collect results
   * @param {Object} data - Input data for agents
   * @returns {Promise<Object>} Aggregated agent results
   */
  async executeAgents(data) {
    const startTime = Date.now();
    console.log('🚀 Agent coordinator starting execution...');

    try {
      console.log('⚡ Executing agents in parallel...');
      const results = await this.executeParallel(data);

      const executionTime = Date.now() - startTime;
      console.log(`✅ All agents completed in ${executionTime}ms`);

      return {
        agentResults: results,
        metadata: {
          executionTime,
          parallel: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Agent coordination failed:', error);
      throw new Error(`Agent coordination failed: ${error.message}`);
    }
  }

  /**
   * Execute agents in parallel
   * @param {Object} data - Input data
   * @returns {Promise<Object>} Agent results
   */
  async executeParallel(data) {
    const agentPromises = Object.entries(this.agents).map(([name, agent]) =>
      this.executeAgent(name, agent, data),
    );

    const results = await Promise.allSettled(agentPromises);

    const agentResults = {};
    results.forEach((result, index) => {
      const agentName = Object.keys(this.agents)[index];

      if (result.status === 'fulfilled') {
        agentResults[agentName] = result.value;
      } else {
        console.error(`Agent ${agentName} failed:`, result.reason);
        agentResults[agentName] = this.getFailureResponse(agentName, result.reason);
      }
    });

    return agentResults;
  }

  /**
   * Execute single agent
   * @param {string} name - Agent name
   * @param {Object} agent - Agent instance
   * @param {Object} data - Input data
   * @returns {Promise<Object>} Agent result
   */
  async executeAgent(name, agent, data) {
    console.log(`🚀 Starting ${name} agent execution`);

    const startTime = Date.now();
    try {
      const result = await agent.analyze(data);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Agent ${name} completed successfully in ${executionTime}ms`);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.log(`❌ Agent ${name} failed after ${executionTime}ms:`, error.message);

      throw error;
    }
  }

  /**
   * Generate failure response for failed agent
   * @param {string} agentName - Name of failed agent
   * @param {Error} error - Error that occurred
   * @returns {Object} Failure response
   */
  getFailureResponse(agentName, error) {
    return {
      agent: agentName.toUpperCase(),
      assessment: `Unable to complete assessment due to technical issues: ${error.message}`,
      score: 0.5,
      highlights: [],
      concerns: ['Assessment could not be completed'],
      recommendations: ['Please check the system and try again'],
      error: true,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default AgentCoordinator;
