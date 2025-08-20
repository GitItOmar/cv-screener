/**
 * Base parser class defining the interface for all file parsers
 */

import {
  ValidationError,
  TimeoutError,
  createParserError,
  ErrorRecovery,
  ErrorUtils,
} from '../utils/errors.js';
import { validateFile } from '../utils/fileType.js';
import defaultConfig from '../config/defaults.js';

// Node.js globals
const { setTimeout, clearTimeout } = globalThis;

/**
 * Abstract base class for all file parsers
 * Defines the contract that all concrete parsers must implement
 */
export default class BaseParser {
  /**
   * Parser name - must be overridden by subclasses
   * @type {string}
   */
  static parserName = 'base';

  /**
   * Supported MIME types - must be overridden by subclasses
   * @type {string[]}
   */
  static supportedTypes = [];

  /**
   * Supported file extensions - must be overridden by subclasses
   * @type {string[]}
   */
  static extensions = [];

  /**
   * Default parser options - can be overridden by subclasses
   * @type {Object}
   */
  static defaultOptions = {};

  /**
   * Create parser instance
   * @param {Object} options - Parser configuration options
   */
  constructor(options = {}) {
    if (this.constructor === BaseParser) {
      throw new Error('BaseParser is abstract and cannot be instantiated directly');
    }

    this.config = this._mergeConfig(options);
    this.stats = {
      filesProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      errors: 0,
      successes: 0,
    };
  }

