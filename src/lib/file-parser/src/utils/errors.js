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
      stack: this._sanitizeStack(this.stack),
      environment: process.env.NODE_ENV || 'development',
      fingerprint: this._createFingerprint(),
    };
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly message
   */
  getUserMessage() {
    return formatErrorForUser(this);
  }

  /**
   * Check if this error is retryable
   * @returns {boolean} Whether error is retryable
   */
  isRetryable() {
    return this._isTransientError();
  }

  /**
   * Get error severity level
   * @returns {string} Severity level
   */
  getSeverity() {
    return getErrorSeverity(this);
  }

  /**
   * Sanitize stack trace based on environment
   * @param {string} stack - Stack trace
   * @returns {string|undefined} Sanitized stack
   * @private
   */
  _sanitizeStack(stack) {
    if (!stack || process.env.NODE_ENV === 'production') {
      return undefined;
    }

    if (process.env.NODE_ENV === 'development') {
      return stack;
    }

    return stack
      .split('\n')
      .filter((line) => !line.includes('node_modules'))
      .filter((line) => !line.includes('internal/'))
      .join('\n');
  }

  /**
   * Create error fingerprint
   * @returns {string} Error fingerprint
   * @private
   */
  _createFingerprint() {
    const parts = [
      this.name,
      this.code || 'NO_CODE',
      this.parser || 'unknown',
      this._hashMessage(this.message),
    ];

    return parts.join('|');
  }

  /**
   * Check if error is transient (basic implementation)
   * @returns {boolean} Whether error is transient
   * @private
   */
  _isTransientError() {
    // Check error codes first
    const nonRetryableCodes = [
      'VALIDATION_FAILED',
      'UNSUPPORTED_FORMAT',
      'FILE_SIZE_EXCEEDED',
      'INVALID_CONFIGURATION',
    ];

    const retryableCodes = [
      'PARSE_FAILED', // ParseError can be retryable in many cases
      'PARSE_TIMEOUT',
      'CORRUPTED_FILE',
    ];

    if (nonRetryableCodes.includes(this.code)) {
      return false;
    }

    if (retryableCodes.includes(this.code)) {
      return true;
    }

    // Check message patterns for errors without specific codes
    const transientPatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /temporary/i,
      /busy/i,
      /lock/i,
    ];

    return transientPatterns.some(
      (pattern) => pattern.test(this.message) || pattern.test(this.code || ''),
    );
  }

  /**
   * Create a simple hash of message for fingerprinting
   * @param {string} message - Message to hash
   * @returns {string} Hash
   * @private
   */
  _hashMessage(message) {
    if (!message) return '0';

    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
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
 * Error recovery strategies implementation
 */
export class ErrorRecovery {
  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Operation result
   */
  static async retry(operation, options = {}) {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = (error) => !(error instanceof ValidationError),
      onRetry = null,
    } = options;

    let lastError;
    let delay = baseDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if we should retry this error
        if (!retryCondition(error) || attempt === maxAttempts) {
          throw error;
        }

        // Call retry callback if provided
        if (onRetry) {
          onRetry(error, attempt, maxAttempts);
        }

        // Wait before next attempt
        await ErrorRecovery._delay(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Attempt graceful degradation by trying alternative methods
   * @param {Array<Function>} strategies - Array of fallback strategies
   * @param {Object} context - Context information
   * @returns {Promise<any>} Result from successful strategy
   */
  static async gracefulDegradation(strategies, context = {}) {
    const errors = [];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];

      try {
        const result = await strategy(context);

        // If we used a fallback strategy, add warning
        if (i > 0) {
          result._warnings = result._warnings || [];
          result._warnings.push({
            type: 'fallback_used',
            message: `Primary parsing failed, used fallback strategy ${i + 1}`,
            originalErrors: errors.map((e) => e.message),
          });
        }

        return result;
      } catch (error) {
        errors.push(error);

        // If this is the last strategy, throw aggregated error
        if (i === strategies.length - 1) {
          throw new ParseError('All parsing strategies failed', {
            originalErrors: errors.map((e) => ({
              name: e.name,
              message: e.message,
              code: e.code,
            })),
            strategiesAttempted: strategies.length,
          });
        }
      }
    }
  }

  /**
   * Partial recovery - extract what we can from corrupted files
   * @param {Function} operation - Main operation
   * @param {Function} partialExtractor - Fallback extractor
   * @param {Object} options - Recovery options
   * @returns {Promise<Object>} Partial result
   */
  static async partialRecovery(operation, partialExtractor, options = {}) {
    const {
      allowPartial = true,
      partialThreshold = 0.1, // Minimum content percentage to accept
    } = options;

    try {
      return await operation();
    } catch (error) {
      if (!allowPartial) {
        throw error;
      }

      // Check error codes that shouldn't be retried with partial recovery
      const nonRecoverableCodes = ['VALIDATION_FAILED', 'INVALID_CONFIGURATION'];
      if (nonRecoverableCodes.includes(error.code)) {
        throw error;
      }

      try {
        const partialResult = await partialExtractor();

        // Check if we have enough content
        const contentLength = partialResult.text?.length || 0;
        if (contentLength < 100 && contentLength < partialThreshold * 1000) {
          throw new ParseError('Insufficient content recovered from corrupted file', {
            recoveredBytes: contentLength,
            originalError: error.message,
          });
        }

        return {
          ...partialResult,
          success: true,
          partial: true,
          warnings: [
            {
              type: 'partial_recovery',
              message: 'File was partially corrupted, extracted available content',
              originalError: error.message,
              recoveredContent: contentLength,
            },
          ],
        };
      } catch (partialError) {
        // If partial recovery also fails, throw original error unless partial error has better info
        if (
          partialError instanceof ParseError &&
          partialError.message.includes('Insufficient content')
        ) {
          throw partialError;
        }
        throw error;
      }
    }
  }

  /**
   * Circuit breaker pattern for preventing cascading failures
   */
  static createCircuitBreaker(options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitorWindow = 300000, // 5 minutes
    } = options;

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failures = 0;
    let lastFailureTime = 0;
    let successCount = 0;

    return {
      async execute(operation) {
        const now = Date.now();

        // Reset failure count if monitor window has passed
        if (now - lastFailureTime > monitorWindow) {
          failures = 0;
        }

        // Check circuit state
        if (state === 'OPEN') {
          if (now - lastFailureTime < resetTimeout) {
            throw new ParseError('Circuit breaker is OPEN - too many recent failures', {
              state: 'OPEN',
              failures,
              resetTime: lastFailureTime + resetTimeout,
            });
          } else {
            state = 'HALF_OPEN';
            successCount = 0;
          }
        }

        try {
          const result = await operation();

          // Success - reset on half-open or continue on closed
          if (state === 'HALF_OPEN') {
            successCount++;
            if (successCount >= 3) {
              state = 'CLOSED';
              failures = 0;
            }
          } else if (state === 'CLOSED') {
            failures = Math.max(0, failures - 1); // Gradually reduce failure count
          }

          return result;
        } catch (error) {
          failures++;
          lastFailureTime = now;

          if (state === 'HALF_OPEN' || failures >= failureThreshold) {
            state = 'OPEN';
          }

          throw error;
        }
      },

      getState() {
        return { state, failures, lastFailureTime };
      },

      reset() {
        state = 'CLOSED';
        failures = 0;
        lastFailureTime = 0;
        successCount = 0;
      },
    };
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   * @private
   */
  static _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Enhanced error utilities for better debugging and monitoring
 */
export class ErrorUtils {
  /**
   * Create detailed error context for debugging
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   * @returns {Object} Enhanced error context
   */
  static createErrorContext(error, context = {}) {
    const errorContext = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: ErrorUtils.sanitizeStack(error.stack),
      },
      context: {
        parser: context.parser,
        filename: context.filename,
        fileSize: context.fileSize,
        operation: context.operation,
        options: ErrorUtils.sanitizeOptions(context.options),
      },
    };

    // Add performance timing if available
    if (context.startTime) {
      errorContext.timing = {
        duration: Date.now() - context.startTime,
        startTime: context.startTime,
      };
    }

    return errorContext;
  }

  /**
   * Sanitize stack traces for production
   * @param {string} stack - Stack trace
   * @returns {string} Sanitized stack trace
   */
  static sanitizeStack(stack) {
    if (!stack || process.env.NODE_ENV === 'production') {
      return undefined;
    }

    // In development, return full stack
    if (process.env.NODE_ENV === 'development') {
      return stack;
    }

    // In other environments, filter sensitive information
    return stack
      .split('\n')
      .filter((line) => !line.includes('node_modules'))
      .filter((line) => !line.includes('internal/'))
      .join('\n');
  }

  /**
   * Sanitize options object for logging
   * @param {Object} options - Options object
   * @returns {Object} Sanitized options
   */
  static sanitizeOptions(options = {}) {
    const sanitized = { ...options };

    // Remove potentially sensitive data
    delete sanitized.onProgress;
    delete sanitized.transformDocument;
    delete sanitized.convertImage;

    // Truncate large objects
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = `${sanitized[key].substring(0, 1000)}...[truncated]`;
      }
    });

    return sanitized;
  }

  /**
   * Create error fingerprint for deduplication
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {string} Error fingerprint
   */
  static createErrorFingerprint(error, context = {}) {
    const parts = [
      error.name,
      error.code || 'NO_CODE',
      context.parser || 'unknown',
      ErrorUtils._hashMessage(error.message),
    ];

    return parts.join('|');
  }

  /**
   * Check if error is transient (retryable)
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is transient
   */
  static isTransientError(error) {
    // Use the error's own method if it's a parser error
    if (error instanceof ParserError) {
      return error._isTransientError();
    }

    // For non-parser errors, check common patterns
    const transientPatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /temporary/i,
      /busy/i,
      /lock/i,
    ];

    return transientPatterns.some(
      (pattern) => pattern.test(error.message) || pattern.test(error.code || ''),
    );
  }

  /**
   * Aggregate multiple errors into a summary
   * @param {Array<Error>} errors - Array of errors
   * @returns {Object} Error summary
   */
  static aggregateErrors(errors) {
    const summary = {
      total: errors.length,
      byType: {},
      byCode: {},
      mostCommon: null,
      transientCount: 0,
      criticalCount: 0,
    };

    errors.forEach((error) => {
      // Count by type
      summary.byType[error.name] = (summary.byType[error.name] || 0) + 1;

      // Count by code
      const code = error.code || 'UNKNOWN';
      summary.byCode[code] = (summary.byCode[code] || 0) + 1;

      // Count transient errors
      if (ErrorUtils.isTransientError(error)) {
        summary.transientCount++;
      }

      // Count critical errors
      if (getErrorSeverity(error) === 'critical') {
        summary.criticalCount++;
      }
    });

    // Find most common error type
    const mostCommonType = Object.keys(summary.byType).reduce((a, b) =>
      summary.byType[a] > summary.byType[b] ? a : b,
    );

    summary.mostCommon = {
      type: mostCommonType,
      count: summary.byType[mostCommonType],
      percentage: Math.round((summary.byType[mostCommonType] / errors.length) * 100),
    };

    return summary;
  }

  /**
   * Create a simple hash of error message for fingerprinting
   * @param {string} message - Error message
   * @returns {string} Hash
   * @private
   */
  static _hashMessage(message) {
    if (!message) return '0';

    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }
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
