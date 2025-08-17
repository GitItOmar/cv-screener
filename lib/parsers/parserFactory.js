import pdfParser from './pdfParser.js';
import docxParser from './docxParser.js';
import csvParser from './csvParser.js';

export class ParserFactory {
  static SUPPORTED_TYPES = {
    'application/pdf': 'pdf',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };

  static SUPPORTED_EXTENSIONS = {
    '.pdf': 'pdf',
    '.csv': 'csv',
    '.docx': 'docx',
    '.doc': 'doc',
    '.zip': 'zip',
  };

  /**
   * Determines file type from File object
   * @param {File} file - The uploaded file
   * @returns {string} - Detected file type
   */
  static detectFileType(file) {
    console.debug('[ParserFactory] Detecting file type for:', file.name);

    // First try MIME type
    if (file.type && this.SUPPORTED_TYPES[file.type]) {
      const detectedType = this.SUPPORTED_TYPES[file.type];
      console.debug('[ParserFactory] Detected type from MIME:', detectedType);
      return detectedType;
    }

    // Fallback to file extension
    const extension = this.getFileExtension(file.name);
    if (this.SUPPORTED_EXTENSIONS[extension]) {
      const detectedType = this.SUPPORTED_EXTENSIONS[extension];
      console.debug('[ParserFactory] Detected type from extension:', detectedType);
      return detectedType;
    }

    console.warn('[ParserFactory] Unsupported file type:', file.type, 'extension:', extension);
    throw new Error(`Unsupported file type: ${file.type || extension}`);
  }

  /**
   * Gets file extension from filename
   * @param {string} filename - The filename
   * @returns {string} - File extension with dot
   */
  static getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
  }

  /**
   * Routes file to appropriate parser
   * @param {File} file - The uploaded file
   * @returns {Promise<string>} - Extracted text content
   */
  static async parseFile(file) {
    const startTime = Date.now();
    console.info('[ParserFactory] Starting to parse file:', file.name);

    try {
      const fileType = this.detectFileType(file);
      const fileBuffer = await file.arrayBuffer();

      console.debug('[ParserFactory] File buffer size:', fileBuffer.byteLength, 'bytes');

      let result;

      switch (fileType) {
        case 'pdf':
          console.debug('[ParserFactory] Routing to PDF parser');
          result = await pdfParser.parse(fileBuffer);
          break;

        case 'docx':
          console.debug('[ParserFactory] Routing to DOCX parser');
          result = await docxParser.parse(fileBuffer);
          break;

        case 'csv':
          console.debug('[ParserFactory] Routing to CSV parser');
          result = await csvParser.parse(fileBuffer);
          break;

        case 'zip':
          console.warn('[ParserFactory] ZIP format not yet implemented, treating as unsupported');
          throw new Error('ZIP format parsing not yet implemented');

        case 'doc':
          console.warn('[ParserFactory] DOC format not yet implemented, treating as unsupported');
          throw new Error('DOC format parsing not yet implemented');

        default:
          throw new Error(`No parser available for file type: ${fileType}`);
      }

      const processingTime = Date.now() - startTime;
      console.info('[ParserFactory] Successfully parsed file in', processingTime, 'ms');

      return {
        content: result,
        metadata: {
          filename: file.name,
          fileType,
          fileSize: file.size,
          processingTime,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[ParserFactory] Failed to parse file:', error.message);

      throw new Error(`Failed to parse ${file.name}: ${error.message}`);
    }
  }

  /**
   * Validates if file type is supported
   * @param {File} file - The uploaded file
   * @returns {boolean} - Whether file type is supported
   */
  static isSupported(file) {
    try {
      this.detectFileType(file);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets list of supported file types
   * @returns {string[]} - Array of supported extensions
   */
  static getSupportedTypes() {
    return Object.keys(this.SUPPORTED_EXTENSIONS);
  }
}

export default ParserFactory;