  /**
   * Parse file content - MUST be implemented by subclasses
   * @param {ArrayBuffer|Buffer|File} input - File to parse
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parse result
   * @abstract
   */
  async parse() {
    throw new Error(`parse() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Validate file before parsing - can be overridden by subclasses
   * @param {ArrayBuffer|Buffer|File} input - File to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validate(input, options = {}) {
    const validationOptions = {
      maxSize: this.config.maxFileSize,
      allowedTypes: this.constructor.supportedTypes,
      checkMagicNumbers: this.config.validation.checkMagicNumbers,
      ...options,
    };

    return validateFile(input, validationOptions);
  }

  /**
   * Extract metadata from file - can be overridden by subclasses
   * @param {ArrayBuffer|Buffer|File} input - File to extract metadata from
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Metadata object
   */
  async extractMetadata(input) {
    // Default implementation returns basic info
    const metadata = { size: 0, filename: '' };

    if (input instanceof File) {
      metadata.size = input.size;
      metadata.filename = input.name;
    } else if (input instanceof ArrayBuffer) {
      metadata.size = input.byteLength;
    } else if (Buffer.isBuffer(input)) {
      metadata.size = input.length;
    }

    return {
      size: metadata.size,
      filename: metadata.filename,
      parser: this.constructor.parserName,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Main parsing workflow with validation, progress reporting, and error handling
   * @param {ArrayBuffer|Buffer|File} input - File to parse
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Complete parse result
   */
  async parseWithValidation(input, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...this.config, ...options };
    const progressCallback = mergedOptions.onProgress;

    // Create error context for better debugging
    const errorContext = {
      parser: this.constructor.parserName,
      filename: input instanceof File ? input.name : 'unknown',
      fileSize: input instanceof File ? input.size : input.byteLength || input.length,
      operation: 'parseWithValidation',
      options: mergedOptions,
      startTime,
    };

    try {
      // Initialize progress reporting
      if (progressCallback && typeof progressCallback === 'function') {
        progressCallback(0, 'Starting validation');
      }

      // Step 1: Validate input
      const validation = await this.validate(input, mergedOptions);
      if (!validation.valid) {
        throw new ValidationError(`File validation failed: ${validation.errors.join(', ')}`, {
          parser: this.constructor.parserName,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
        });
      }

      if (progressCallback) {
        progressCallback(20, 'Validation complete');
      }

      // Step 2: Extract metadata if requested
      let metadata = {};
      if (mergedOptions.extractMetadata !== false) {
        metadata = await this.extractMetadata(input, mergedOptions);
        if (progressCallback) {
          progressCallback(40, 'Metadata extracted');
        }
      }

      // Step 3: Parse content with error recovery
      let parseResult;
      const recoveryEnabled =
        mergedOptions.enableRecovery !== false &&
        this.config.errorHandling?.enableRecovery !== false;

      if (recoveryEnabled) {
        parseResult = await this._parseWithRecovery(input, mergedOptions, progressCallback);
      } else {
        parseResult = await this._parseWithTimeout(input, mergedOptions);
      }

      if (progressCallback) {
        progressCallback(80, 'Content parsed');
      }

      // Step 4: Create final result
      const processingTime = Date.now() - startTime;
      const result = this.createResult(parseResult, {
        metadata,
        validation,
        processingTime,
        parser: this.constructor.parserName,
      });

      if (progressCallback) {
        progressCallback(100, 'Complete');
      }

      // Update statistics
      this._updateStats(processingTime, true);

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateStats(processingTime, false);

      // Create detailed error context
      const enhancedContext = ErrorUtils.createErrorContext(error, errorContext);

      // Convert to appropriate parser error with enhanced context
      const parserError = createParserError(error, {
        parser: this.constructor.parserName,
        filename: errorContext.filename,
        fileSize: errorContext.fileSize,
        processingTime,
        enhancedContext,
      });

      throw parserError;
    }
  }

  /**
   * Parse with error recovery strategies
   * @param {ArrayBuffer|Buffer|File} input - File to parse
   * @param {Object} options - Parsing options
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<Object>} Parse result
   * @private
   */
  async _parseWithRecovery(input, options, progressCallback) {
    const errorConfig = this.config.errorHandling || {};

    const retryOptions = {
      maxAttempts: options.retryAttempts || errorConfig.retryAttempts || 2,
      baseDelay: options.retryDelay || errorConfig.retryDelay || 1000,
      retryCondition: (error) => ErrorUtils.isTransientError(error),
      onRetry: (error, attempt, maxAttempts) => {
        if (progressCallback) {
          progressCallback(
            60 + (attempt / maxAttempts) * 20,
            `Retry attempt ${attempt}/${maxAttempts - 1} after error: ${error.message.substring(0, 50)}...`,
          );
        }
      },
    };

    // Try with retry strategy first
    try {
      return await ErrorRecovery.retry(() => this._parseWithTimeout(input, options), retryOptions);
    } catch (error) {
      // If retry fails and partial recovery is enabled, try to extract what we can
      const allowPartial =
        options.allowPartialRecovery !== false && errorConfig.allowPartialRecovery !== false;

      if (allowPartial) {
        return await ErrorRecovery.partialRecovery(
          () => {
            throw error;
          }, // Re-throw the error
          () => this._attemptPartialExtraction(input, options),
          {
            allowPartial: true,
            partialThreshold: options.partialThreshold || errorConfig.partialThreshold || 0.1,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Attempt to extract partial content from corrupted files
   * @param {ArrayBuffer|Buffer|File} input - File input
   * @param {Object} options - Options
   * @returns {Promise<Object>} Partial extraction result
   * @private
   */
  async _attemptPartialExtraction() {
    // Default implementation - subclasses should override for format-specific partial extraction
    throw new Error('Partial extraction not implemented for this parser');
  }

  /**
   * Create standardized result object
   * @param {string|Object} textOrResult - Parsed text or result object
   * @param {Object} additionalData - Additional result data
   * @returns {Object} Standardized result
   */
  createResult(textOrResult, additionalData = {}) {
    // Handle both string text and complex result objects
    const text = typeof textOrResult === 'string' ? textOrResult : textOrResult.text || '';
    const data = typeof textOrResult === 'object' ? textOrResult : {};

    const statistics = this._calculateTextStatistics(text);

    return {
      success: true,
      data: {
        text,
        ...data,
        metadata: {
          ...additionalData.metadata,
          format: this.constructor.parserName,
        },
        statistics,
      },
      parser: this.constructor.parserName,
      processingTime: additionalData.processingTime || 0,
      validation: additionalData.validation || { valid: true, errors: [], warnings: [] },
    };
  }

  /**
   * Create error result object
   * @param {Error} error - Error that occurred
   * @param {Object} additionalData - Additional error data
   * @returns {Object} Error result
   */
  createErrorResult(error, additionalData = {}) {
    return {
      success: false,
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR',
      parser: this.constructor.parserName,
      processingTime: additionalData.processingTime || 0,
      details: error.details || {},
    };
  }

  /**
   * Get parser statistics
   * @returns {Object} Parser statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset parser statistics
   */
  resetStats() {
    this.stats = {
      filesProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      errors: 0,
      successes: 0,
    };
  }

  /**
   * Check if parser supports given MIME type
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Whether type is supported
   */
  static supportsType(mimeType) {
    return this.supportedTypes.includes(mimeType);
  }

  /**
   * Check if parser supports given file extension
   * @param {string} extension - File extension to check
   * @returns {boolean} Whether extension is supported
   */
  static supportsExtension(extension) {
    const normalizedExt = extension.toLowerCase();
    return this.extensions.includes(normalizedExt);
  }

  /**
   * Parse with timeout protection
   * @private
   */
  async _parseWithTimeout(input, options) {
    const timeout = options.timeout || this.config.timeout;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new TimeoutError(`Parsing timed out after ${timeout}ms`, {
            timeout,
            parser: this.constructor.parserName,
          }),
        );
      }, timeout);

      this.parse(input, options)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Merge configuration with defaults
   * @private
   */
  _mergeConfig(options) {
    return {
      ...defaultConfig,
      ...this.constructor.defaultOptions,
      ...options,
    };
  }

  /**
   * Update parser statistics
   * @private
   */
  _updateStats(processingTime, success) {
    this.stats.filesProcessed += 1;
    this.stats.totalProcessingTime += processingTime;
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.filesProcessed;

    if (success) {
      this.stats.successes += 1;
    } else {
      this.stats.errors += 1;
    }
  }

  /**
   * Calculate text statistics
   * @private
   */
  _calculateTextStatistics(text) {
    if (typeof text !== 'string') {
      return {
        characters: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
        sentences: 0,
      };
    }

    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;

    return {
      characters,
      words,
      lines,
      paragraphs,
      sentences,
    };
  }
}
