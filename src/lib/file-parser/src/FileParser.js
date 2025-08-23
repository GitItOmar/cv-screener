/**
 * Main FileParser class providing a unified API for parsing different file types
 * Serves as the primary entry point for all file parsing operations
 */

import ParserFactory from './parsers/parserFactory.js';
import { ValidationError, createParserError } from './utils/errors.js';

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
   * Hardcoded configuration for resume processing
   * @type {Object}
   */
  static config = {
    maxFileSize: 1024 * 1024, // 1MB for resumes
    timeout: 45000, // 45 seconds
    extractMetadata: true,
    enableRecovery: true,
    retryAttempts: 2,
    allowPartialRecovery: true,
    enableProgressReporting: false,
    strictValidation: false,
    validateInput: true,
    pdf: {
      maxPages: 50, // Reasonable limit for resumes
      cleanText: true,
      normalizeText: true,
      preserveStructure: false,
      extractImages: false,
    },
    docx: {
      preserveFormatting: false, // Focus on text content for LLM processing
      includeHeaders: true,
      includeFooters: false,
      convertTables: true,
      ignoreEmptyParagraphs: true,
    },
  };

  /**
   * Create a new FileParser instance
   * @param {Object} options - Optional configuration overrides
   */
  constructor(options = {}) {
    this.config = { ...FileParser.config, ...options };
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
   * @returns {Promise<Object>} Parse result
   */
  async parse(input, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...this.config, ...options };

    // Basic input validation
    this._validateInput(input);

    try {
      // Use ParserFactory for the actual parsing
      const result = await ParserFactory.parseFile(input, {
        parserOptions: mergedOptions,
        factoryOptions: {
          validateInput: mergedOptions.validateInput,
          strictValidation: mergedOptions.strictValidation,
        },
        includeFileInfo: true,
      });

      const processingTime = Date.now() - startTime;
      this._updateStats(processingTime, true);

      return {
        success: true,
        data: result.data || {},
        parser: result.parser,
        processingTime,
        file: {
          name: this._getFilename(input),
          size: this._getFileSize(input),
          type: result.fileInfo?.mimeType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateStats(processingTime, false);

      const parserError = createParserError(error, {
        operation: 'parse',
        filename: this._getFilename(input),
        fileSize: this._getFileSize(input),
        processingTime,
      });

      throw parserError;
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
}
