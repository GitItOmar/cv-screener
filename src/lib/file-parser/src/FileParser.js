/**
 * Main FileParser class providing a unified API for parsing different file types
 * Serves as the primary entry point for all file parsing operations
 */

import ParserFactory from './parsers/parserFactory.js';
import { ValidationError, ConfigurationError, createParserError } from './utils/errors.js';
import defaultConfig from './config/defaults.js';

/**
 * Main FileParser class - unified interface for all file parsing operations
 */
export default class FileParser {
  /**
   * Supported file formats
   * @type {string[]}
   */
  static supportedFormats = ['pdf', 'docx'];

  /**
   * Default parsing options
   * @type {Object}
   */
  static defaultOptions = {
    // File processing options
    maxFileSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000, // 30 seconds
    extractMetadata: true,

    // Error handling options
    enableRecovery: true,
    retryAttempts: 2,
    allowPartialRecovery: true,

    // Progress reporting
    onProgress: null,
    enableProgressReporting: true,

    // Parser-specific options
    pdf: {
      maxPages: 100,
      preserveStructure: true,
      extractImages: false,
      cleanText: true,
      normalizeText: true,
    },

    docx: {
      preserveFormatting: true,
      includeHeaders: true,
      includeFooters: false,
      convertTables: true,
      ignoreEmptyParagraphs: false,
    },

    // Validation options
    strictValidation: false,
    allowedTypes: null, // null means all supported types
    validateInput: true,
  };

  /**
   * Create a new FileParser instance
   * @param {Object} options - Global configuration options
   */
  constructor(options = {}) {
    // Validate configuration options
    this._validateConfig(options);

    this.config = this._mergeConfig(options);
    this.stats = {
      totalParsed: 0,
      successCount: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
    };
  }

  /**
   * Parse a single file with automatic type detection
   * @param {File|ArrayBuffer|Buffer} input - File to parse
   * @param {Object} options - Parsing options (overrides instance config)
   * @returns {Promise<Object>} Comprehensive parse result
   */
  async parse(input, options = {}) {
    const startTime = Date.now();
    const mergedOptions = this._mergeOptions(options);

    // Validate inputs
    this._validateInput(input);
    this._validateOptions(mergedOptions);

    // Set up progress reporting
    const progressReporter = this._createProgressReporter(mergedOptions);
    const parsingOptions = {
      ...mergedOptions,
      onProgress: progressReporter.update,
    };

    try {
      progressReporter.start();

      // Use ParserFactory for the actual parsing
      const result = await ParserFactory.parseFile(input, {
        parserOptions: parsingOptions,
        factoryOptions: {
          allowedTypes: mergedOptions.allowedTypes,
          validateInput: mergedOptions.validateInput,
          strictValidation: mergedOptions.strictValidation,
        },
        includeFileInfo: true,
      });

      // Create comprehensive result structure
      const processingTime = Date.now() - startTime;
      const comprehensiveResult = this._createComprehensiveResult(result, {
        processingTime,
        options: mergedOptions,
        input,
      });

      // Update statistics
      this._updateStats(processingTime, true);

      progressReporter.complete(comprehensiveResult);
      return comprehensiveResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateStats(processingTime, false);

      // Always call progress error callback, even if we didn't start successfully
      progressReporter.error(error);

      // Convert to user-friendly error with context
      const parserError = createParserError(error, {
        operation: 'parse',
        filename: this._getFilename(input),
        fileSize: this._getFileSize(input),
        processingTime,
        options: this._sanitizeOptionsForError(mergedOptions),
      });

      throw parserError;
    }
  }

