/**
 * Custom error classes for file parsing
 */

/**
 * Base error class for all parsing-related errors
 */
export class ParserError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'PARSER_ERROR';
    this.parser = options.parser || 'unknown';
    this.filename = options.filename;
    this.details = options.details;
    this.timestamp = new Date().toISOString();

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/transmission
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      parser: this.parser,
      filename: this.filename,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

/**
 * Error thrown when file parsing fails
 */
export class ParseError extends ParserError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'PARSE_FAILED' });
  }
}

/**
 * Error thrown when file validation fails
 */
export class ValidationError extends ParserError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'VALIDATION_FAILED' });
    this.validationRules = options.validationRules || [];
  }
}

/**
 * Error thrown when parsing operation times out
 */
export class TimeoutError extends ParserError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'PARSE_TIMEOUT' });
    this.timeout = options.timeout;
  }
}

/**
 * Error thrown when file format is not supported
 */
export class UnsupportedFormatError extends ParserError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'UNSUPPORTED_FORMAT' });
    this.detectedType = options.detectedType;
    this.supportedTypes = options.supportedTypes || [];
  }
}

/**
 * Error thrown when file size exceeds limits
 */
export class FileSizeError extends ValidationError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'FILE_SIZE_EXCEEDED' });
    this.fileSize = options.fileSize;
    this.maxSize = options.maxSize;
  }
}

/**
 * Error thrown when file is corrupted or malformed
 */
export class CorruptedFileError extends ParseError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'CORRUPTED_FILE' });
    this.corruption = options.corruption;
  }
}

/**
 * Error thrown when parser configuration is invalid
 */
export class ConfigurationError extends ParserError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'INVALID_CONFIGURATION' });
    this.configKey = options.configKey;
    this.configValue = options.configValue;
  }
}

/**
 * Create appropriate error from generic error
 * @param {Error} error - Original error
 * @param {Object} context - Additional context
 * @returns {ParserError} Appropriate parser error
 */
export function createParserError(error, context = {}) {
  if (error instanceof ParserError) {
    return error;
  }

  const message = error.message || 'Unknown parsing error';
  const options = {
    ...context,
    details: {
      originalError: error.name,
      originalMessage: error.message,
      originalStack: error.stack,
    },
  };

  // Detect error type from message
  if (message.includes('timeout') || message.includes('timed out')) {
    return new TimeoutError(message, options);
  }

  if (message.includes('corrupt') || message.includes('invalid') || message.includes('malformed')) {
    return new CorruptedFileError(message, options);
  }

  if (message.includes('unsupported') || message.includes('not supported')) {
    return new UnsupportedFormatError(message, options);
  }

  if (message.includes('validation') || message.includes('validate')) {
    return new ValidationError(message, options);
  }

  if (message.includes('size') || message.includes('too large')) {
    return new FileSizeError(message, options);
  }

  // Default to generic parse error
  return new ParseError(message, options);
}

/**
 * Check if error is a parser error
 * @param {Error} error - Error to check
 * @returns {boolean} Whether error is a parser error
 */
export function isParserError(error) {
  return error instanceof ParserError;
}

/**
 * Get error severity level
 * @param {Error} error - Error to analyze
 * @returns {string} Severity level (low, medium, high, critical)
 */
export function getErrorSeverity(error) {
  if (error instanceof ConfigurationError) return 'critical';
  if (error instanceof TimeoutError) return 'high';
  if (error instanceof CorruptedFileError) return 'high';
  if (error instanceof UnsupportedFormatError) return 'medium';
  if (error instanceof FileSizeError) return 'medium';
  if (error instanceof ValidationError) return 'low';
  if (error instanceof ParseError) return 'medium';
  return 'low';
}

/**
 * Format error for user display
 * @param {Error} error - Error to format
 * @returns {string} User-friendly error message
 */
export function formatErrorForUser(error) {
  if (error instanceof FileSizeError) {
    const sizeMB = Math.round((error.fileSize / (1024 * 1024)) * 10) / 10;
    const maxSizeMB = Math.round(error.maxSize / (1024 * 1024));
    return `File is too large (${sizeMB}MB). Maximum size allowed is ${maxSizeMB}MB.`;
  }

  if (error instanceof UnsupportedFormatError) {
    const supported = error.supportedTypes.join(', ');
    return `File format not supported. Supported formats: ${supported}`;
  }

  if (error instanceof CorruptedFileError) {
    return 'File appears to be corrupted or damaged. Please try with a different file.';
  }

  if (error instanceof TimeoutError) {
    return 'File processing took too long and was cancelled. Please try with a smaller file.';
  }

  if (error instanceof ValidationError) {
    return 'File validation failed. Please check that the file is in the correct format.';
  }

  if (error instanceof ParseError) {
    return 'Unable to extract content from file. The file may be password-protected or corrupted.';
  }

  // Fallback for unknown errors
  return 'An error occurred while processing the file. Please try again.';
}
