/**
 * Tests for BaseParser class and related utilities
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import BaseParser from '../../src/parsers/base.js';
import {
  ParseError,
  ValidationError,
  TimeoutError,
  createParserError,
  isParserError,
} from '../../src/utils/errors.js';
import { ProgressReporter, createProgressFunction } from '../../src/utils/progress.js';

// Test parser implementation for testing BaseParser
class TestParser extends BaseParser {
  static parserName = 'test';
  static supportedTypes = ['text/plain', 'application/test'];
  static extensions = ['.txt', '.test'];

  async parse(input, options = {}) {
    const buffer =
      input instanceof File ? Buffer.from(await input.arrayBuffer()) : Buffer.from(input);
    const text = buffer.toString('utf8');

    if (options.shouldFail) {
      throw new Error('Intentional test failure');
    }

    if (options.shouldTimeout) {
      return new Promise(() => {}); // Never resolves
    }

    return text;
  }
}

describe('BaseParser', () => {
  test('should not allow direct instantiation', () => {
    assert.throws(() => {
      new BaseParser();
    }, /BaseParser is abstract/);
  });

  test('should allow subclass instantiation', () => {
    const parser = new TestParser();
    assert.ok(parser instanceof BaseParser);
    assert.strictEqual(parser.constructor.parserName, 'test');
  });

  test('should require parse method implementation', async () => {
    class IncompleteParser extends BaseParser {
      static parserName = 'incomplete';
    }

    const parser = new IncompleteParser();

    await assert.rejects(async () => {
      await parser.parse('test');
    }, /parse\(\) method must be implemented/);
  });

  test('should support type checking', () => {
    assert.ok(TestParser.supportsType('text/plain'));
    assert.ok(TestParser.supportsType('application/test'));
    assert.ok(!TestParser.supportsType('application/pdf'));
  });

  test('should support extension checking', () => {
    assert.ok(TestParser.supportsExtension('.txt'));
    assert.ok(TestParser.supportsExtension('.test'));
    assert.ok(!TestParser.supportsExtension('.pdf'));
  });
});

describe('BaseParser validation', () => {
  let parser;

  beforeEach(() => {
    parser = new TestParser();
  });

  test('should validate file input', async () => {
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const result = await parser.validate(testFile);

    assert.ok(result.valid);
    assert.strictEqual(result.errors.length, 0);
  });

  test('should reject oversized files', async () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

    const result = await parser.validate(largeFile, { maxSize: 10 * 1024 * 1024 });

    assert.ok(!result.valid);
    assert.ok(result.errors.some((error) => error.includes('exceeds maximum')));
  });

  test('should reject unsupported types', async () => {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    const result = await parser.validate(testFile);

    assert.ok(!result.valid);
    assert.ok(result.errors.some((error) => error.includes('not allowed')));
  });

  test('should reject empty files', async () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });

    const result = await parser.validate(emptyFile);

    assert.ok(!result.valid);
    assert.ok(result.errors.some((error) => error.includes('empty')));
  });
});

describe('BaseParser parsing workflow', () => {
  let parser;

  beforeEach(() => {
    parser = new TestParser();
  });

  test('should parse valid file successfully', async () => {
    const testFile = new File(['Hello world'], 'test.txt', { type: 'text/plain' });

    const result = await parser.parseWithValidation(testFile);

    assert.ok(result.success);
    assert.strictEqual(result.data.text, 'Hello world');
    assert.strictEqual(result.parser, 'test');
    assert.ok(result.processingTime >= 0);
    assert.ok(result.data.statistics);
    assert.strictEqual(result.data.statistics.characters, 11);
    assert.strictEqual(result.data.statistics.words, 2);
  });

  test('should include metadata when requested', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    const result = await parser.parseWithValidation(testFile, { extractMetadata: true });

    assert.ok(result.data.metadata);
    assert.strictEqual(result.data.metadata.filename, 'test.txt');
    assert.strictEqual(result.data.metadata.parser, 'test');
    assert.ok(result.data.metadata.extractedAt);
  });

  test('should handle parsing errors gracefully', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    await assert.rejects(async () => {
      await parser.parseWithValidation(testFile, { shouldFail: true });
    }, ParseError);
  });

  test('should handle validation errors', async () => {
    const testFile = new File([''], 'empty.txt', { type: 'text/plain' });

    await assert.rejects(async () => {
      await parser.parseWithValidation(testFile);
    }, ValidationError);
  });

  test('should handle timeout', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    await assert.rejects(async () => {
      await parser.parseWithValidation(testFile, {
        shouldTimeout: true,
        timeout: 100,
      });
    }, TimeoutError);
  });

  test('should report progress during parsing', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const progressReports = [];

    const result = await parser.parseWithValidation(testFile, {
      onProgress: (progress, message) => {
        progressReports.push({ progress, message });
      },
    });

    assert.ok(result.success);
    assert.ok(progressReports.length > 0);
    assert.ok(progressReports.some((report) => report.progress === 100));
  });
});

describe('BaseParser statistics', () => {
  let parser;

  beforeEach(() => {
    parser = new TestParser();
  });

  test('should track parsing statistics', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    await parser.parseWithValidation(testFile);

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 1);
    assert.strictEqual(stats.successes, 1);
    assert.strictEqual(stats.errors, 0);
    assert.ok(stats.totalProcessingTime > 0);
  });

  test('should track errors in statistics', async () => {
    const testFile = new File([''], 'empty.txt', { type: 'text/plain' });

    try {
      await parser.parseWithValidation(testFile);
    } catch {
      // Expected to fail
    }

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 1);
    assert.strictEqual(stats.successes, 0);
    assert.strictEqual(stats.errors, 1);
  });

  test('should reset statistics', async () => {
    const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    await parser.parseWithValidation(testFile);
    parser.resetStats();

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 0);
    assert.strictEqual(stats.successes, 0);
    assert.strictEqual(stats.errors, 0);
  });
});

describe('BaseParser result creation', () => {
  let parser;

  beforeEach(() => {
    parser = new TestParser();
  });

  test('should create result from string text', () => {
    const result = parser.createResult('Hello world', {
      processingTime: 100,
      metadata: { test: true },
    });

    assert.ok(result.success);
    assert.strictEqual(result.data.text, 'Hello world');
    assert.strictEqual(result.processingTime, 100);
    assert.strictEqual(result.data.metadata.test, true);
    assert.strictEqual(result.data.metadata.format, 'test');
    assert.ok(result.data.statistics);
  });

  test('should create result from object', () => {
    const resultData = {
      text: 'content',
      extra: 'data',
    };

    const result = parser.createResult(resultData);

    assert.ok(result.success);
    assert.strictEqual(result.data.text, 'content');
    assert.strictEqual(result.data.extra, 'data');
  });

  test('should calculate text statistics correctly', () => {
    const text = 'Hello world.\nThis is a test.\nWith multiple lines.';
    const result = parser.createResult(text);

    const stats = result.data.statistics;
    assert.ok(stats.characters > 0);
    assert.ok(stats.words > 0);
    assert.ok(stats.lines >= 3);
    assert.ok(stats.sentences >= 3);
  });

  test('should create error result', () => {
    const error = new ParseError('Test error', { details: { code: 'TEST' } });
    const result = parser.createErrorResult(error, { processingTime: 50 });

    assert.ok(!result.success);
    assert.strictEqual(result.error, 'Test error');
    assert.strictEqual(result.errorCode, 'PARSE_FAILED');
    assert.strictEqual(result.processingTime, 50);
    assert.ok(result.details);
  });
});

describe('Error utilities', () => {
  test('should create appropriate parser errors', () => {
    const timeoutError = new Error('Operation timed out');
    const parserError = createParserError(timeoutError, { parser: 'test' });

    assert.ok(parserError instanceof TimeoutError);
    assert.strictEqual(parserError.parser, 'test');
  });

  test('should detect parser errors', () => {
    const parseError = new ParseError('Test');
    const regularError = new Error('Test');

    assert.ok(isParserError(parseError));
    assert.ok(!isParserError(regularError));
  });

  test('should return existing parser errors unchanged', () => {
    const original = new ValidationError('Original error');
    const result = createParserError(original);

    assert.strictEqual(result, original);
  });
});

describe('Progress utilities', () => {
  test('should create progress reporter', () => {
    let lastProgress = null;

    const reporter = new ProgressReporter(
      (progress) => {
        lastProgress = progress;
      },
      { updateInterval: 0 },
    ); // Disable throttling

    reporter.update(50, 'Half way');

    assert.ok(lastProgress !== null, 'Progress should not be null');
    assert.strictEqual(lastProgress.progress, 50);
    assert.strictEqual(lastProgress.message, 'Half way');
    assert.ok(lastProgress.elapsed >= 0);
  });

  test('should create progress function', () => {
    const reports = [];

    const progressFn = createProgressFunction(
      (progress) => {
        reports.push(progress);
      },
      [],
      { updateInterval: 0 },
    ); // Disable throttling

    // Call with numeric progress
    progressFn(0, 'Starting');
    progressFn(100, 'Complete');

    assert.strictEqual(reports.length, 2);
    assert.strictEqual(reports[0].percentage, 0);
    assert.strictEqual(reports[1].percentage, 100);
  });

  test('should handle stage-based progress', () => {
    const reports = [];
    const stages = ['start', 'middle', 'end'];

    const reporter = new ProgressReporter(
      (progress) => {
        reports.push(progress);
      },
      { stages, updateInterval: 0 },
    ); // Disable throttling

    // Ensure reporter actually reports progress
    reporter.update(50, 'Middle stage');

    assert.ok(reports.length > 0);
    assert.strictEqual(reports[reports.length - 1].message, 'Middle stage');
  });
});
