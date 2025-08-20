/**
 * @screening/file-parser
 *
 * A unified file parsing package for the CV screening application.
 * Supports PDF, DOCX, and CSV file formats with robust error handling
 * and metadata extraction.
 *
 * @author Omar Ghanaim
 * @version 1.0.0
 */

// Export main class as default (when implemented)
// export { default } from './FileParser.js';

// Export base parser for extending
export { default as BaseParser } from './parsers/base.js';

// Export individual parsers for advanced usage
export { default as PDFParser } from './parsers/pdf.js';
// export { default as DOCXParser } from './parsers/docx.js';
// export { default as CSVParser } from './parsers/csv.js';

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
} from './utils/errors.js';

export {
  ProgressReporter,
  createProgressFunction,
  createThrottledProgress,
  ProgressUtils,
} from './utils/progress.js';

// Export configuration
export { default as defaultConfig } from './config/defaults.js';

// Version info
export const version = '1.0.0';
export const supportedFormats = ['pdf', 'docx', 'csv'];
