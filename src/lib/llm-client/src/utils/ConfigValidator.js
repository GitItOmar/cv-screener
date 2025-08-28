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

    if (this.errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      // Configuration warnings exist but are not logged
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
        apiKey: process.env.OPENAI_API_KEY,
      },
      deepseek: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY,
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
