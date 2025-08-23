/**
 * Configuration validation utility
 * Validates LLM client configuration with detailed error messages
 */
export class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate complete configuration
   * @param {Object} config - Configuration to validate
   * @throws {Error} If validation fails
   */
  validate(config) {
    this.errors = [];
    this.warnings = [];

    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be a non-null object');
    }

    this.validateProvider(config);
    this.validateModel(config);
    this.validateApiKey(config);
    this.validateOptionalFields(config);

    if (this.errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      console.warn(`Configuration warnings:\n${this.warnings.join('\n')}`);
    }

    return true;
  }

  /**
   * Validate provider configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateProvider(config) {
    if (!config.provider) {
      this.errors.push('Provider is required');
      return;
    }

    if (typeof config.provider !== 'string') {
      this.errors.push('Provider must be a string');
      return;
    }

    const supportedProviders = ['openai', 'deepseek'];
    if (!supportedProviders.includes(config.provider.toLowerCase())) {
      this.errors.push(
        `Unsupported provider: ${config.provider}. Supported providers: ${supportedProviders.join(', ')}`,
      );
    }
  }

  /**
   * Validate model configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateModel(config) {
    if (!config.model) {
      this.errors.push('Model is required');
      return;
    }

    if (typeof config.model !== 'string') {
      this.errors.push('Model must be a string');
      return;
    }

    // Provider-specific model validation
    if (config.provider) {
      this.validateModelForProvider(config.model, config.provider);
    }
  }

  /**
   * Validate model for specific provider
   * @param {string} model - Model name
   * @param {string} provider - Provider name
   * @private
   */
  validateModelForProvider(model, provider) {
    const supportedModels = {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
      deepseek: ['deepseek-chat', 'deepseek-coder'],
    };

    const models = supportedModels[provider.toLowerCase()];
    if (models && !models.includes(model)) {
      this.errors.push(
        `Unsupported model '${model}' for provider '${provider}'. Supported models: ${models.join(', ')}`,
      );
    }
  }

  /**
   * Validate API key configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateApiKey(config) {
    if (!config.apiKey) {
      this.errors.push('API key is required');
      return;
    }

    if (typeof config.apiKey !== 'string') {
      this.errors.push('API key must be a string');
      return;
    }

    if (config.apiKey.trim().length === 0) {
      this.errors.push('API key cannot be empty');
      return;
    }

    // Provider-specific API key validation
    if (config.provider) {
      this.validateApiKeyForProvider(config.apiKey, config.provider);
    }
  }

  /**
   * Validate API key format for specific provider
   * @param {string} apiKey - API key
   * @param {string} provider - Provider name
   * @private
   */
  validateApiKeyForProvider(apiKey, provider) {
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48,}$/,
      deepseek: /^sk-[a-zA-Z0-9]{32,}$/,
    };

    const pattern = patterns[provider.toLowerCase()];
    if (pattern && !pattern.test(apiKey)) {
      this.warnings.push(
        `API key format may be invalid for provider '${provider}'. Expected pattern: ${pattern}`,
      );
    }
  }

  /**
   * Validate optional configuration fields
   * @param {Object} config - Configuration object
   * @private
   */
  validateOptionalFields(config) {
    this.validateTimeout(config);
    this.validateTemperature(config);
    this.validateMaxTokens(config);
    this.validateBooleanFields(config);
  }

  /**
   * Validate timeout configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateTimeout(config) {
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number') {
        this.errors.push('Timeout must be a number');
        return;
      }

      if (config.timeout <= 0) {
        this.errors.push('Timeout must be greater than 0');
        return;
      }

      if (config.timeout > 300000) {
        // 5 minutes
        this.warnings.push('Timeout is very high (>5 minutes), this may cause issues');
      }

      if (config.timeout < 1000) {
        // 1 second
        this.warnings.push('Timeout is very low (<1 second), requests may fail frequently');
      }
    }
  }

  /**
   * Validate temperature configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateTemperature(config) {
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number') {
        this.errors.push('Temperature must be a number');
        return;
      }

      if (config.temperature < 0 || config.temperature > 2) {
        this.errors.push('Temperature must be between 0 and 2');
        return;
      }
    }
  }

  /**
   * Validate max tokens configuration
   * @param {Object} config - Configuration object
   * @private
   */
  validateMaxTokens(config) {
    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number') {
        this.errors.push('Max tokens must be a number');
        return;
      }

      if (!Number.isInteger(config.maxTokens)) {
        this.errors.push('Max tokens must be an integer');
        return;
      }

      if (config.maxTokens <= 0) {
        this.errors.push('Max tokens must be greater than 0');
        return;
      }

      // Model-specific token limits
      if (config.model) {
        this.validateTokenLimitForModel(config.maxTokens, config.model);
      }
    }
  }

  /**
   * Validate token limits for specific models
   * @param {number} maxTokens - Max tokens configuration
   * @param {string} model - Model name
   * @private
   */
  validateTokenLimitForModel(maxTokens, model) {
    const modelLimits = {
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
      'deepseek-chat': 32768,
      'deepseek-coder': 32768,
    };

    const limit = modelLimits[model];
    if (limit && maxTokens > limit) {
      this.warnings.push(`Max tokens (${maxTokens}) exceeds model limit for '${model}' (${limit})`);
    }
  }

  /**
   * Validate boolean configuration fields
   * @param {Object} config - Configuration object
   * @private
   */
  validateBooleanFields(config) {
    const booleanFields = ['costTracking', 'logging'];

    for (const field of booleanFields) {
      if (config[field] !== undefined && typeof config[field] !== 'boolean') {
        this.errors.push(`${field} must be a boolean`);
      }
    }
  }

  /**
   * Validate configuration against environment
   * @param {Object} config - Configuration object
   * @param {Object} env - Environment variables
   * @returns {Object} Validated configuration with environment variables
   */
  validateWithEnvironment(config, env = process.env) {
    const validatedConfig = { ...config };

    // Auto-fill API key from environment if not provided
    if (!validatedConfig.apiKey) {
      const envKeys = {
        openai: 'OPENAI_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
      };

      const envKey = envKeys[validatedConfig.provider?.toLowerCase()];
      if (envKey && env[envKey]) {
        validatedConfig.apiKey = env[envKey];
      }
    }

    // Validate the updated configuration
    this.validate(validatedConfig);

    return validatedConfig;
  }

  /**
   * Get validation summary
   * @returns {Object} Validation results
   */
  getSummary() {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
    };
  }

  /**
   * Clear validation results
   */
  clear() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Create a configuration template
   * @param {string} provider - Provider name
   * @returns {Object} Configuration template
   */
  static createTemplate(provider = 'openai') {
    const templates = {
      openai: {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 30000,
        costTracking: true,
        logging: true,
      },
      deepseek: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 60000,
        costTracking: true,
        logging: true,
      },
    };

    return templates[provider.toLowerCase()] || templates.openai;
  }

  /**
   * Validate multiple configurations
   * @param {Array<Object>} configs - Array of configurations
   * @returns {Array<Object>} Validation results for each config
   */
  validateMultiple(configs) {
    if (!Array.isArray(configs)) {
      throw new Error('Configs must be an array');
    }

    return configs.map((config, index) => {
      try {
        this.validate(config);
        return {
          index,
          valid: true,
          config,
          errors: [],
          warnings: [...this.warnings],
        };
      } catch (error) {
        return {
          index,
          valid: false,
          config,
          errors: [...this.errors],
          warnings: [...this.warnings],
          error: error.message,
        };
      }
    });
  }
}
