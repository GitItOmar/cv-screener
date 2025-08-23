import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { DeepSeekProvider } from './providers/DeepSeekProvider.js';
import { CostCalculator } from './utils/CostCalculator.js';
import { ConfigValidator } from './utils/ConfigValidator.js';

/**
 * Main LLM Client orchestrator
 * Provides a unified interface to multiple LLM providers
 */
export class LLMClient {
  constructor(config = {}) {
    this.validateConfig(config);

    this.config = {
      provider: 'openai',
      model: 'gpt-4o',
      timeout: 30000,
      costTracking: true,
      logging: true,
      ...config,
    };

    this.provider = null;
    this.costCalculator = new CostCalculator();
    this.initialized = false;
    this.requestCount = 0;
  }

  /**
   * Initialize the client with the configured provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.provider = this.createProvider(this.config.provider, this.config);
    await this.provider.initialize(this.config);
    this.initialized = true;
    // Logging removed
  }

  /**
   * Create a provider instance
   * @param {string} providerName - Provider name ('openai' or 'deepseek')
   * @param {Object} config - Provider configuration
   * @returns {BaseProvider} Provider instance
   */
  createProvider(providerName, config) {
    const providers = {
      openai: OpenAIProvider,
      deepseek: DeepSeekProvider,
    };

    const ProviderClass = providers[providerName.toLowerCase()];
    if (!ProviderClass) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    return new ProviderClass(config);
  }

  /**
   * Complete a chat conversation
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Completion response
   */
  async complete(messages, options = {}) {
    await this.ensureInitialized();

    const requestOptions = {
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      responseFormat: 'json_object', // Always JSON
      ...options,
    };

    try {
      this.requestCount++;

      // Logging removed

      const startTime = Date.now();
      const response = await this.provider.chat(messages, requestOptions);
      const duration = Date.now() - startTime;

      if (this.config.costTracking && response.usage) {
        this.costCalculator.addUsage({
          provider: this.config.provider,
          model: this.config.model,
          usage: response.usage,
          timestamp: new Date(),
          duration,
        });
      }

      // Logging removed

      return response;
    } catch (error) {
      const parsedError = this.provider.parseError(error);

      // Logging removed

      throw parsedError;
    }
  }

  /**
   * Stream a chat completion
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {AsyncGenerator<Object>} Stream of response chunks
   */
  async *stream(messages, options = {}) {
    await this.ensureInitialized();
    await this.rateLimiter.waitForToken();

    if (!this.provider.supportsCapability('streaming')) {
      throw new Error(`Provider ${this.config.provider} does not support streaming`);
    }

    const requestOptions = {
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      responseFormat: 'json_object', // Always JSON
      ...options,
    };

    try {
      this.requestCount++;

      // Logging removed

      yield* this.provider.stream(messages, requestOptions);
    } catch (error) {
      const parsedError = this.provider.parseError(error);

      // Logging removed

      throw parsedError;
    }
  }

  /**
   * Test connection to the current provider
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    await this.ensureInitialized();
    return await this.provider.testConnection();
  }

  /**
   * Switch to a different provider
   * @param {Object} config - New provider configuration
   * @returns {Promise<void>}
   */
  async switchProvider(config) {
    this.validateConfig(config);

    this.config = { ...this.config, ...config };

    this.provider = this.createProvider(this.config.provider, this.config);
    await this.provider.initialize(this.config);
  }

  /**
   * Get cost tracking information
   * @returns {Object} Cost and usage statistics
   */
  getCostTracking() {
    if (!this.config.costTracking) {
      throw new Error('Cost tracking is disabled');
    }

    return {
      ...this.costCalculator.getStats(),
      requestCount: this.requestCount,
      currentProvider: this.config.provider,
      currentModel: this.config.model,
    };
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking() {
    this.costCalculator.reset();
    this.requestCount = 0;

    // Logging removed
  }

  /**
   * Get client configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? '[REDACTED]' : undefined,
    };
  }

  /**
   * Get provider information
   * @returns {Object} Provider information
   */
  async getProviderInfo() {
    await this.ensureInitialized();
    return this.provider.getInfo();
  }

  /**
   * Get available providers
   * @returns {Array<string>} List of available provider names
   */
  static getAvailableProviders() {
    return ['openai', 'deepseek'];
  }

  /**
   * Create a client with specific provider
   * @param {string} provider - Provider name
   * @param {Object} config - Configuration
   * @returns {LLMClient} New client instance
   */
  static create(provider, config = {}) {
    return new LLMClient({ provider, ...config });
  }

  /**
   * Ensure client is initialized
   * @private
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Validate client configuration
   * @param {Object} config - Configuration to validate
   * @private
   */
  validateConfig(config) {
    const validator = new ConfigValidator();
    validator.validate(config);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.rateLimiter) {
      this.rateLimiter.destroy();
    }

    if (this.retryHandler) {
      this.retryHandler.destroy();
    }

    this.initialized = false;
    this.provider = null;

    // Logging removed
  }
}
