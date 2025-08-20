/**
 * Parser factory for automatic file type detection and parser selection
 * Provides unified interface for parsing different file types
 */

import { detectFileType, validateFile } from '../utils/fileType.js';
import { UnsupportedFormatError, ValidationError } from '../utils/errors.js';
import PDFParser from './pdf.js';
import DOCXParser from './docx.js';
import { SUPPORTED_TYPES } from '../utils/fileType.js';

/**
 * Registry of available parsers by type
 */
const PARSER_REGISTRY = {
  pdf: PDFParser,
  docx: DOCXParser,
  test: null, // Used for testing only
};

/**
 * Parser factory class for automatic file type detection and parser selection
 */
export default class ParserFactory {
  /**
   * Detect file type and create appropriate parser
   * @param {ArrayBuffer|Buffer|File} input - File input
   * @param {Object} options - Factory options
   * @returns {Promise<Object>} Parser instance and file info
   */
  static async createParser(input, options = {}) {
    const {
      allowedTypes = null, // Restrict to specific types
      validateInput = true, // Validate input before creating parser
      strictValidation = false, // Require high-confidence detection
    } = options;

    try {
      // Detect file type
      const fileInfo = await detectFileType(input);

      // Validate confidence level
      if (strictValidation && fileInfo.confidence === 'low') {
        throw new UnsupportedFormatError(
          `File type detection confidence too low: ${fileInfo.confidence}`,
          {
            detectedType: fileInfo.mimeType,
            confidence: fileInfo.confidence,
            method: fileInfo.method,
          },
        );
      }

      // Check if type is allowed
      if (allowedTypes && !allowedTypes.includes(fileInfo.mimeType)) {
        throw new UnsupportedFormatError(`File type ${fileInfo.mimeType} is not allowed`, {
          detectedType: fileInfo.mimeType,
          allowedTypes,
        });
      }

      // Validate input if requested
      if (validateInput) {
        const validationResult = await validateFile(input, {
          allowedTypes: allowedTypes ? allowedTypes : [fileInfo.mimeType],
        });

        if (!validationResult.valid) {
          // Safely handle validation errors that might be null or contain null values
          const safeErrors = (validationResult.errors || []).filter((error) => error != null);
          const errorMessage =
            safeErrors.length > 0 ? safeErrors.join(', ') : 'File validation failed';

          throw new ValidationError(`File validation failed: ${errorMessage}`, {
            validationErrors: safeErrors,
            validationWarnings: validationResult.warnings || [],
          });
        }
      }

      // Get parser class
      const ParserClass = PARSER_REGISTRY[fileInfo.parser];
      if (!ParserClass) {
        throw new UnsupportedFormatError(`No parser available for type: ${fileInfo.parser}`, {
          detectedType: fileInfo.mimeType,
          parser: fileInfo.parser,
          availableParsers: Object.keys(PARSER_REGISTRY).filter((p) => PARSER_REGISTRY[p]),
        });
      }

      // Create parser instance
      const parser = new ParserClass();

      return {
        parser,
        fileInfo,
        parserType: fileInfo.parser,
      };
    } catch (error) {
      if (error instanceof UnsupportedFormatError || error instanceof ValidationError) {
        throw error;
      }

      throw new UnsupportedFormatError(`Failed to create parser: ${error.message}`, {
        originalError: error.message,
      });
    }
  }

  /**
   * Parse file with automatic type detection
   * @param {ArrayBuffer|Buffer|File} input - File input
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parse result with file info
   */
  static async parseFile(input, options = {}) {
    const { parserOptions = {}, factoryOptions = {}, includeFileInfo = true } = options;

    // Create appropriate parser
    const { parser, fileInfo, parserType } = await this.createParser(input, factoryOptions);

    // Parse the file
    const result = await parser.parseWithValidation(input, parserOptions);

    // Add file type information to result
    if (includeFileInfo) {
      result.fileInfo = {
        ...fileInfo,
        parserUsed: parserType,
      };
    }

    return result;
  }

