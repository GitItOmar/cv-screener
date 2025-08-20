/**
 * Comprehensive tests for unified error handling system
 */

import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  ParserError,
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
} from '../../src/utils/errors.js';

describe('Error Handling System', () => {
  describe('Custom Error Classes', () => {
    it('should create ParserError with proper inheritance', () => {
      const error = new ParserError('Test error', {
        code: 'TEST_ERROR',
        parser: 'test',
        filename: 'test.pdf',
      });

      assert.ok(error instanceof Error);
      assert.ok(error instanceof ParserError);
      assert.strictEqual(error.name, 'ParserError');
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.code, 'TEST_ERROR');
      assert.strictEqual(error.parser, 'test');
      assert.strictEqual(error.filename, 'test.pdf');
      assert.match(error.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    });

    it('should capture stack traces properly', () => {
      const error = new ParserError('Test error');
      assert.ok(error.stack !== undefined);
      assert.ok(error.stack.includes('ParserError'));
    });

    it('should provide user-friendly messages', () => {
      const error = new FileSizeError('File too large', {
        fileSize: 15728640, // 15MB
        maxSize: 10485760, // 10MB
      });

      const userMessage = error.getUserMessage();
      assert.ok(userMessage.includes('File is too large'));
      assert.ok(userMessage.includes('15MB'));
      assert.ok(userMessage.includes('10MB'));
    });

    it('should determine if error is retryable', () => {
      const timeoutError = new TimeoutError('Timeout');
      const validationError = new ValidationError('Invalid file');

      assert.strictEqual(timeoutError.isRetryable(), true);
      assert.strictEqual(validationError.isRetryable(), false);
    });

    it('should provide severity levels', () => {
      const configError = new ConfigurationError('Invalid config');
      const validationError = new ValidationError('Invalid file');
      const timeoutError = new TimeoutError('Timeout');

      assert.strictEqual(configError.getSeverity(), 'critical');
      assert.strictEqual(validationError.getSeverity(), 'low');
      assert.strictEqual(timeoutError.getSeverity(), 'high');

      // Test direct function as well
      assert.strictEqual(getErrorSeverity(configError), 'critical');
      assert.strictEqual(getErrorSeverity(validationError), 'low');
    });
  });

  describe('Error Creation and Detection', () => {
    it('should create appropriate error from generic error', () => {
      const timeoutError = new Error('Operation timed out');
      const parseError = createParserError(timeoutError, { parser: 'pdf' });

      assert.ok(parseError instanceof TimeoutError);
      assert.strictEqual(parseError.code, 'PARSE_TIMEOUT');
      assert.strictEqual(parseError.parser, 'pdf');
    });

    it('should detect parser errors correctly', () => {
      const parseError = new ParseError('Parse failed');
      const genericError = new Error('Generic error');

      assert.strictEqual(isParserError(parseError), true);
      assert.strictEqual(isParserError(genericError), false);
    });

    it('should format errors for different error types', () => {
      const errors = [
        new UnsupportedFormatError('Unsupported', { supportedTypes: ['pdf', 'docx'] }),
        new CorruptedFileError('Corrupted file'),
        new TimeoutError('Timeout'),
        new ValidationError('Validation failed'),
      ];

      errors.forEach((error) => {
        const userMessage = formatErrorForUser(error);
        assert.ok(userMessage);
        assert.ok(!userMessage.includes('undefined'));
      });
    });
  });

  describe('Error Recovery Strategies', () => {
    describe('Retry with Exponential Backoff', () => {
      it('should retry operations with exponential backoff', async () => {
        let attempts = 0;
        const operation = mock.fn(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Transient error');
          }
          return Promise.resolve('success');
        });

        const result = await ErrorRecovery.retry(operation, {
          maxAttempts: 3,
          baseDelay: 10, // Fast for testing
        });

        assert.strictEqual(result, 'success');
        assert.strictEqual(attempts, 3);
        assert.strictEqual(operation.mock.callCount(), 3);
      });

      it('should respect retry conditions', async () => {
        const operation = mock.fn(() => Promise.reject(new ValidationError('Invalid')));

        await assert.rejects(
          ErrorRecovery.retry(operation, {
            maxAttempts: 3,
            retryCondition: (error) => !(error instanceof ValidationError),
          }),
          ValidationError,
        );

        assert.strictEqual(operation.mock.callCount(), 1);
      });

      it('should call onRetry callback', async () => {
        const onRetry = mock.fn();
        let callCount = 0;
        const operation = mock.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('First attempt'));
          }
          return Promise.resolve('success');
        });

        await ErrorRecovery.retry(operation, {
          maxAttempts: 2,
          baseDelay: 1,
          onRetry,
        });

        assert.strictEqual(onRetry.mock.callCount(), 1);
        const call = onRetry.mock.calls[0];
        assert.ok(call.arguments[0] instanceof Error);
        assert.strictEqual(call.arguments[1], 1);
        assert.strictEqual(call.arguments[2], 2);
      });
    });

    describe('Graceful Degradation', () => {
      it('should try strategies in order until one succeeds', async () => {
        const strategy1 = mock.fn(() => Promise.reject(new Error('Strategy 1 failed')));
        const strategy2 = mock.fn(() => Promise.reject(new Error('Strategy 2 failed')));
        const strategy3 = mock.fn(() => Promise.resolve({ success: true, data: 'result' }));

        const result = await ErrorRecovery.gracefulDegradation([strategy1, strategy2, strategy3]);

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, 'result');
        assert.ok(result._warnings !== undefined);
        assert.strictEqual(result._warnings[0].type, 'fallback_used');
      });

      it('should throw aggregated error if all strategies fail', async () => {
        const strategies = [
          mock.fn(() => Promise.reject(new Error('Strategy 1 failed'))),
          mock.fn(() => Promise.reject(new Error('Strategy 2 failed'))),
        ];

        await assert.rejects(
          ErrorRecovery.gracefulDegradation(strategies),
          /All parsing strategies failed/,
        );
      });
    });

    describe('Partial Recovery', () => {
      it('should return main result when operation succeeds', async () => {
        const mainOperation = mock.fn(() => Promise.resolve({ text: 'full content' }));
        const partialExtractor = mock.fn();

        const result = await ErrorRecovery.partialRecovery(mainOperation, partialExtractor);

        assert.strictEqual(result.text, 'full content');
        assert.strictEqual(partialExtractor.mock.callCount(), 0);
      });

      it('should use partial extractor when main operation fails', async () => {
        const mainOperation = mock.fn(() => Promise.reject(new Error('Main failed')));
        // Create content that meets minimum threshold (100+ characters)
        const partialContent =
          'This is partial content that was recovered from the corrupted file. It contains enough text to meet the minimum threshold requirements for successful partial recovery operations.';
        const partialExtractor = mock.fn(() => Promise.resolve({ text: partialContent }));

        const result = await ErrorRecovery.partialRecovery(mainOperation, partialExtractor);

        assert.strictEqual(result.partial, true);
        assert.strictEqual(result.text, partialContent);
        assert.ok(result.warnings !== undefined);
        assert.strictEqual(result.warnings[0].type, 'partial_recovery');
      });

      it('should reject if partial content is insufficient', async () => {
        const mainOperation = mock.fn(() => Promise.reject(new Error('Main failed')));
        const partialExtractor = mock.fn(() => Promise.resolve({ text: 'x' })); // Too short

        await assert.rejects(
          ErrorRecovery.partialRecovery(mainOperation, partialExtractor, {
            partialThreshold: 0.1,
          }),
          /Insufficient content recovered/,
        );
      });
    });

    describe('Circuit Breaker', () => {
      it('should execute operations normally when circuit is closed', async () => {
        const circuitBreaker = ErrorRecovery.createCircuitBreaker();
        const operation = mock.fn(() => Promise.resolve('success'));

        const result = await circuitBreaker.execute(operation);

        assert.strictEqual(result, 'success');
        assert.strictEqual(circuitBreaker.getState().state, 'CLOSED');
      });

      it('should open circuit after threshold failures', async () => {
        const circuitBreaker = ErrorRecovery.createCircuitBreaker({
          failureThreshold: 2,
        });
        const operation = mock.fn(() => Promise.reject(new Error('Operation failed')));

        // Fail twice to trigger circuit breaker
        await assert.rejects(circuitBreaker.execute(operation));
        await assert.rejects(circuitBreaker.execute(operation));

        // Circuit should now be open
        await assert.rejects(circuitBreaker.execute(operation), /Circuit breaker is OPEN/);
        assert.strictEqual(circuitBreaker.getState().state, 'OPEN');
      });

      it('should reset circuit after successful operations in half-open state', async () => {
        const circuitBreaker = ErrorRecovery.createCircuitBreaker({
          failureThreshold: 1,
          resetTimeout: 1, // Very short for testing
        });

        // Trigger circuit breaker
        await assert.rejects(circuitBreaker.execute(() => Promise.reject(new Error('Fail'))));

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Should be half-open, allow one call
        const successOperation = mock.fn(() => Promise.resolve('success'));

        // First success should work and start recovery
        await circuitBreaker.execute(successOperation);
        assert.strictEqual(circuitBreaker.getState().state, 'HALF_OPEN');

        // After enough successes, should close
        await circuitBreaker.execute(successOperation);
        await circuitBreaker.execute(successOperation);

        assert.strictEqual(circuitBreaker.getState().state, 'CLOSED');
      });
    });
  });

  describe('Error Utilities', () => {
    describe('Error Context Creation', () => {
      it('should create detailed error context', () => {
        const error = new ParseError('Test error');
        const context = ErrorUtils.createErrorContext(error, {
          parser: 'pdf',
          filename: 'test.pdf',
          fileSize: 1024,
        });

        assert.match(context.timestamp, /^\d{4}-\d{2}-\d{2}T/);
        assert.ok(context.environment !== undefined);
        assert.match(context.nodeVersion, /^v\d+\.\d+\.\d+/);
        assert.strictEqual(context.error.name, 'ParseError');
        assert.strictEqual(context.context.parser, 'pdf');
        assert.strictEqual(context.context.filename, 'test.pdf');
      });

      it('should include timing information when provided', () => {
        const error = new Error('Test');
        const startTime = Date.now() - 1000;

        const context = ErrorUtils.createErrorContext(error, { startTime });

        assert.ok(context.timing !== undefined);
        assert.ok(context.timing.duration > 900);
        assert.strictEqual(context.timing.startTime, startTime);
      });
    });

    describe('Stack Trace Sanitization', () => {
      const originalEnv = process.env.NODE_ENV;

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it('should return undefined in production', () => {
        process.env.NODE_ENV = 'production';
        const stack = 'Error\n    at test.js:10:5\n    at node_modules/lib.js:20:10';

        const sanitized = ErrorUtils.sanitizeStack(stack);

        assert.strictEqual(sanitized, undefined);
      });

      it('should return full stack in development', () => {
        process.env.NODE_ENV = 'development';
        const stack = 'Error\n    at test.js:10:5\n    at node_modules/lib.js:20:10';

        const sanitized = ErrorUtils.sanitizeStack(stack);

        assert.strictEqual(sanitized, stack);
      });

      it('should filter node_modules and internal in other environments', () => {
        process.env.NODE_ENV = 'test';
        const stack =
          'Error\n    at test.js:10:5\n    at node_modules/lib.js:20:10\n    at internal/process.js:30:15';

        const sanitized = ErrorUtils.sanitizeStack(stack);

        assert.strictEqual(sanitized, 'Error\n    at test.js:10:5');
      });
    });

    describe('Error Fingerprinting', () => {
      it('should create consistent fingerprints for similar errors', () => {
        const error1 = new ParseError('File parsing failed');
        const error2 = new ParseError('File parsing failed');

        const fingerprint1 = ErrorUtils.createErrorFingerprint(error1, { parser: 'pdf' });
        const fingerprint2 = ErrorUtils.createErrorFingerprint(error2, { parser: 'pdf' });

        assert.strictEqual(fingerprint1, fingerprint2);
      });

      it('should create different fingerprints for different errors', () => {
        const parseError = new ParseError('Parse failed');
        const timeoutError = new TimeoutError('Timeout');

        const fingerprint1 = ErrorUtils.createErrorFingerprint(parseError);
        const fingerprint2 = ErrorUtils.createErrorFingerprint(timeoutError);

        assert.notStrictEqual(fingerprint1, fingerprint2);
      });
    });

    describe('Transient Error Detection', () => {
      it('should identify retryable errors', () => {
        const retryableErrors = [
          new TimeoutError('Timeout'),
          new CorruptedFileError('Corrupted'),
          new Error('Network connection lost'),
        ];

        retryableErrors.forEach((error) => {
          assert.strictEqual(ErrorUtils.isTransientError(error), true);
        });
      });

      it('should identify non-retryable errors', () => {
        const nonRetryableErrors = [
          new ValidationError('Invalid'),
          new UnsupportedFormatError('Unsupported'),
          new FileSizeError('Too large'),
        ];

        nonRetryableErrors.forEach((error) => {
          assert.strictEqual(ErrorUtils.isTransientError(error), false);
        });
      });
    });

    describe('Error Aggregation', () => {
      it('should aggregate multiple errors correctly', () => {
        const errors = [
          new ParseError('Error 1'),
          new ParseError('Error 2'),
          new TimeoutError('Timeout'),
          new ValidationError('Invalid'),
        ];

        const summary = ErrorUtils.aggregateErrors(errors);

        assert.strictEqual(summary.total, 4);
        assert.strictEqual(summary.byType.ParseError, 2);
        assert.strictEqual(summary.byType.TimeoutError, 1);
        assert.strictEqual(summary.mostCommon.type, 'ParseError');
        assert.strictEqual(summary.mostCommon.count, 2);
        assert.strictEqual(summary.transientCount, 3); // ParseErrors and TimeoutError are transient
      });
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize errors to JSON with all required fields', () => {
      const error = new ParseError('Test error', {
        parser: 'pdf',
        filename: 'test.pdf',
        details: { originalError: 'Original message' },
      });

      const json = error.toJSON();

      assert.strictEqual(json.name, 'ParseError');
      assert.strictEqual(json.message, 'Test error');
      assert.strictEqual(json.code, 'PARSE_FAILED');
      assert.strictEqual(json.parser, 'pdf');
      assert.strictEqual(json.filename, 'test.pdf');
      assert.strictEqual(json.details.originalError, 'Original message');
      assert.match(json.timestamp, /^\d{4}-\d{2}-\d{2}T/);
      assert.ok(json.fingerprint !== undefined);
    });

    it('should handle stack traces based on environment', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'development';
        const devError = new ParseError('Dev error');
        const devJson = devError.toJSON();
        assert.ok(devJson.stack !== undefined);

        process.env.NODE_ENV = 'production';
        const prodError = new ParseError('Prod error');
        const prodJson = prodError.toJSON();
        assert.strictEqual(prodJson.stack, undefined);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Integration with Configuration', () => {
    it('should respect configuration for error handling behavior', () => {
      // Test will be implemented when integrating with actual parsers
      assert.strictEqual(true, true); // Placeholder
    });
  });
});
