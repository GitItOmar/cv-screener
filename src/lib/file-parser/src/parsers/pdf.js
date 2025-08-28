/**
 * PDF parser implementation using pdf2json
 * Handles PDF text extraction with structure preservation and metadata extraction
 */

import PDF2JsonParser from 'pdf2json';
import BaseParser from './base.js';
import { ParseError, UnsupportedFormatError } from '../utils/errors.js';

/**
 * PDF parser class for extracting text and metadata from PDF files
 */
export default class PDFParser extends BaseParser {
  static parserName = 'pdf';
  static supportedTypes = ['application/pdf'];
  static extensions = ['.pdf'];

  /**
   * Parse PDF file and extract text content
   * @param {ArrayBuffer|Buffer|File} input - PDF file data
   * @returns {Promise<Object>} Parsed content and metadata
   */
  async parse(input) {
    try {
      // Convert input to Buffer
      let buffer;
      if (input instanceof File) {
        buffer = Buffer.from(await input.arrayBuffer());
      } else if (input instanceof ArrayBuffer) {
        buffer = Buffer.from(input);
      } else if (Buffer.isBuffer(input)) {
        buffer = input;
      } else {
        throw new ParseError('Invalid input type for PDF parsing');
      }

      // Create PDF parser instance
      const pdfParser = new PDF2JsonParser(this, 1);

      // Parse PDF with promise wrapper
      const textContent = await this._parseWithPDFParser(pdfParser, buffer);

      // Build result object
      const result = {
        text: textContent,
      };

      return result;
    } catch (error) {
      if (error.message?.includes('Password')) {
        throw new UnsupportedFormatError('PDF is password protected and cannot be parsed', {
          encrypted: true,
          parser: 'pdf',
        });
      }

      if (error.message?.includes('Invalid PDF')) {
        throw new ParseError('Invalid or corrupted PDF file', {
          parser: 'pdf',
          originalError: error.message,
        });
      }

      throw new ParseError(`PDF parsing failed: ${error.message}`, {
        parser: 'pdf',
        originalError: error.message,
      });
    }
  }

  /**
   * Parse PDF using pdf2json with promise wrapper
   * @param {PDFParser} parser - PDF parser instance
   * @param {Buffer} buffer - PDF buffer
   * @returns {Promise<Object>} Parsed PDF data
   * @private
   */
  async _parseWithPDFParser(parser, buffer) {
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Set up event handlers
      parser.on('pdfParser_dataReady', () => {
        if (!resolved) {
          resolved = true;
          resolve(parser.getRawTextContent());
        }
      });

      parser.on('pdfParser_dataError', (error) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(error.parserError || 'PDF parsing error'));
        }
      });

      // Handle timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`PDF parsing timed out after 45000ms`));
        }
      }, 45000); // Hardcoded timeout

      // Start parsing
      try {
        parser.parseBuffer(buffer);
      } catch (error) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      }
    });
  }
}
