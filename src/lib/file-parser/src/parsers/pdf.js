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

  static defaultOptions = {
    preserveWhitespace: true,
    preserveLineBreaks: true,
    extractImages: false,
    extractForms: true,
    timeout: 30000, // 30 seconds timeout for PDF parsing
    maxPages: 100, // Maximum pages to process
    normalizeText: true, // Normalize Unicode text
    extractMetadata: true,
    verbosity: 0, // PDF parser verbosity level
  };

  /**
   * Parse PDF file and extract text content
   * @param {ArrayBuffer|Buffer|File} input - PDF file data
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parsed content and metadata
   */
  async parse(input, options = {}) {
    const mergedOptions = { ...this.config, ...options };
    const progressCallback = mergedOptions.onProgress;

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

      if (progressCallback) {
        progressCallback(10, 'Initializing PDF parser');
      }

      // Create PDF parser instance
      const pdfParser = new PDF2JsonParser(null, mergedOptions.verbosity);

      if (progressCallback) {
        progressCallback(20, 'Loading PDF document');
      }

      // Parse PDF with promise wrapper
      const pdfData = await this._parseWithPDFParser(pdfParser, buffer);

      if (progressCallback) {
        progressCallback(60, 'Extracting text content');
      }

      // Extract text content
      const textContent = this._extractTextContent(pdfData, mergedOptions);

      if (progressCallback) {
        progressCallback(80, 'Processing metadata');
      }

      // Extract metadata
      const metadata = this._extractPDFMetadata(pdfData);

      if (progressCallback) {
        progressCallback(90, 'Finalizing results');
      }

      // Build result object
      const result = {
        text: textContent.text,
        pages: textContent.pages,
        pageCount: pdfData.Pages?.length || 0,
        metadata,
        structure: textContent.structure,
        forms: mergedOptions.extractForms ? this._extractFormFields(pdfData) : null,
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
   * Extract enhanced metadata from PDF file
   * @param {ArrayBuffer|Buffer|File} input - PDF file data
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Enhanced metadata
   */
  async extractMetadata(input, options = {}) {
    const baseMetadata = await super.extractMetadata(input, options);

    try {
      // Quick metadata extraction without full parsing
      const buffer =
        input instanceof File
          ? Buffer.from(await input.arrayBuffer())
          : input instanceof ArrayBuffer
            ? Buffer.from(input)
            : input;

      const pdfParser = new PDF2JsonParser();
      const pdfData = await this._parseWithPDFParser(pdfParser, buffer);
      const pdfMetadata = this._extractPDFMetadata(pdfData);

      return {
        ...baseMetadata,
        ...pdfMetadata,
        pages: pdfData.Pages?.length || 0,
        encrypted: false, // If we got here, it's not encrypted
      };
    } catch (error) {
      // Return basic metadata if PDF-specific extraction fails
      return {
        ...baseMetadata,
        encrypted: error.message?.includes('Password') || false,
        error: `Metadata extraction failed: ${error.message}`,
      };
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
      parser.on('pdfParser_dataReady', (pdfData) => {
        if (!resolved) {
          resolved = true;
          resolve(pdfData);
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
          reject(new Error(`PDF parsing timed out after ${this.config.timeout}ms`));
        }
      }, this.config.timeout);

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

  /**
   * Extract text content with structure preservation
   * @param {Object} pdfData - Parsed PDF data from pdf2json
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted text content with structure
   * @private
   */
  _extractTextContent(pdfData, options) {
    const pages = [];
    let fullText = '';
    const structure = {
      paragraphs: [],
      headings: [],
      lists: [],
    };

    if (!pdfData.Pages || !Array.isArray(pdfData.Pages)) {
      return {
        text: '',
        pages: [],
        structure,
      };
    }

    // Process each page
    pdfData.Pages.forEach((page, pageIndex) => {
      if (pageIndex >= options.maxPages) {
        return; // Skip pages beyond limit
      }

      const pageText = this._extractPageText(page, options);
      pages.push({
        pageNumber: pageIndex + 1,
        text: pageText.text,
        structure: pageText.structure,
      });

      // Add to full text with page separator
      if (pageText.text.trim()) {
        if (fullText) {
          fullText += '\n\n';
        }
        fullText += pageText.text;
      }

      // Merge page structure into document structure
      this._mergeStructure(structure, pageText.structure);
    });

    return {
      text: options.normalizeText ? this._normalizeText(fullText) : fullText,
      pages,
      structure,
    };
  }

  /**
   * Extract text from a single PDF page
   * @param {Object} page - PDF page data
   * @param {Object} options - Extraction options
   * @returns {Object} Page text and structure
   * @private
   */
  _extractPageText(page, options) {
    if (!page.Texts || !Array.isArray(page.Texts)) {
      return {
        text: '',
        structure: { paragraphs: [], headings: [], lists: [] },
      };
    }

    const textBlocks = [];
    const structure = {
      paragraphs: [],
      headings: [],
      lists: [],
    };

    // Sort text elements by position (top to bottom, left to right)
    const sortedTexts = page.Texts.sort((a, b) => {
      const yDiff = b.y - a.y; // Note: PDF coordinates are inverted
      if (Math.abs(yDiff) < 0.5) {
        return a.x - b.x; // Same line, sort by x position
      }
      return yDiff;
    });

    let currentLine = '';
    let lastY = null;
    const lineHeight = this._estimateLineHeight(sortedTexts);

    sortedTexts.forEach((textItem) => {
      if (!textItem.R || !Array.isArray(textItem.R)) {
        return;
      }

      // Check if we're on a new line
      const isNewLine = lastY !== null && Math.abs(textItem.y - lastY) > lineHeight * 0.5;

      if (isNewLine && currentLine.trim()) {
        textBlocks.push(currentLine.trim());
        currentLine = '';
      }

      // Extract text from runs
      textItem.R.forEach((run) => {
        if (run.T) {
          const decodedText = decodeURIComponent(run.T);

          // Add space if needed
          if (currentLine && !currentLine.endsWith(' ') && !decodedText.startsWith(' ')) {
            currentLine += ' ';
          }

          currentLine += decodedText;
        }
      });

      lastY = textItem.y;
    });

    // Add final line
    if (currentLine.trim()) {
      textBlocks.push(currentLine.trim());
    }

    // Combine blocks into paragraphs and detect structure
    const text = this._combineTextBlocks(textBlocks, structure, options);

    return {
      text,
      structure,
    };
  }

  /**
   * Combine text blocks into coherent text with structure detection
   * @param {string[]} textBlocks - Array of text blocks
   * @param {Object} structure - Structure object to populate
   * @param {Object} options - Processing options
   * @returns {string} Combined text
   * @private
   */
  _combineTextBlocks(textBlocks, structure) {
    let result = '';
    let currentParagraph = '';

    textBlocks.forEach((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      // Detect headings (simple heuristic: short lines, often capitalized)
      if (this._isLikelyHeading(trimmedBlock)) {
        // Finish current paragraph
        if (currentParagraph.trim()) {
          structure.paragraphs.push(currentParagraph.trim());
          result += `${currentParagraph.trim()}\n\n`;
          currentParagraph = '';
        }

        // Add heading
        structure.headings.push(trimmedBlock);
        result += `${trimmedBlock}\n`;
        return;
      }

      // Detect list items
      if (this._isLikelyListItem(trimmedBlock)) {
        // Finish current paragraph
        if (currentParagraph.trim()) {
          structure.paragraphs.push(currentParagraph.trim());
          result += `${currentParagraph.trim()}\n\n`;
          currentParagraph = '';
        }

        // Add list item
        structure.lists.push(trimmedBlock);
        result += `${trimmedBlock}\n`;
        return;
      }

      // Regular text - add to current paragraph
      if (currentParagraph) {
        // Check if this continues the same sentence
        if (this._shouldContinueSameLine(currentParagraph, trimmedBlock)) {
          currentParagraph += ` ${trimmedBlock}`;
        } else {
          // New paragraph
          structure.paragraphs.push(currentParagraph.trim());
          result += `${currentParagraph.trim()}\n\n`;
          currentParagraph = trimmedBlock;
        }
      } else {
        currentParagraph = trimmedBlock;
      }
    });

    // Add final paragraph
    if (currentParagraph.trim()) {
      structure.paragraphs.push(currentParagraph.trim());
      result += currentParagraph.trim();
    }

    return result;
  }

  /**
   * Extract PDF metadata (author, title, creation date, etc.)
   * @param {Object} pdfData - Parsed PDF data
   * @param {Object} options - Extraction options
   * @returns {Object} PDF metadata
   * @private
   */
  _extractPDFMetadata(pdfData) {
    const metadata = {
      title: '',
      author: '',
      subject: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      pageCount: 0,
      pdfVersion: '',
    };

    // Extract basic page count
    if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
      metadata.pageCount = pdfData.Pages.length;
    }

    // Extract document info if available
    if (pdfData.Meta) {
      const meta = pdfData.Meta;

      // Map common metadata fields
      metadata.title = this._cleanMetadataValue(meta.PDFFormatVersion) || '';
      metadata.author = this._cleanMetadataValue(meta.Author) || '';
      metadata.subject = this._cleanMetadataValue(meta.Subject) || '';
      metadata.creator = this._cleanMetadataValue(meta.Creator) || '';
      metadata.producer = this._cleanMetadataValue(meta.Producer) || '';
      metadata.pdfVersion = this._cleanMetadataValue(meta.PDFFormatVersion) || '';

      // Parse dates
      if (meta.CreationDate) {
        metadata.creationDate = this._parsePDFDate(meta.CreationDate);
      }

      if (meta.ModDate) {
        metadata.modificationDate = this._parsePDFDate(meta.ModDate);
      }
    }

    return metadata;
  }

  /**
   * Extract form fields from PDF
   * @param {Object} pdfData - Parsed PDF data
   * @returns {Array} Form fields
   * @private
   */
  _extractFormFields(pdfData) {
    const fields = [];

    if (!pdfData.Pages) return fields;

    pdfData.Pages.forEach((page, pageIndex) => {
      if (page.Fields && Array.isArray(page.Fields)) {
        page.Fields.forEach((field) => {
          fields.push({
            page: pageIndex + 1,
            name: field.name || '',
            type: field.type || 'unknown',
            value: field.value || '',
            coordinates: {
              x: field.x || 0,
              y: field.y || 0,
              width: field.w || 0,
              height: field.h || 0,
            },
          });
        });
      }
    });

    return fields;
  }

  /**
   * Estimate line height from text elements
   * @param {Array} texts - Array of text elements
   * @returns {number} Estimated line height
   * @private
   */
  _estimateLineHeight(texts) {
    if (texts.length < 2) return 1.0;

    const yPositions = texts.map((t) => t.y).sort((a, b) => a - b);
    const differences = [];

    for (let i = 1; i < yPositions.length; i++) {
      const diff = Math.abs(yPositions[i] - yPositions[i - 1]);
      if (diff > 0.1 && diff < 5) {
        // Reasonable line height range
        differences.push(diff);
      }
    }

    if (differences.length === 0) return 1.0;

    // Return median difference as estimated line height
    differences.sort((a, b) => a - b);
    const mid = Math.floor(differences.length / 2);
    return differences.length % 2 === 0
      ? (differences[mid - 1] + differences[mid]) / 2
      : differences[mid];
  }

  /**
   * Check if text block is likely a heading
   * @param {string} text - Text block
   * @returns {boolean} True if likely a heading
   * @private
   */
  _isLikelyHeading(text) {
    // Simple heuristics for heading detection
    return (
      text.length < 100 && // Short
      text.length > 2 && // Not too short
      !text.endsWith('.') && // Doesn't end with period
      /^[A-Z]/.test(text) && // Starts with capital
      (/^[A-Z\s]+$/.test(text) || // All caps
        text.split(' ').length <= 8) // Few words
    );
  }

  /**
   * Check if text block is likely a list item
   * @param {string} text - Text block
   * @returns {boolean} True if likely a list item
   * @private
   */
  _isLikelyListItem(text) {
    return (
      /^[\s]*[-•·▪▫▬▲►]\s/.test(text) || // Bullet points
      /^[\s]*\d+[.)]\s/.test(text) || // Numbered lists
      /^[\s]*[a-zA-Z][.)]\s/.test(text) // Lettered lists
    );
  }

  /**
   * Check if text should continue on the same line as previous text
   * @param {string} current - Current text
   * @param {string} next - Next text block
   * @returns {boolean} True if should continue same line
   * @private
   */
  _shouldContinueSameLine(current, next) {
    // Continue if current doesn't end with sentence terminator
    // and next doesn't start like a new sentence
    return (
      !current.match(/[.!?]\s*$/) && // Current doesn't end with punctuation
      !next.match(/^[A-Z]/) && // Next doesn't start with capital
      current.length < 200 // Not too long already
    );
  }

  /**
   * Merge page structure into document structure
   * @param {Object} docStructure - Document structure
   * @param {Object} pageStructure - Page structure
   * @private
   */
  _mergeStructure(docStructure, pageStructure) {
    docStructure.paragraphs.push(...pageStructure.paragraphs);
    docStructure.headings.push(...pageStructure.headings);
    docStructure.lists.push(...pageStructure.lists);
  }

  /**
   * Normalize extracted text
   * @param {string} text - Raw text
   * @returns {string} Normalized text
   * @private
   */
  _normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Normalize whitespace
      .replace(/^\s+|\s+$/g, ''); // Trim
  }

  /**
   * Clean metadata value
   * @param {string} value - Raw metadata value
   * @returns {string} Cleaned value
   * @private
   */
  _cleanMetadataValue(value) {
    if (typeof value !== 'string') return '';

    return value
      .replace(/^\(|\)$/g, '') // Remove parentheses
      .replace(/^D:/, '') // Remove date prefix
      .trim();
  }

  /**
   * Parse PDF date string
   * @param {string} dateString - PDF date string
   * @returns {Date|null} Parsed date
   * @private
   */
  _parsePDFDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    try {
      // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
      const cleaned = dateString.replace(/^D:/, '').replace(/[+-]\d{2}'\d{2}'?$/, '');

      if (cleaned.length >= 8) {
        const year = parseInt(cleaned.substring(0, 4), 10);
        const month = parseInt(cleaned.substring(4, 6), 10) - 1; // Month is 0-based
        const day = parseInt(cleaned.substring(6, 8), 10);
        const hour = cleaned.length >= 10 ? parseInt(cleaned.substring(8, 10), 10) : 0;
        const minute = cleaned.length >= 12 ? parseInt(cleaned.substring(10, 12), 10) : 0;
        const second = cleaned.length >= 14 ? parseInt(cleaned.substring(12, 14), 10) : 0;

        return new Date(year, month, day, hour, minute, second);
      }
    } catch {
      // Return null for invalid dates
    }

    return null;
  }
}
