/**
 * DOCX parser implementation using mammoth
 * Handles Word document text extraction with structure preservation and metadata extraction
 */

import mammoth from 'mammoth';
import BaseParser from './base.js';
import { ParseError, CorruptedFileError } from '../utils/errors.js';

/**
 * DOCX parser class for extracting text and metadata from Word documents
 */
export default class DOCXParser extends BaseParser {
  static parserName = 'docx';
  static supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word.document.macroEnabled.12', // .docm files
  ];
  static extensions = ['.docx', '.docm'];

  /**
   * Parse DOCX file and extract text content
   * @param {ArrayBuffer|Buffer|File} input - DOCX file data
   * @returns {Promise<Object>} Parsed content and metadata
   */
  async parse(input) {
    const progressCallback = null; // No progress callbacks in minimal version

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
        throw new ParseError('Invalid input type for DOCX parsing');
      }

      if (progressCallback) {
        progressCallback(10, 'Initializing DOCX parser');
      }

      // Configure mammoth options with hardcoded settings
      const mammothOptions = this._buildMammothOptions();

      if (progressCallback) {
        progressCallback(20, 'Loading DOCX document');
      }

      // Parse DOCX with mammoth
      const result = await this._parseWithMammoth(buffer, mammothOptions);

      if (progressCallback) {
        progressCallback(60, 'Extracting text content');
      }

      // Process the extracted content with hardcoded options
      const processedContent = this._processExtractedContent(result, {
        convertTables: true,
      });

      if (progressCallback) {
        progressCallback(80, 'Processing metadata');
      }

      // Extract metadata from the document
      const metadata = this._extractDocumentMetadata(result);

      if (progressCallback) {
        progressCallback(90, 'Finalizing results');
      }

      // Build final result object
      const finalResult = {
        text: processedContent.text,
        html: result.value, // Raw HTML output from mammoth
        structure: processedContent.structure,
        tables: processedContent.tables,
        metadata,
        messages: result.messages || [], // Warnings/info from mammoth
        images: processedContent.images,
      };

      return finalResult;
    } catch (error) {
      if (
        error.message?.includes('not a valid zip file') ||
        error.message?.includes('invalid signature') ||
        error.message?.includes('corrupted')
      ) {
        throw new CorruptedFileError('DOCX file is corrupted or invalid', {
          parser: 'docx',
          originalError: error.message,
        });
      }

      throw new ParseError(`DOCX parsing failed: ${error.message}`, {
        parser: 'docx',
        originalError: error.message,
      });
    }
  }

  /**
   * Parse DOCX using mammoth with error handling
   * @param {Buffer} buffer - DOCX buffer
   * @param {Object} options - Hardcoded mammoth options
   * @returns {Promise<Object>} Parsed result
   * @private
   */
  async _parseWithMammoth(buffer, options) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`DOCX parsing timed out after 45000ms`));
      }, 45000); // Hardcoded timeout

      mammoth
        .convertToHtml({ buffer }, options)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Build mammoth configuration options (hardcoded for CV processing)
   * @returns {Object} Mammoth options
   * @private
   */
  _buildMammothOptions() {
    // Hardcoded mammoth options for CV processing
    const mammothOptions = {
      convertImage: undefined, // No image conversion needed for CV
      ignoreEmptyParagraphs: true, // Ignore empty paragraphs for cleaner text
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
    };

    return mammothOptions;
  }

  /**
   * Process extracted content from mammoth
   * @param {Object} result - Mammoth result
   * @returns {Object} Processed content
   * @private
   */
  _processExtractedContent(result) {
    const htmlContent = result.value || '';

    // Convert HTML to plain text with structure preservation
    const textContent = this._htmlToText(htmlContent);

    // Extract structure elements
    const structure = this._extractStructure(htmlContent);

    // Extract tables
    const tables = this._extractTables(htmlContent); // Always extract tables for CV processing

    // Extract images info
    const images = this._extractImageInfo(result.messages || []);

    return {
      text: textContent,
      structure,
      tables,
      images,
    };
  }

  /**
   * Convert HTML to plain text while preserving structure
   * @param {string} html - HTML content
   * @returns {string} Plain text
   * @private
   */
  _htmlToText(html) {
    if (!html) return '';

    const text = html
      // Convert headers to text with proper spacing
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert list items
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      // Convert ordered list items (basic numbering)
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (_liMatch, itemContent) => {
          return `${counter++}. ${itemContent}\n`;
        });
      })
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return text;
  }

  /**
   * Extract document structure from HTML
   * @param {string} html - HTML content
   * @returns {Object} Document structure
   * @private
   */
  _extractStructure(html) {
    const structure = {
      headings: [],
      paragraphs: [],
      lists: [],
      tables: [],
    };

    if (!html) return structure;

    // Extract headings
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      structure.headings.push({
        level: parseInt(headingMatch[1], 10),
        text: this._cleanTextContent(headingMatch[2]),
      });
    }

    // Extract paragraphs
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let paragraphMatch;
    while ((paragraphMatch = paragraphRegex.exec(html)) !== null) {
      const text = this._cleanTextContent(paragraphMatch[1]);
      if (text.trim()) {
        structure.paragraphs.push(text);
      }
    }

    // Extract lists
    this._extractLists(html, structure);

    // Extract table info
    const tableRegex = /<table[^>]*>.*?<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      structure.tables.push({
        html: tableMatch[0],
        text: this._cleanTextContent(tableMatch[0]),
      });
    }

    return structure;
  }

  /**
   * Extract lists from HTML content
   * @param {string} html - HTML content
   * @param {Object} structure - Structure object to populate
   * @private
   */
  _extractLists(html, structure) {
    // Extract unordered lists
    const ulRegex = /<ul[^>]*>(.*?)<\/ul>/gis;
    let ulMatch;
    while ((ulMatch = ulRegex.exec(html)) !== null) {
      const items = [];
      const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(ulMatch[1])) !== null) {
        const text = this._cleanTextContent(liMatch[1]);
        if (text.trim()) {
          items.push(text);
        }
      }
      if (items.length > 0) {
        structure.lists.push({
          type: 'unordered',
          items,
        });
      }
    }

    // Extract ordered lists
    const olRegex = /<ol[^>]*>(.*?)<\/ol>/gis;
    let olMatch;
    while ((olMatch = olRegex.exec(html)) !== null) {
      const items = [];
      const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(olMatch[1])) !== null) {
        const text = this._cleanTextContent(liMatch[1]);
        if (text.trim()) {
          items.push(text);
        }
      }
      if (items.length > 0) {
        structure.lists.push({
          type: 'ordered',
          items,
        });
      }
    }
  }

  /**
   * Extract tables from HTML content
   * @param {string} html - HTML content
   * @returns {Array} Array of table objects
   * @private
   */
  _extractTables(html) {
    const tables = [];

    if (!html) return tables;

    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[0];
      const tableContent = tableMatch[1];

      const table = {
        html: tableHtml,
        rows: [],
        text: '',
      };

      // Extract rows
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const row = {
          cells: [],
          text: '',
        };

        // Extract cells (both td and th)
        const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis;
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellText = this._cleanTextContent(cellMatch[1]);
          row.cells.push(cellText);
        }

        if (row.cells.length > 0) {
          row.text = row.cells.join(' | ');
          table.rows.push(row);
        }
      }

      // Create table text representation
      table.text = table.rows.map((row) => row.text).join('\n');

      if (table.rows.length > 0) {
        tables.push(table);
      }
    }

    return tables;
  }

  /**
   * Extract image information from mammoth messages
   * @param {Array} messages - Mammoth messages
   * @returns {Array} Image information
   * @private
   */
  _extractImageInfo(messages) {
    const images = [];

    messages.forEach((message) => {
      if (message.type === 'warning' && message.message?.includes('image')) {
        images.push({
          type: 'image',
          message: message.message,
        });
      }
    });

    return images;
  }

  /**
   * Extract document metadata
   * @param {Object} result - Mammoth result
   * @param {Object} options - Extraction options
   * @returns {Object} Document metadata
   * @private
   */
  _extractDocumentMetadata(result) {
    const metadata = {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      created: null,
      modified: null,
      application: 'Microsoft Word',
      characters: 0,
      words: 0,
      paragraphs: 0,
      images: 0,
      tables: 0,
      warnings: 0,
    };

    if (result.value) {
      // Calculate basic text statistics
      const textContent = this._htmlToText(result.value);
      metadata.characters = textContent.length;
      metadata.words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
      metadata.paragraphs = (textContent.match(/\n\n/g) || []).length + 1;

      // Count tables
      metadata.tables = (result.value.match(/<table/gi) || []).length;

      // Count images (from messages)
      if (result.messages) {
        metadata.images = result.messages.filter(
          (m) => m.message && m.message.includes('image'),
        ).length;

        metadata.warnings = result.messages.filter((m) => m.type === 'warning').length;
      }
    }

    // Try to extract title from first heading
    if (result.value) {
      const titleMatch = result.value.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
      if (titleMatch) {
        metadata.title = this._cleanTextContent(titleMatch[1]);
      }
    }

    return metadata;
  }

  /**
   * Clean text content by removing HTML tags and decoding entities
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text
   * @private
   */
  _cleanTextContent(text) {
    if (!text) return '';

    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
