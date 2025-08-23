import OpenAI from 'openai';
import { BaseProvider, CAPABILITIES, ERROR_TYPES } from './BaseProvider.js';

/**
 * OpenAI provider implementation
 * Supports GPT-4o, GPT-3.5-turbo, and GPT-4-turbo models
 */
export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.supportedModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];

    // Add capabilities
    this.addCapability(CAPABILITIES.CHAT);
    this.addCapability(CAPABILITIES.COMPLETION);
    this.addCapability(CAPABILITIES.STREAMING);
    this.addCapability(CAPABILITIES.JSON_MODE);
    this.addCapability(CAPABILITIES.FUNCTION_CALLING);
    this.addCapability(CAPABILITIES.VISION);
  }

  /**
   * Initialize the OpenAI provider
   * @param {Object} config - Configuration
   */
  async initialize(config = {}) {
    this.validateConfig(config);

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });

    this.config = { ...this.config, ...config };
  }

  /**
   * Test connection to OpenAI API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.client.models.list();
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
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      frequencyPenalty: this.config.frequencyPenalty,
      presencePenalty: this.config.presencePenalty,
      ...options, // Options override config defaults
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
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      frequencyPenalty: this.config.frequencyPenalty,
      presencePenalty: this.config.presencePenalty,
      stream: true,
      ...options, // Options override config defaults
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
   * Calculate cost for OpenAI usage
   * @param {Object} usage - Token usage information
   * @param {string} model - Model used
   * @returns {number} Cost in USD
   */
  calculateCost(usage, model) {
    // OpenAI pricing as of January 2024 (per 1M tokens)
    const pricing = {
      'gpt-4o': { input: 5.0, output: 15.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'gpt-3.5-turbo-16k': { input: 3.0, output: 4.0 },
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
   * Parse OpenAI-specific errors
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
   * Transform request parameters to OpenAI format
   * @param {Object} params - Standard parameters
   * @returns {Object} OpenAI-specific parameters
   */
  transformRequest(params) {
    const openAIParams = {
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

    // Add seed for deterministic responses if provided
    if (params.seed !== undefined) {
      openAIParams.seed = params.seed;
    }

    // Use JSON response format if specified, otherwise use default JSON mode
    if (params.response_format) {
      openAIParams.response_format = params.response_format;
    } else {
      // Default to JSON mode for backwards compatibility
      openAIParams.response_format = { type: 'json_object' };
    }

    // Handle function calling
    if (params.functions) {
      openAIParams.functions = params.functions;
      if (params.functionCall) {
        openAIParams.function_call = params.functionCall;
      }
    }

    // Handle tools (newer function calling format)
    if (params.tools) {
      openAIParams.tools = params.tools;
      if (params.toolChoice) {
        openAIParams.tool_choice = params.toolChoice;
      }
    }

    // Remove undefined values
    Object.keys(openAIParams).forEach((key) => {
      if (openAIParams[key] === undefined) {
        delete openAIParams[key];
      }
    });

    return openAIParams;
  }

  /**
   * Transform OpenAI response to standard format
   * @param {Object} response - OpenAI response
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
        functionCall: message.function_call,
        toolCalls: message.tool_calls,
      },
    };
  }

  /**
   * Validate OpenAI-specific configuration
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    super.validateConfig(config);

    if (config.model && !this.supportedModels.includes(config.model)) {
      throw new Error(`Unsupported OpenAI model: ${config.model}`);
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