  /**
   * Parse multiple files concurrently
   * @param {Array} files - Array of files to parse
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Batch processing results
   */
  async parseMultiple(files, options = {}) {
    const mergedOptions = this._mergeOptions(options);
    const batchOptions = {
      concurrency: mergedOptions.concurrency || 3,
      stopOnError: mergedOptions.stopOnError || false,
      progressCallback: mergedOptions.onBatchProgress || null,
      ...mergedOptions,
    };

    // Validate inputs
    if (!Array.isArray(files) || files.length === 0) {
      throw new ValidationError('Files must be a non-empty array');
    }

    files.forEach((file, index) => {
      try {
        this._validateInput(file);
      } catch (error) {
        throw new ValidationError(`Invalid file at index ${index}: ${error.message}`);
      }
    });

    const startTime = Date.now();

    try {
      const result = await ParserFactory.batchProcess(files, batchOptions);

      const processingTime = Date.now() - startTime;
      const comprehensiveResult = {
        success: true,
        results: result.results,
        summary: {
          total: files.length,
          successful: result.successCount,
          failed: result.errorCount,
          processingTime,
          averageTimePerFile: processingTime / files.length,
        },
        errors: result.errors,
        metadata: {
          concurrency: batchOptions.concurrency,
          stopOnError: batchOptions.stopOnError,
          timestamp: new Date().toISOString(),
        },
      };

      // Update stats for each file
      result.results.forEach((fileResult) => {
        this._updateStats(fileResult?.processingTime || 0, !fileResult?.error);
      });

      return comprehensiveResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const parserError = createParserError(error, {
        operation: 'parseMultiple',
        fileCount: files.length,
        processingTime,
      });

      throw parserError;
    }
  }

  /**
   * Get detailed information about a file without parsing it
   * @param {File|ArrayBuffer|Buffer} input - File to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(input, options = {}) {
    this._validateInput(input);
    const mergedOptions = this._mergeOptions(options);

    try {
      const fileInfo = await ParserFactory.detectFileType(input);
      const validation = await ParserFactory.validateFile(input, {
        allowedTypes: mergedOptions.allowedTypes,
        maxSize: mergedOptions.maxFileSize,
      });

      return {
        success: true,
        fileInfo: {
          ...fileInfo,
          filename: this._getFilename(input),
          size: this._getFileSize(input),
          sizeFormatted: this._formatFileSize(this._getFileSize(input)),
        },
        validation,
        supported: ParserFactory.isSupported(fileInfo.mimeType),
        parser: fileInfo.parser,
        confidence: fileInfo.confidence,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw createParserError(error, {
        operation: 'getFileInfo',
        filename: this._getFilename(input),
      });
    }
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics about parsing operations
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalParsed > 0
          ? Math.round((this.stats.successCount / this.stats.totalParsed) * 100)
          : 0,
      errorRate:
        this.stats.totalParsed > 0
          ? Math.round((this.stats.errorCount / this.stats.totalParsed) * 100)
          : 0,
    };
  }

  /**
   * Reset parser statistics
   */
  resetStats() {
    this.stats = {
      totalParsed: 0,
      successCount: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
    };
  }

  /**
   * Get list of supported file formats
   * @returns {Array} Array of supported format information
   */
  static getSupportedFormats() {
    return ParserFactory.getSupportedTypes().map((mimeType) => {
      const parserInfo = ParserFactory.getParserInfo();
      const config = Object.values(parserInfo).find((info) =>
        info.supportedTypes?.includes(mimeType),
      );

      return {
        mimeType,
        extensions: config?.extensions || [],
        parserName: config?.name || 'unknown',
        available: config?.available || false,
      };
    });
  }

  /**
   * Check if a file type is supported
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Whether the type is supported
   */
  static isSupported(mimeType) {
    return ParserFactory.isSupported(mimeType);
  }

  /**
   * Create a configured parser instance for specific use cases
   * @param {Object} options - Configuration options
   * @returns {FileParser} Configured parser instance
   */
  static createInstance(options = {}) {
    return new FileParser(options);
  }

  // Private methods

