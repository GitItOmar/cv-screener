/**
 * @screening/file-parser
 *
 * A unified file parsing package for the CV screening application.
 * Supports PDF and DOCX file formats with robust error handling
 * and metadata extraction.
 *
 * @author Omar Ghanaim
 * @version 1.0.0
 */

// Export main FileParser class as default
export { default } from './FileParser.js';

// Export main class as named export for convenience
export { default as FileParser } from './FileParser.js';

// Export base parser for extending
export { default as BaseParser } from './parsers/base.js';

// Export parser factory for automatic type detection
export { default as ParserFactory } from './parsers/parserFactory.js';

// Export individual parsers for advanced usage
export { default as PDFParser } from './parsers/pdf.js';
export { default as DOCXParser } from './parsers/docx.js';

// Export utilities
export { detectFileType, validateFile, isSupported, getSupportedTypes } from './utils/fileType.js';
export {
  ParseError,
  ValidationError,
  TimeoutError,
  UnsupportedFormatError,
  FileSizeError,
  CorruptedFileError,
  ConfigurationError,
  createParserError,
  isParserError,
  formatErrorForUser,
  getErrorSeverity,
  ErrorRecovery,
  ErrorUtils,
} from './utils/errors.js';

// Version info
export const version = '1.0.0';
export const supportedFormats = ['pdf', 'docx'];
