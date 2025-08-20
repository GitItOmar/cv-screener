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

  // Validation settings
  validation: {
    checkMagicNumbers: true,
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['.pdf', '.docx'],
    maxFilenameLength: 255,
  },

  // Error handling
  errorHandling: {
    retryAttempts: 2, // Increased default retry attempts
    retryDelay: 1000,
    throwOnValidationError: true,
    includeStackTrace: process.env.NODE_ENV === 'development',
    enableRecovery: true, // Enable error recovery strategies by default
    allowPartialRecovery: true, // Allow partial content extraction
    partialThreshold: 0.1, // Minimum content percentage for partial recovery
    circuitBreakerEnabled: false, // Circuit breaker disabled by default
    circuitBreakerThreshold: 5, // Failure threshold for circuit breaker
    circuitBreakerTimeout: 60000, // Reset timeout for circuit breaker (1 minute)
    sanitizeStackTraces: process.env.NODE_ENV !== 'development', // Sanitize in non-dev
    createErrorFingerprints: true, // Enable error fingerprinting for deduplication
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