  /**
   * Validate input file
   * @param {*} input - Input to validate
   * @private
   */
  _validateInput(input) {
    if (!input) {
      throw new ValidationError('Input file is required');
    }

    // Check if input is valid type
    const isValidType =
      input instanceof File || input instanceof ArrayBuffer || Buffer.isBuffer?.(input);

    if (!isValidType) {
      throw new ValidationError('Input must be a File, ArrayBuffer, or Buffer object');
    }

    // Check file size
    const fileSize = this._getFileSize(input);
    if (fileSize > this.config.maxFileSize) {
      throw new ValidationError(
        `File size ${this._formatFileSize(fileSize)} exceeds maximum allowed size ${this._formatFileSize(this.config.maxFileSize)}`,
      );
    }
  }

  /**
   * Validate configuration options during construction
   * @param {Object} options - Configuration options to validate
   * @private
   */
  _validateConfig(options) {
    // Validate timeout
    if (
      options.timeout !== undefined &&
      (typeof options.timeout !== 'number' || options.timeout <= 0)
    ) {
      throw new ConfigurationError('Timeout must be a positive number');
    }

    // Validate maxFileSize
    if (
      options.maxFileSize !== undefined &&
      (typeof options.maxFileSize !== 'number' || options.maxFileSize <= 0)
    ) {
      throw new ConfigurationError('MaxFileSize must be a positive number');
    }

    // Validate retryAttempts
    if (
      options.retryAttempts !== undefined &&
      (typeof options.retryAttempts !== 'number' || options.retryAttempts < 0)
    ) {
      throw new ConfigurationError('RetryAttempts must be a non-negative number');
    }

    // Validate allowedTypes
    if (
      options.allowedTypes !== undefined &&
      options.allowedTypes !== null &&
      !Array.isArray(options.allowedTypes)
    ) {
      throw new ConfigurationError('AllowedTypes must be an array or null');
    }

    // Validate progress callback
    if (options.onProgress !== undefined && typeof options.onProgress !== 'function') {
      throw new ConfigurationError('OnProgress must be a function');
    }

    // Validate boolean options
    const booleanOptions = [
      'extractMetadata',
      'enableRecovery',
      'allowPartialRecovery',
      'strictValidation',
      'validateInput',
      'enableProgressReporting',
    ];
    booleanOptions.forEach((option) => {
      if (options[option] !== undefined && typeof options[option] !== 'boolean') {
        throw new ConfigurationError(`${option} must be a boolean`);
      }
    });
  }

  /**
   * Validate parsing options
   * @param {Object} options - Options to validate
   * @private
   */
  _validateOptions(options) {
    // Validate timeout
    if (options.timeout && (typeof options.timeout !== 'number' || options.timeout <= 0)) {
      throw new ConfigurationError('Timeout must be a positive number');
    }

    // Validate maxFileSize
    if (
      options.maxFileSize &&
      (typeof options.maxFileSize !== 'number' || options.maxFileSize <= 0)
    ) {
      throw new ConfigurationError('MaxFileSize must be a positive number');
    }

    // Validate retryAttempts
    if (
      options.retryAttempts &&
      (typeof options.retryAttempts !== 'number' || options.retryAttempts < 0)
    ) {
      throw new ConfigurationError('RetryAttempts must be a non-negative number');
    }

    // Validate allowedTypes
    if (options.allowedTypes && !Array.isArray(options.allowedTypes)) {
      throw new ConfigurationError('AllowedTypes must be an array');
    }

    // Validate progress callback
    if (options.onProgress && typeof options.onProgress !== 'function') {
      throw new ConfigurationError('OnProgress must be a function');
    }
  }

