/**
 * Simplified tests for PDF parser implementation - focused on working functionality
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import PDFParser from '../../src/parsers/pdf.js';
import BaseParser from '../../src/parsers/base.js';
import { ParseError, UnsupportedFormatError } from '../../src/utils/errors.js';

// Mock PDF data for testing
const createMockPDFData = (options = {}) => {
  const { pages = 1, hasText = true, hasMetadata = true, hasFormFields = false } = options;

  const mockPages = [];
  for (let i = 0; i < pages; i++) {
    const pageTexts = hasText
      ? [
          {
            x: 1.0,
            y: 10.0,
            R: [{ T: 'Sample%20PDF%20Text%20' }, { T: 'on%20page%20' }, { T: (i + 1).toString() }],
          },
          {
            x: 1.0,
            y: 8.0,
            R: [{ T: 'This%20is%20a%20test%20document%20' }, { T: 'with%20multiple%20lines.' }],
          },
        ]
      : [];

    const pageFields = hasFormFields
      ? [
          {
            name: 'textField1',
            type: 'text',
            value: 'Test Value',
            x: 2.0,
            y: 5.0,
            w: 5.0,
            h: 1.0,
          },
        ]
      : [];

    mockPages.push({
      Texts: pageTexts,
      Fields: pageFields,
    });
  }

  return {
    Pages: mockPages,
    Meta: hasMetadata
      ? {
          PDFFormatVersion: '1.4',
          Author: 'Test Author',
          Subject: 'Test Subject',
          Creator: 'Test Creator',
          Producer: 'Test Producer',
          CreationDate: 'D:20240101120000Z',
          ModDate: 'D:20240102120000Z',
        }
      : {},
  };
};

// Create test PDF buffers
const createTestPDFBuffer = (content = 'simple') => {
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `Test PDF content: ${content}`;
  return Buffer.from(pdfHeader + pdfContent);
};

describe('PDFParser Basic Functionality', () => {
  test('should extend BaseParser', () => {
    const parser = new PDFParser();
    assert.ok(parser instanceof BaseParser);
    assert.strictEqual(parser.constructor.parserName, 'pdf');
  });

  test('should have correct static properties', () => {
    assert.strictEqual(PDFParser.parserName, 'pdf');
    assert.deepStrictEqual(PDFParser.supportedTypes, ['application/pdf']);
    assert.deepStrictEqual(PDFParser.extensions, ['.pdf']);
    assert.ok(PDFParser.defaultOptions);
  });

  test('should support PDF type and extension checking', () => {
    assert.ok(PDFParser.supportsType('application/pdf'));
    assert.ok(PDFParser.supportsExtension('.pdf'));
    assert.ok(!PDFParser.supportsType('text/plain'));
    assert.ok(!PDFParser.supportsExtension('.txt'));
  });
});

describe('PDFParser Core Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
    // Mock the parsing method for controlled testing
    parser._parseWithPDFParser = async (_pdfParser, buffer) => {
      const content = buffer.toString();

      if (content.includes('encrypted')) {
        throw new Error('Password required');
      }

      if (content.includes('corrupted')) {
        throw new Error('Invalid PDF structure');
      }

      if (content.includes('empty')) {
        return createMockPDFData({ hasText: false });
      }

      if (content.includes('multi-page')) {
        return createMockPDFData({ pages: 3 });
      }

      return createMockPDFData();
    };
  });

  test('should parse simple PDF successfully', async () => {
    const testBuffer = createTestPDFBuffer('simple content');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.ok(typeof result.text === 'string');
    assert.ok(Array.isArray(result.pages));
    assert.strictEqual(result.pageCount, 1);
    assert.ok(result.metadata);
    assert.ok(result.structure);
  });

  test('should handle different input types', async () => {
    // Test with Buffer
    const testBuffer = createTestPDFBuffer('buffer test');
    let result = await parser.parse(testBuffer);
    assert.ok(result);

    // Test with File
    const testFile = new File([testBuffer], 'test.pdf', { type: 'application/pdf' });
    result = await parser.parse(testFile);
    assert.ok(result);

    // Test with ArrayBuffer
    const arrayBuffer = testBuffer.buffer.slice(
      testBuffer.byteOffset,
      testBuffer.byteOffset + testBuffer.byteLength,
    );
    result = await parser.parse(arrayBuffer);
    assert.ok(result);
  });

  test('should handle multi-page documents', async () => {
    const testBuffer = createTestPDFBuffer('multi-page content');
    const result = await parser.parse(testBuffer);

    assert.strictEqual(result.pageCount, 3);
    assert.strictEqual(result.pages.length, 3);

    result.pages.forEach((page, index) => {
      assert.strictEqual(page.pageNumber, index + 1);
      assert.ok(typeof page.text === 'string');
    });
  });

  test('should handle empty PDF', async () => {
    const testBuffer = createTestPDFBuffer('empty');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.strictEqual(result.text, '');
    assert.strictEqual(result.pageCount, 1);
  });
});

describe('PDFParser Error Handling', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
    parser._parseWithPDFParser = async (_pdfParser, buffer) => {
      const content = buffer.toString();

      if (content.includes('encrypted')) {
        throw new Error('Password required');
      }

      if (content.includes('corrupted')) {
        throw new Error('Invalid PDF structure');
      }

      return createMockPDFData();
    };
  });

  test('should handle encrypted PDFs gracefully', async () => {
    const testBuffer = createTestPDFBuffer('encrypted content');

    await assert.rejects(async () => {
      await parser.parse(testBuffer);
    }, UnsupportedFormatError);
  });

  test('should handle corrupted PDFs', async () => {
    const testBuffer = createTestPDFBuffer('corrupted content');

    await assert.rejects(async () => {
      await parser.parse(testBuffer);
    }, ParseError);
  });

  test('should handle invalid input types', async () => {
    await assert.rejects(async () => {
      await parser.parse('invalid input');
    }, ParseError);
  });
});

describe('PDFParser Text Processing Utilities', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
  });

  test('should detect headings correctly', () => {
    assert.ok(parser._isLikelyHeading('INTRODUCTION'));
    assert.ok(parser._isLikelyHeading('Chapter 1'));
    assert.ok(parser._isLikelyHeading('Summary'));

    assert.ok(
      !parser._isLikelyHeading(
        'This is a long sentence that should not be considered a heading because it is too long.',
      ),
    );
    assert.ok(!parser._isLikelyHeading('Regular text ending with period.'));
  });

  test('should detect list items correctly', () => {
    assert.ok(parser._isLikelyListItem('• First item'));
    assert.ok(parser._isLikelyListItem('1. Numbered item'));
    assert.ok(parser._isLikelyListItem('a) Lettered item'));
    assert.ok(parser._isLikelyListItem('- Dash item'));

    assert.ok(!parser._isLikelyListItem('Regular text'));
    assert.ok(!parser._isLikelyListItem('Not a list'));
  });

  test('should normalize text correctly', () => {
    const messyText = '  \r\n\r\nHello    World  \n\n\n\nNext paragraph  ';
    const normalized = parser._normalizeText(messyText);

    assert.ok(normalized.startsWith('Hello World'));
    assert.ok(normalized.endsWith('Next paragraph'));
    assert.ok(!normalized.includes('\r'));
    assert.ok(!normalized.includes('   ')); // No triple spaces
  });

  test('should parse PDF dates correctly', () => {
    const validDate = parser._parsePDFDate('D:20240101120000Z');
    assert.ok(validDate instanceof Date);
    assert.strictEqual(validDate.getFullYear(), 2024);

    const invalidDate = parser._parsePDFDate('invalid');
    assert.strictEqual(invalidDate, null);
  });

  test('should clean metadata values correctly', () => {
    assert.strictEqual(parser._cleanMetadataValue('(Author Name)'), 'Author Name');
    assert.strictEqual(parser._cleanMetadataValue('D:20240101'), '20240101');
    assert.strictEqual(parser._cleanMetadataValue('  Spaced  '), 'Spaced');
    assert.strictEqual(parser._cleanMetadataValue(''), '');
  });
});

describe('PDFParser Metadata Extraction', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
    parser._parseWithPDFParser = async () => {
      return createMockPDFData({ hasMetadata: true });
    };
  });

  test('should extract basic PDF metadata', async () => {
    const testBuffer = createTestPDFBuffer('metadata test');
    const result = await parser.parse(testBuffer);

    assert.ok(result.metadata);
    assert.ok(typeof result.metadata.pageCount === 'number');
    assert.strictEqual(result.metadata.pageCount, 1);
  });

  test('should extract enhanced metadata via extractMetadata method', async () => {
    const testBuffer = createTestPDFBuffer('enhanced metadata');
    const metadata = await parser.extractMetadata(testBuffer);

    assert.ok(metadata);
    assert.strictEqual(metadata.parser, 'pdf');
    assert.ok(typeof metadata.pages === 'number');
  });
});

describe('PDFParser Integration', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
    parser._parseWithPDFParser = async () => createMockPDFData();
  });

  test('should work with parseWithValidation workflow', async () => {
    const testFile = new File([createTestPDFBuffer('integration test')], 'test.pdf', {
      type: 'application/pdf',
    });

    const result = await parser.parseWithValidation(testFile);

    assert.ok(result.success);
    assert.strictEqual(result.parser, 'pdf');
    assert.ok(result.data.text !== undefined);
    assert.ok(result.data.statistics);
    assert.ok(result.processingTime >= 0);
  });

  test('should track statistics correctly', async () => {
    const testBuffer = createTestPDFBuffer('stats test');

    await parser.parseWithValidation(testBuffer);

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 1);
    assert.strictEqual(stats.successes, 1);
    assert.strictEqual(stats.errors, 0);
    assert.ok(stats.totalProcessingTime >= 0);
  });
});
