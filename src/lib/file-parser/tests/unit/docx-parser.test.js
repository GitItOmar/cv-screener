/**
 * Tests for DOCX parser implementation
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import DOCXParser from '../../src/parsers/docx.js';
import BaseParser from '../../src/parsers/base.js';
import { ParseError, CorruptedFileError } from '../../src/utils/errors.js';

// Mock DOCX data for testing - simulating mammoth output
const createMockMammothResult = (options = {}) => {
  const {
    hasText = true,
    hasImages = false,
    hasTables = false,
    hasHeadings = true,
    isCorrupted = false,
  } = options;

  if (isCorrupted) {
    return null; // Simulates corrupted file
  }

  let htmlValue = '';
  const messages = [];

  if (hasText) {
    htmlValue += '<p>This is a sample DOCX document with some content.</p>';

    if (hasHeadings) {
      htmlValue = `<h1>Document Title</h1><h2>Section Heading</h2>${htmlValue}`;
      htmlValue += '<h3>Subsection</h3><p>More content here.</p>';
    }

    htmlValue +=
      '<p>Another paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>';

    // Add lists
    htmlValue += '<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>';
    htmlValue += '<ol><li>Numbered item one</li><li>Numbered item two</li></ol>';
  }

  if (hasTables) {
    htmlValue +=
      '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
  }

  if (hasImages) {
    messages.push({
      type: 'warning',
      message: 'The image with ID "image1" was dropped because the image could not be found.',
    });
  }

  return {
    value: htmlValue,
    messages,
  };
};

// Create test DOCX buffers (simplified representation)
const createTestDOCXBuffer = (content = 'simple') => {
  // This is a very basic DOCX-like buffer for testing
  // In real tests, you would use actual DOCX files
  const docxHeader = 'PK'; // ZIP file signature (DOCX is a ZIP file)
  const docxContent = `Mock DOCX content: ${content}`;
  return Buffer.from(docxHeader + docxContent);
};

describe('DOCXParser Basic Functionality', () => {
  test('should extend BaseParser', () => {
    const parser = new DOCXParser();
    assert.ok(parser instanceof BaseParser);
    assert.strictEqual(parser.constructor.parserName, 'docx');
  });

  test('should have correct static properties', () => {
    assert.strictEqual(DOCXParser.parserName, 'docx');
    assert.ok(
      DOCXParser.supportedTypes.includes(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );
    assert.deepStrictEqual(DOCXParser.extensions, ['.docx', '.docm']);
    assert.ok(DOCXParser.defaultOptions);
    assert.ok(typeof DOCXParser.defaultOptions.timeout === 'number');
  });

  test('should support DOCX type and extension checking', () => {
    assert.ok(
      DOCXParser.supportsType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );
    assert.ok(DOCXParser.supportsExtension('.docx'));
    assert.ok(DOCXParser.supportsExtension('.docm'));
    assert.ok(!DOCXParser.supportsType('application/pdf'));
    assert.ok(!DOCXParser.supportsExtension('.pdf'));
  });
});

describe('DOCXParser Core Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
    // Mock the mammoth parsing method for controlled testing
    parser._parseWithMammoth = async (_buffer) => {
      const bufferContent = _buffer.toString();

      if (bufferContent.includes('corrupted')) {
        throw new Error('not a valid zip file');
      }

      if (bufferContent.includes('empty')) {
        return createMockMammothResult({ hasText: false });
      }

      if (bufferContent.includes('with-images')) {
        return createMockMammothResult({ hasImages: true });
      }

      if (bufferContent.includes('with-tables')) {
        return createMockMammothResult({ hasTables: true });
      }

      if (bufferContent.includes('complex')) {
        return createMockMammothResult({
          hasImages: true,
          hasTables: true,
          hasHeadings: true,
        });
      }

      return createMockMammothResult();
    };
  });

  test('should parse simple DOCX successfully', async () => {
    const testBuffer = createTestDOCXBuffer('simple content');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.ok(typeof result.text === 'string');
    assert.ok(typeof result.html === 'string');
    assert.ok(result.structure);
    assert.ok(Array.isArray(result.structure.headings));
    assert.ok(Array.isArray(result.structure.paragraphs));
    assert.ok(Array.isArray(result.structure.lists));
    assert.ok(Array.isArray(result.tables));
    assert.ok(result.metadata);
  });

  test('should handle different input types', async () => {
    // Test with Buffer
    const testBuffer = createTestDOCXBuffer('buffer test');
    let result = await parser.parse(testBuffer);
    assert.ok(result);

    // Test with File
    const testFile = new File([testBuffer], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
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

  test('should extract document structure', async () => {
    const testBuffer = createTestDOCXBuffer('structured content');
    const result = await parser.parse(testBuffer);

    assert.ok(result.structure);
    assert.ok(result.structure.headings.length > 0);
    assert.ok(result.structure.paragraphs.length > 0);
    assert.ok(result.structure.lists.length > 0);

    // Check heading structure
    const headings = result.structure.headings;
    assert.ok(headings.some((h) => h.level === 1));
    assert.ok(headings.some((h) => h.level === 2));
    assert.ok(headings.every((h) => typeof h.text === 'string'));
  });

  test('should handle documents with tables', async () => {
    const testBuffer = createTestDOCXBuffer('with-tables content');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.ok(Array.isArray(result.tables));
    assert.ok(result.tables.length > 0);

    const table = result.tables[0];
    assert.ok(table.html);
    assert.ok(table.text);
    assert.ok(Array.isArray(table.rows));
  });

  test('should handle documents with images', async () => {
    const testBuffer = createTestDOCXBuffer('with-images content');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.ok(Array.isArray(result.images));
    assert.ok(Array.isArray(result.messages));
    assert.ok(result.messages.some((m) => m.message && m.message.includes('image')));
  });

  test('should handle empty documents', async () => {
    const testBuffer = createTestDOCXBuffer('empty');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.strictEqual(result.text.trim(), '');
    assert.strictEqual(result.html.trim(), '');
  });

  test('should handle complex documents', async () => {
    const testBuffer = createTestDOCXBuffer('complex content');
    const result = await parser.parse(testBuffer);

    assert.ok(result);
    assert.ok(result.text.length > 0);
    assert.ok(result.structure.headings.length > 0);
    assert.ok(result.tables.length > 0);
    assert.ok(result.images.length >= 0);
    assert.ok(result.metadata.tables > 0);
  });

  test('should report progress during parsing', async () => {
    const testBuffer = createTestDOCXBuffer('progress test');
    const progressReports = [];

    const result = await parser.parse(testBuffer, {
      onProgress: (progress, message) => {
        progressReports.push({ progress, message });
      },
    });

    assert.ok(result);
    assert.ok(progressReports.length > 0);

    // Check that progress increases
    let lastProgress = -1;
    progressReports.forEach((report) => {
      assert.ok(report.progress >= lastProgress);
      lastProgress = report.progress;
    });

    // Should reach 90%+
    assert.ok(progressReports.some((report) => report.progress >= 90));
  });
});

describe('DOCXParser Error Handling', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
    parser._parseWithMammoth = async (_buffer) => {
      const bufferContent = _buffer.toString();

      if (bufferContent.includes('corrupted')) {
        throw new Error('not a valid zip file');
      }

      if (bufferContent.includes('invalid-signature')) {
        throw new Error('invalid signature');
      }

      if (bufferContent.includes('timeout')) {
        return new Promise(() => {}); // Never resolves
      }

      return createMockMammothResult();
    };
  });

  test('should handle corrupted DOCX files gracefully', async () => {
    const testBuffer = createTestDOCXBuffer('corrupted content');

    await assert.rejects(async () => {
      await parser.parse(testBuffer);
    }, CorruptedFileError);
  });

  test('should handle invalid DOCX files', async () => {
    const testBuffer = createTestDOCXBuffer('invalid-signature content');

    await assert.rejects(async () => {
      await parser.parse(testBuffer);
    }, CorruptedFileError);
  });

  test('should handle invalid input types', async () => {
    await assert.rejects(async () => {
      await parser.parse('invalid input');
    }, ParseError);
  });
});

describe('DOCXParser Text Processing', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
  });

  test('should convert HTML to plain text correctly', () => {
    const html =
      '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
    const text = parser._htmlToText(html);

    assert.ok(text.includes('Title'));
    assert.ok(text.includes('Paragraph with bold text'));
    assert.ok(text.includes('• Item 1'));
    assert.ok(text.includes('• Item 2'));
    assert.ok(!text.includes('<'));
    assert.ok(!text.includes('>'));
  });

  test('should extract structure from HTML correctly', () => {
    const html = '<h1>Main Title</h1><h2>Subtitle</h2><p>Content</p><ul><li>List item</li></ul>';
    const structure = parser._extractStructure(html);

    assert.ok(structure.headings.length === 2);
    assert.strictEqual(structure.headings[0].level, 1);
    assert.strictEqual(structure.headings[0].text, 'Main Title');
    assert.strictEqual(structure.headings[1].level, 2);
    assert.strictEqual(structure.headings[1].text, 'Subtitle');

    assert.ok(structure.paragraphs.length > 0);
    assert.ok(structure.paragraphs.includes('Content'));

    assert.ok(structure.lists.length > 0);
    assert.strictEqual(structure.lists[0].type, 'unordered');
    assert.ok(structure.lists[0].items.includes('List item'));
  });

  test('should extract tables correctly', () => {
    const html =
      '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const tables = parser._extractTables(html);

    assert.ok(tables.length === 1);
    const table = tables[0];
    assert.ok(table.html.includes('<table>'));
    assert.ok(table.text.includes('Header 1'));
    assert.ok(table.text.includes('Cell 1'));
    assert.strictEqual(table.rows.length, 2);
    assert.strictEqual(table.rows[0].cells.length, 2);
  });

  test('should clean text content correctly', () => {
    const dirtyText = '<p>Text with &amp; entities &lt;tags&gt;</p>';
    const cleanText = parser._cleanTextContent(dirtyText);

    assert.strictEqual(cleanText, 'Text with & entities <tags>');
    assert.ok(!cleanText.includes('<p>'));
    assert.ok(!cleanText.includes('&amp;'));
  });

  test('should handle empty or null content', () => {
    assert.strictEqual(parser._htmlToText(''), '');
    assert.strictEqual(parser._htmlToText(null), '');
    assert.strictEqual(parser._cleanTextContent(''), '');
    assert.strictEqual(parser._cleanTextContent(null), '');

    const emptyStructure = parser._extractStructure('');
    assert.ok(Array.isArray(emptyStructure.headings));
    assert.strictEqual(emptyStructure.headings.length, 0);
  });
});

describe('DOCXParser Metadata Extraction', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
    parser._parseWithMammoth = async () => {
      return createMockMammothResult({ hasText: true, hasTables: true });
    };
  });

  test('should extract document metadata', async () => {
    const testBuffer = createTestDOCXBuffer('metadata test');
    const result = await parser.parse(testBuffer);

    assert.ok(result.metadata);
    assert.ok(typeof result.metadata.words === 'number');
    assert.ok(typeof result.metadata.characters === 'number');
    assert.ok(typeof result.metadata.paragraphs === 'number');
    assert.ok(typeof result.metadata.tables === 'number');
    assert.strictEqual(result.metadata.application, 'Microsoft Word');
  });

  test('should extract enhanced metadata via extractMetadata method', async () => {
    const testBuffer = createTestDOCXBuffer('enhanced metadata');
    const metadata = await parser.extractMetadata(testBuffer);

    assert.ok(metadata);
    assert.strictEqual(metadata.parser, 'docx');
    assert.strictEqual(metadata.format, 'docx');
    assert.ok(typeof metadata.hasImages === 'boolean');
    assert.ok(typeof metadata.hasTables === 'boolean');
  });

  test('should handle metadata extraction errors gracefully', async () => {
    parser._parseWithMammoth = async () => {
      throw new Error('Metadata extraction failed');
    };

    const testBuffer = createTestDOCXBuffer('error test');
    const metadata = await parser.extractMetadata(testBuffer);

    // Should still return basic metadata
    assert.ok(metadata);
    assert.ok(metadata.error);
    assert.ok(metadata.error.includes('Metadata extraction failed'));
  });

  test('should calculate text statistics correctly', async () => {
    const testBuffer = createTestDOCXBuffer('stats test');
    const result = await parser.parse(testBuffer);

    const metadata = result.metadata;
    assert.ok(metadata.words > 0);
    assert.ok(metadata.characters > metadata.words); // Should have more chars than words
    assert.ok(metadata.paragraphs >= 1);
  });
});

describe('DOCXParser Integration with BaseParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
    parser._parseWithMammoth = async () => createMockMammothResult();
  });

  test('should work with parseWithValidation workflow', async () => {
    const testFile = new File([createTestDOCXBuffer('integration test')], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await parser.parseWithValidation(testFile);

    assert.ok(result.success);
    assert.strictEqual(result.parser, 'docx');
    assert.ok(result.data.text !== undefined);
    assert.ok(result.data.statistics);
    assert.ok(result.processingTime >= 0);
  });

  test('should track statistics correctly', async () => {
    const testFile = new File([createTestDOCXBuffer('stats test')], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await parser.parseWithValidation(testFile);

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 1);
    assert.strictEqual(stats.successes, 1);
    assert.strictEqual(stats.errors, 0);
    assert.ok(stats.totalProcessingTime >= 0);
  });

  test('should handle validation errors', async () => {
    const invalidFile = new File(['not a docx'], 'test.txt', { type: 'text/plain' });

    await assert.rejects(async () => {
      await parser.parseWithValidation(invalidFile);
    });

    const stats = parser.getStats();
    assert.strictEqual(stats.filesProcessed, 1);
    assert.strictEqual(stats.successes, 0);
    assert.strictEqual(stats.errors, 1);
  });
});

describe('DOCXParser Mammoth Options', () => {
  let parser;

  beforeEach(() => {
    parser = new DOCXParser();
  });

  test('should build mammoth options correctly', () => {
    const options = parser._buildMammothOptions({
      convertImage: null,
      ignoreEmptyParagraphs: true,
      styleMap: ['custom mapping'],
    });

    assert.ok(options);
    assert.strictEqual(options.ignoreEmptyParagraphs, true);
    assert.ok(Array.isArray(options.styleMap));
    assert.ok(options.styleMap.includes('custom mapping'));
  });

  test('should use default style mappings when none provided', () => {
    const options = parser._buildMammothOptions({});

    assert.ok(Array.isArray(options.styleMap));
    assert.ok(options.styleMap.length > 0);
    assert.ok(options.styleMap.some((mapping) => mapping.includes('Heading 1')));
  });
});
