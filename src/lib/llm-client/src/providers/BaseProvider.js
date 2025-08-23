/**
 * Abstract base class for LLM providers
 * Defines the standard interface that all providers must implement
 */
export class BaseProvider {
  constructor(config = {}) {
    if (new.target === BaseProvider) {
      throw new TypeError('BaseProvider is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.name = this.constructor.name;
    this.capabilities = new Set();
  }

  /**
   * Initialize the provider with configuration
   * @param {Object} _config - Provider configuration
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async initialize(_config = {}) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Test connection to the provider
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Complete a chat conversation
   * @param {Array<Object>} _messages - Array of message objects with role and content
   * @param {Object} _options - Request options (temperature, maxTokens, etc.)
   * @returns {Promise<Object>} Standard response format
   */
  // eslint-disable-next-line no-unused-vars
  async chat(_messages, _options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Complete a single prompt
   * @param {string} _prompt - The prompt text
   * @param {Object} _options - Request options
   * @returns {Promise<Object>} Standard response format
   */
  // eslint-disable-next-line no-unused-vars
  async complete(_prompt, _options = {}) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Stream a chat completion
   * @param {Array<Object>} _messages - Array of message objects
   * @param {Object} _options - Request options
   * @returns {AsyncGenerator<Object>} Stream of response chunks
   */
  // eslint-disable-next-line no-unused-vars
  async *stream(_messages, _options = {}) {
    // This yield will never be reached, but satisfies linter requirement for generators
    yield;
    throw new Error('stream() must be implemented by subclass');
  }

  /**
   * Get supported models for this provider
   * @returns {Array<string>} List of supported model names
   */
  getSupportedModels() {
    throw new Error('getSupportedModels() must be implemented by subclass');
  }

  /**
   * Get provider capabilities
   * @returns {Set<string>} Set of capability strings
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    if (!config.model) {
      throw new Error('Model is required');
    }

    return true;
  }

  /**
   * Calculate cost for a request
   * @param {Object} _usage - Token usage information
   * @param {string} _model - Model used
   * @returns {number} Cost in USD
   */
  // eslint-disable-next-line no-unused-vars
  calculateCost(_usage, _model) {
    throw new Error('calculateCost() must be implemented by subclass');
  }

  /**
   * Parse provider-specific error
   * @param {Error} error - Original error
   * @returns {Object} Standardized error object
   */
  parseError(error) {
    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      provider: this.name,
      retryable: false,
      statusCode: null,
      originalError: error,
    };
  }

  /**
   * Transform request parameters to provider format
   * @param {Object} params - Standard parameters
   * @returns {Object} Provider-specific parameters
   */
  transformRequest(params) {
    return params;
  }

  /**
   * Transform provider response to standard format
   * @param {Object} response - Provider response
   * @returns {Object} Standard response format
   */
  transformResponse(response) {
    return {
      content: response.content || '',
      finishReason: response.finish_reason || 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model || this.config.model,
      provider: this.name,
      timestamp: new Date().toISOString(),
      metadata: response.metadata || {},
    };
  }

  /**
   * Check if provider supports a specific capability
   * @param {string} capability - Capability to check
   * @returns {boolean} True if supported
   */
  supportsCapability(capability) {
    return this.capabilities.has(capability);
  }

  /**
   * Add a capability to this provider
   * @param {string} capability - Capability to add
   */
  addCapability(capability) {
    this.capabilities.add(capability);
  }

  /**
   * Get provider information
   * @returns {Object} Provider information
   */
  getInfo() {
    return {
      name: this.name,
      capabilities: Array.from(this.capabilities),
      supportedModels: this.getSupportedModels(),
      config: {
        model: this.config.model,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
      },
    };
  }
}

/**
 * Standard response format that all providers should return
 * @typedef {Object} StandardResponse
 * @property {string} content - The generated content
 * @property {string} finishReason - Reason for completion (stop, length, error)
 * @property {Object} usage - Token usage information
 * @property {number} usage.promptTokens - Tokens used in prompt
 * @property {number} usage.completionTokens - Tokens used in completion
 * @property {number} usage.totalTokens - Total tokens used
 * @property {string} model - Model used for generation
 * @property {string} provider - Provider name
 * @property {string} timestamp - ISO timestamp of completion
 * @property {Object} metadata - Additional provider-specific metadata
 */

/**
 * Standard error format
 * @typedef {Object} StandardError
 * @property {string} type - Error type (RATE_LIMIT_EXCEEDED, INSUFFICIENT_QUOTA, etc.)
 * @property {string} message - Human-readable error message
 * @property {string} provider - Provider that generated the error
 * @property {boolean} retryable - Whether the request can be retried
 * @property {number|null} statusCode - HTTP status code if applicable
 * @property {Error} originalError - Original error object
 */

/**
 * Provider capabilities
 */
export const CAPABILITIES = {
  CHAT: 'chat',
  COMPLETION: 'completion',
  STREAMING: 'streaming',
  JSON_MODE: 'json_mode',
  FUNCTION_CALLING: 'function_calling',
  VISION: 'vision',
  EMBEDDINGS: 'embeddings',
};

/**
 * Standard error types
 */
export const ERROR_TYPES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_QUOTA: 'INSUFFICIENT_QUOTA',
  INVALID_API_KEY: 'INVALID_API_KEY',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  CONTENT_FILTERED: 'CONTENT_FILTERED',
  CONTEXT_LENGTH_EXCEEDED: 'CONTEXT_LENGTH_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};
