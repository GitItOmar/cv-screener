/**
 * Default configuration for file parsing
 */

export default {
  // General settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  timeout: 30000, // 30 seconds
  extractMetadata: true,

  // PDF specific settings
  pdf: {
    maxPages: 100,
    preserveStructure: true,
    extractImages: false,
    cleanText: true,
  },

  // DOCX specific settings
  docx: {
    preserveFormatting: true,
    includeHeaders: true,
    includeFooters: false,
    convertTables: true,
  },

  // CSV specific settings
  csv: {
    autoDetectDelimiter: true,
    skipEmptyLines: true,
    trimWhitespace: true,
    maxColumns: 50,
    maxRows: 10000,
  },

  // Validation settings
  validation: {
    checkMagicNumbers: true,
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv',
    ],
    allowedExtensions: ['.pdf', '.docx', '.csv'],
    maxFilenameLength: 255,
  },

  // Error handling
  errorHandling: {
    retryAttempts: 1,
    retryDelay: 1000,
    throwOnValidationError: true,
    includeStackTrace: process.env.NODE_ENV === 'development',
  },

  // Performance settings
  performance: {
    enableProgressReporting: true,
    progressUpdateInterval: 1000, // ms
    enableMemoryMonitoring: false,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  },

  // Logging
  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    includeTimings: true,
    includeParserId: true,
  },
};
