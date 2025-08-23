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
   * Create parser instance
   */
  constructor() {
    if (this.constructor === BaseParser) {
      throw new Error('BaseParser is abstract and cannot be instantiated directly');
    }
    // All configurations are hardcoded for CV screening
  }

  /**
   * Parse file content - MUST be implemented by subclasses
   * @param {ArrayBuffer|Buffer|File} input - File to parse
   * @returns {Promise<Object>} Parse result
   * @abstract
   */
  async parse() {
    throw new Error(`parse() method must be implemented by ${this.constructor.name}`);
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
      validation: additionalData.validation || { valid: true, errors: [], warnings: [] },
    };
  }

  /**
   * Create error result object
   * @param {Error} error - Error that occurred
   * @param {Object} additionalData - Additional error data
   * @returns {Object} Error result
   */
  createErrorResult(error) {
    return {
      success: false,
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR',
      parser: this.constructor.parserName,
      details: error.details || {},
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