  /**
   * Merge instance config with provided options
   * @param {Object} options - Options to merge
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeOptions(options) {
    return {
      ...this.config,
      ...options,
      // Deep merge for nested objects
      pdf: { ...this.config.pdf, ...options.pdf },
      docx: { ...this.config.docx, ...options.docx },
    };
  }

  /**
   * Merge default config with provided options
   * @param {Object} options - Options to merge
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeConfig(options) {
    return {
      ...defaultConfig,
      ...FileParser.defaultOptions,
      ...options,
      // Deep merge for nested objects
      pdf: { ...defaultConfig.pdf, ...FileParser.defaultOptions.pdf, ...options.pdf },
      docx: { ...defaultConfig.docx, ...FileParser.defaultOptions.docx, ...options.docx },
    };
  }

  /**
   * Create progress reporter
   * @param {Object} options - Options containing progress callback
   * @returns {Object} Progress reporter with methods
   * @private
   */
  _createProgressReporter(options) {
    if (!options.enableProgressReporting || !options.onProgress) {
      // Return no-op progress reporter
      return {
        start: () => {},
        update: () => {},
        complete: () => {},
        error: () => {},
      };
    }

    // Use the callback directly without wrapping it in createProgressFunction
    const callback = options.onProgress;

    return {
      start: () => callback(0, 'Starting file parsing'),
      update: (percentage, message) => callback(percentage, message),
      complete: (result) => callback(100, 'Parsing completed', result),
      error: (error) => callback(-1, `Error: ${error.message}`, { error }),
    };
  }

  /**
   * Create comprehensive result structure
   * @param {Object} parserResult - Result from parser
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Comprehensive result
   * @private
   */
  _createComprehensiveResult(parserResult, metadata) {
    const { processingTime, options, input } = metadata;

    return {
      // Core result data
      success: true,
      data: parserResult.data || {},

      // Parsing metadata
      parser: parserResult.parser,
      processingTime,

      // File information
      file: {
        name: this._getFilename(input),
        size: this._getFileSize(input),
        sizeFormatted: this._formatFileSize(this._getFileSize(input)),
        type: parserResult.fileInfo?.mimeType,
        parser: parserResult.parser,
      },

      // Quality indicators
      quality: {
        confidence: parserResult.fileInfo?.confidence || 'high',
        warnings: parserResult.warnings || [],
        partial: parserResult.partial || false,
        recovered: Boolean(parserResult.warnings?.some((w) => w.type === 'partial_recovery')),
      },

      // Performance metrics
      performance: {
        processingTime,
        processingTimeFormatted: this._formatDuration(processingTime),
        memoryUsage: process.memoryUsage?.() || null,
      },

      // Validation results
      validation: parserResult.validation || { valid: true, errors: [], warnings: [] },

      // Configuration used
      config: {
        parser: parserResult.parser,
        extractMetadata: options.extractMetadata,
        enableRecovery: options.enableRecovery,
        retryAttempts: options.retryAttempts,
      },

      // Timestamp
      timestamp: new Date().toISOString(),

      // Version info
      version: '1.0.0',
    };
  }

  /**
   * Update parser statistics
   * @param {number} processingTime - Time taken for processing
   * @param {boolean} success - Whether parsing was successful
   * @private
   */
  _updateStats(processingTime, success) {
    this.stats.totalParsed += 1;
    this.stats.totalProcessingTime += processingTime;
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.totalParsed;

    if (success) {
      this.stats.successCount += 1;
    } else {
      this.stats.errorCount += 1;
    }
  }

  /**
   * Get filename from input
   * @param {*} input - File input
   * @returns {string} Filename or default
   * @private
   */
  _getFilename(input) {
    return input instanceof File ? input.name : 'unknown';
  }

  /**
   * Get file size from input
   * @param {*} input - File input
   * @returns {number} File size in bytes
   * @private
   */
  _getFileSize(input) {
    if (input instanceof File) return input.size;
    if (input instanceof ArrayBuffer) return input.byteLength;
    if (Buffer.isBuffer?.(input)) return input.length;
    return 0;
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   * @private
   */
  _formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${Math.round(size * 10) / 10}${units[unitIndex]}`;
  }

  /**
   * Format duration for display
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   * @private
   */
  _formatDuration(milliseconds) {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 100) / 10}s`;
    return `${Math.round(milliseconds / 6000) / 10}m`;
  }

  /**
   * Sanitize options for error reporting
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   * @private
   */
  _sanitizeOptionsForError(options) {
    const sanitized = { ...options };

    // Remove functions and sensitive data
    delete sanitized.onProgress;
    delete sanitized.onBatchProgress;

    return sanitized;
  }
}