  /**
   * Get parser for specific file type
   * @param {string} mimeType - MIME type
   * @returns {Class|null} Parser class or null
   */
  static getParserForType(mimeType) {
    // Find the parser type for this MIME type
    const fileTypeConfig = SUPPORTED_TYPES[mimeType];

    if (!fileTypeConfig) {
      return null;
    }

    return PARSER_REGISTRY[fileTypeConfig.parser] || null;
  }

  /**
   * Check if file type is supported
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Whether type is supported
   */
  static isSupported(mimeType) {
    const parser = this.getParserForType(mimeType);
    return parser !== null;
  }

  /**
   * Get list of supported file types
   * @returns {Array} Array of supported MIME types
   */
  static getSupportedTypes() {
    return Object.keys(SUPPORTED_TYPES).filter((mimeType) => {
      const config = SUPPORTED_TYPES[mimeType];
      return config && !config.isTestType && PARSER_REGISTRY[config.parser] !== null;
    });
  }

  /**
   * Get parser information
   * @returns {Object} Parser registry information
   */
  static getParserInfo() {
    const info = {};

    Object.keys(PARSER_REGISTRY).forEach((parserType) => {
      const ParserClass = PARSER_REGISTRY[parserType];
      if (ParserClass) {
        info[parserType] = {
          name: ParserClass.parserName,
          supportedTypes: ParserClass.supportedTypes,
          extensions: ParserClass.extensions,
          available: true,
        };
      } else {
        info[parserType] = {
          name: parserType,
          available: false,
        };
      }
    });

    return info;
  }

  /**
   * Register a new parser
   * @param {string} parserType - Parser type identifier
   * @param {Class} ParserClass - Parser class
   */
  static registerParser(parserType, ParserClass) {
    if (!ParserClass || typeof ParserClass !== 'function') {
      throw new Error('Parser must be a valid class constructor');
    }

    // Validate parser has required static properties
    if (!ParserClass.parserName || !ParserClass.supportedTypes) {
      throw new Error('Parser class must have parserName and supportedTypes static properties');
    }

    PARSER_REGISTRY[parserType] = ParserClass;
  }

  /**
   * Unregister a parser
   * @param {string} parserType - Parser type identifier
   */
  static unregisterParser(parserType) {
    delete PARSER_REGISTRY[parserType];
  }

  /**
   * Detect file type without creating parser
   * @param {ArrayBuffer|Buffer|File} input - File input
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} File type information
   */
  static async detectFileType(input, options = {}) {
    return detectFileType(input, options);
  }

  /**
   * Validate file without parsing
   * @param {ArrayBuffer|Buffer|File} input - File input
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  static async validateFile(input, options = {}) {
    return validateFile(input, options);
  }

  /**
   * Batch process multiple files
   * @param {Array} files - Array of file inputs
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of results
   */
  static async batchProcess(files, options = {}) {
    const {
      concurrency = 3, // Process files concurrently
      stopOnError = false, // Continue processing on individual errors
      progressCallback = null,
      ...processingOptions
    } = options;

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Process files in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;

        try {
          const result = await this.parseFile(file, processingOptions);
          processedCount++;

          if (progressCallback) {
            progressCallback(processedCount, files.length, fileIndex, null);
          }

          return { index: fileIndex, result, error: null };
        } catch (error) {
          processedCount++;
          const errorInfo = { index: fileIndex, result: null, error };

          if (progressCallback) {
            progressCallback(processedCount, files.length, fileIndex, error);
          }

          if (stopOnError) {
            throw error;
          }

          return errorInfo;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result) => {
        if (result.error) {
          errors.push(result);
        }
        results.push(result);
      });
    }

    // Sort results by original index
    results.sort((a, b) => a.index - b.index);

    return {
      results: results.map((r) => r.result),
      errors,
      totalProcessed: processedCount,
      successCount: results.filter((r) => !r.error).length,
      errorCount: errors.length,
    };
  }
}

// Import SUPPORTED_TYPES for internal use
