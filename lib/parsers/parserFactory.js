import { PDFParser } from './pdfParser.js';
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
    return this.detectFileTypeFromMimeAndName(file.type, file.name);
  }

  /**
   * Determines file type from MIME type and filename
   * @param {string} mimeType - The MIME type
   * @param {string} filename - The filename
   * @returns {string} - Detected file type
   */
  static detectFileTypeFromMimeAndName(mimeType, filename) {
    // First try MIME type
    if (mimeType && this.SUPPORTED_TYPES[mimeType]) {
      const detectedType = this.SUPPORTED_TYPES[mimeType];
      return detectedType;
    }

    // Fallback to file extension
    const extension = this.getFileExtension(filename);
    if (this.SUPPORTED_EXTENSIONS[extension]) {
      const detectedType = this.SUPPORTED_EXTENSIONS[extension];
      return detectedType;
    }

    throw new Error(`Unsupported file type: ${mimeType || extension}`);
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
   * @param {ArrayBuffer|File} bufferOrFile - The file buffer or File object
   * @param {string} mimeType - The MIME type (required if first param is ArrayBuffer)
   * @param {string} filename - The filename (required if first param is ArrayBuffer)
   * @returns {Promise<string>} - Extracted text content
   */
  static async parseFile(bufferOrFile, mimeType, filename) {
    let fileBuffer, fileType, fileName;
    
    try {
      // Handle both File objects and ArrayBuffer inputs
      if (bufferOrFile instanceof File) {
        fileName = bufferOrFile.name;
        fileType = this.detectFileType(bufferOrFile);
        fileBuffer = await bufferOrFile.arrayBuffer();
      } else {
        // ArrayBuffer input with separate mimeType and filename
        fileName = filename;
        fileBuffer = bufferOrFile;
        fileType = this.detectFileTypeFromMimeAndName(mimeType, fileName);
      }

      let result;

      switch (fileType) {
        case 'pdf':
          result = await PDFParser.parse(fileBuffer);
          break;

        case 'docx':
          result = await docxParser.parse(fileBuffer);
          break;

        case 'csv':
          result = await csvParser.parse(fileBuffer);
          break;

        case 'zip':
          throw new Error('ZIP format parsing not yet implemented');

        case 'doc':
          throw new Error('DOC format parsing not yet implemented');

        default:
          throw new Error(`No parser available for file type: ${fileType}`);
      }

      return result;
    } catch (originalError) {
      throw new Error(`Failed to parse ${fileName || 'unknown file'}: ${originalError.message}`);
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
