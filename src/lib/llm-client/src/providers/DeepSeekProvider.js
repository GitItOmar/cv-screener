import OpenAI from 'openai';
import { BaseProvider, CAPABILITIES, ERROR_TYPES } from './BaseProvider.js';

/**
 * DeepSeek provider implementation
 * Supports DeepSeek v3 models via OpenAI-compatible API
 */
export class DeepSeekProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.supportedModels = ['deepseek-chat', 'deepseek-coder'];

    // Add capabilities
    this.addCapability(CAPABILITIES.CHAT);
    this.addCapability(CAPABILITIES.COMPLETION);
    this.addCapability(CAPABILITIES.STREAMING);
    this.addCapability(CAPABILITIES.JSON_MODE);
  }

  /**
   * Initialize the DeepSeek provider
   * @param {Object} config - Configuration
   */
  async initialize(config = {}) {
    this.validateConfig(config);

    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    });

    this.config = { ...this.config, ...config };
  }

  /**
   * Test connection to DeepSeek API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      // Test with a minimal request
      await this.client.chat.completions.create({
        model: this.config.model || 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Complete a chat conversation
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Standard response format
   */
  async chat(messages, options = {}) {
    const params = this.transformRequest({
      model: this.config.model || 'deepseek-chat',
      messages,
      ...options,
    });

    try {
      const response = await this.client.chat.completions.create(params);
      return this.transformResponse(response);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Complete a single prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Standard response format
   */
  async complete(prompt, options = {}) {
    const messages = [{ role: 'user', content: prompt }];
    return this.chat(messages, options);
  }

  /**
   * Stream a chat completion
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {AsyncGenerator<Object>} Stream of response chunks
   */
  async *stream(messages, options = {}) {
    const params = this.transformRequest({
      model: this.config.model || 'deepseek-chat',
      messages,
      stream: true,
      ...options,
    });

    try {
      const stream = await this.client.chat.completions.create(params);

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          yield {
            content: choice.delta.content,
            finishReason: choice.finish_reason,
            delta: true,
          };
        }

        if (choice?.finish_reason) {
          yield {
            content: '',
            finishReason: choice.finish_reason,
            delta: false,
            usage: chunk.usage,
          };
        }
      }
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get supported models
   * @returns {Array<string>} List of supported model names
   */
  getSupportedModels() {
    return [...this.supportedModels];
  }

  /**
   * Calculate cost for DeepSeek usage
   * @param {Object} usage - Token usage information
   * @param {string} model - Model used
   * @returns {number} Cost in USD
   */
  calculateCost(usage, model) {
    // DeepSeek pricing as of January 2024 (per 1M tokens)
    const pricing = {
      'deepseek-chat': { input: 0.14, output: 0.28 },
      'deepseek-coder': { input: 0.14, output: 0.28 },
    };

    const modelPricing = pricing[model];
    if (!modelPricing) {
      return 0; // Unknown model, can't calculate cost
    }

    const inputCost = (usage.promptTokens / 1000000) * modelPricing.input;
    const outputCost = (usage.completionTokens / 1000000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Parse DeepSeek-specific errors (using OpenAI SDK error format)
   * @param {Error} error - Original error
   * @returns {Object} Standardized error object
   */
  parseError(error) {
    const baseError = super.parseError(error);

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status;
      let errorType = ERROR_TYPES.UNKNOWN_ERROR;
      let retryable = false;

      switch (statusCode) {
        case 400:
          errorType = ERROR_TYPES.VALIDATION_ERROR;
          break;
        case 401:
          errorType = ERROR_TYPES.INVALID_API_KEY;
          break;
        case 429:
          errorType = ERROR_TYPES.RATE_LIMIT_EXCEEDED;
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = ERROR_TYPES.NETWORK_ERROR;
          retryable = true;
          break;
        default:
          break;
      }

      // Check specific error messages
      const message = error.message.toLowerCase();
      if (
        message.includes('insufficient_quota') ||
        message.includes('exceeded your current quota')
      ) {
        errorType = ERROR_TYPES.INSUFFICIENT_QUOTA;
        retryable = false;
      } else if (
        message.includes('context_length_exceeded') ||
        message.includes('maximum context length')
      ) {
        errorType = ERROR_TYPES.CONTEXT_LENGTH_EXCEEDED;
        retryable = false;
      } else if (message.includes('content_filter') || message.includes('content policy')) {
        errorType = ERROR_TYPES.CONTENT_FILTERED;
        retryable = false;
      } else if (message.includes('model_not_found') || message.includes('does not exist')) {
        errorType = ERROR_TYPES.MODEL_NOT_FOUND;
        retryable = false;
      }

      return {
        ...baseError,
        type: errorType,
        retryable,
        statusCode,
      };
    }

    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      return {
        ...baseError,
        type: ERROR_TYPES.TIMEOUT_ERROR,
        retryable: true,
      };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        ...baseError,
        type: ERROR_TYPES.NETWORK_ERROR,
        retryable: true,
      };
    }

    return baseError;
  }

  /**
   * Transform request parameters to DeepSeek format
   * @param {Object} params - Standard parameters
   * @returns {Object} DeepSeek-specific parameters
   */
  transformRequest(params) {
    const deepSeekParams = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stop: params.stop,
      stream: params.stream,
    };

    // Always use JSON response format
    deepSeekParams.response_format = { type: 'json_object' };

    // Remove undefined values
    Object.keys(deepSeekParams).forEach((key) => {
      if (deepSeekParams[key] === undefined) {
        delete deepSeekParams[key];
      }
    });

    return deepSeekParams;
  }

  /**
   * Transform DeepSeek response to standard format
   * @param {Object} response - DeepSeek response (same format as OpenAI)
   * @returns {Object} Standard response format
   */
  transformResponse(response) {
    const choice = response.choices[0];
    const message = choice.message;

    return {
      content: message.content || '',
      finishReason: choice.finish_reason || 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      provider: this.name,
      timestamp: new Date().toISOString(),
      metadata: {
        id: response.id,
        object: response.object,
        created: response.created,
        systemFingerprint: response.system_fingerprint,
      },
    };
  }

  /**
   * Validate DeepSeek-specific configuration
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    super.validateConfig(config);

    if (config.model && !this.supportedModels.includes(config.model)) {
      throw new Error(`Unsupported DeepSeek model: ${config.model}`);
    }

    if (config.temperature !== undefined) {
      if (
        typeof config.temperature !== 'number' ||
        config.temperature < 0 ||
        config.temperature > 2
      ) {
        throw new Error('Temperature must be a number between 0 and 2');
      }
    }

    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number' || config.maxTokens < 1) {
        throw new Error('Max tokens must be a positive number');
      }
    }
  }
}
