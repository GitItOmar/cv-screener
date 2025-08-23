/**
 * Main FileParser class providing a unified API for parsing different file types
 * Serves as the primary entry point for all file parsing operations
 */

import ParserFactory from './parsers/parserFactory.js';
import { createParserError } from './utils/errors.js';

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
   * Create a new FileParser instance
   */
  constructor() {
    // All configurations are hardcoded for CV screening
  }

  /**
   * Parse a single file with automatic type detection
   * @param {File|ArrayBuffer|Buffer} input - File to parse
   * @returns {Promise<Object>} Parse result
   */
  async parse(input) {
    try {
      // Use ParserFactory for the actual parsing (no options needed)
      const result = await ParserFactory.parseFile(input);

      return {
        success: true,
        text: result.text,
      };
    } catch (error) {
      const parserError = createParserError(error, {
        operation: 'parse',
      });

      throw parserError;
    }
  }
}
