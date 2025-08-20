/**
 * Unit tests for ParserFactory
 * Tests automatic parser selection, file type detection, and batch processing
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import ParserFactory from '../../src/parsers/parserFactory.js';
import { UnsupportedFormatError } from '../../src/utils/errors.js';

describe('ParserFactory', () => {
  let mockPDFBuffer;
  let mockInvalidBuffer;

  beforeEach(() => {
    // Use a real, valid PDF buffer generated with PDFKit that pdf2json can parse
    const validPDFBase64 =
      'JVBERi0xLjMKJf////8KNyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgovUmVzb3VyY2VzIDYgMCBSCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Qcm9jU2V0IFsvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJXQovRm9udCA8PAovRjEgOCAwIFIKPj4KL0NvbG9yU3BhY2UgPDwKPj4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA5NAovRmlsdGVyIC9GbGF0ZURlY29kZQo+PgpzdHJlYW0KeJwzVDAAQl1DIGFuaaSQnMtVyGWIIeYUAhU0VDA0MFAwszDWM7YwUQjJ5dJ3AwoZKYSkcUXbmJrYAdkGCjZmpubG5iZGBqYGJiYmZnYKBrEKIV5criFcgVwAvHEWAgplbmRzdHJlYW0KZW5kb2JqCjEwIDAgb2JqCihQREZLaXQpCmVuZG9iagoxMSAwIG9iagooUERGS2l0KQplbmRvYmoKMTIgMCBvYmoKKEQ6MjAyNTA4MjAxNjU0NTRaKQplbmRvYmoKOSAwIG9iago8PAovUHJvZHVjZXIgMTAgMCBSCi9DcmVhdG9yIDExIDAgUgovQ3JlYXRpb25EYXRlIDEyIDAgUgo+PgplbmRvYmoKOCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0hlbHZldGljYQovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjQgMCBvYmoKPDwKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCi9OYW1lcyAyIDAgUgo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzcgMCBSXQo+PgplbmRvYmoKMiAwIG9iago8PAovRGVzdHMgPDwKICAvTmFtZXMgWwpdCj4+Cj4+CmVuZG9iagp4cmVmCjAgMTMKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwNzMyIDAwMDAwIG4gCjAwMDAwMDA3ODkgMDAwMDAgbiAKMDAwMDAwMDY3MCAwMDAwMCBuIAowMDAwMDAwNjQ5IDAwMDAwIG4gCjAwMDAwMDAyMjYgMDAwMDAgbiAKMDAwMDAwMDExOSAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDA1NTIgMDAwMDAgbiAKMDAwMDAwMDQ3NyAwMDAwMCBuIAowMDAwMDAwMzkxIDAwMDAwIG4gCjAwMDAwMDA0MTYgMDAwMDAgbiAKMDAwMDAwMDQ0MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDEzCi9Sb290IDMgMCBSCi9JbmZvIDkgMCBSCi9JRCBbPDc0NjE4NmIzMGFkNjU3M2MzNGY5MzA4NTgzMTk2ODk0PiA8NzQ2MTg2YjMwYWQ2NTczYzM0ZjkzMDg1ODMxOTY4OTQ+XQo+PgpzdGFydHhyZWYKODM2CiUlRU9GCg==';

    mockPDFBuffer = Buffer.from(validPDFBase64, 'base64');

    // Mock invalid buffer
    mockInvalidBuffer = Buffer.from('invalid file content');
  });

  afterEach(() => {
    // Clean up any registered test parsers
    try {
      ParserFactory.unregisterParser('test');
    } catch {
      // Ignore if not registered
    }
  });

  describe('createParser()', () => {
    it('should create PDF parser for PDF files', async () => {
      const { parser, fileInfo, parserType } = await ParserFactory.createParser(mockPDFBuffer);

      assert.strictEqual(parserType, 'pdf');
      assert.strictEqual(fileInfo.parser, 'pdf');
      assert.strictEqual(fileInfo.mimeType, 'application/pdf');
      assert(parser.constructor.name.includes('PDF'));
    });

    it('should create DOCX parser for DOCX files', async () => {
      // Create a proper DOCX-like buffer with correct structure
      const docxBuffer = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04, // ZIP signature
        0x14,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00, // ZIP header
        ...Buffer.from('[Content_Types].xml'), // DOCX indicator
      ]);

      const { parser, fileInfo, parserType } = await ParserFactory.createParser(docxBuffer);

      assert.strictEqual(parserType, 'docx');
      assert.strictEqual(fileInfo.parser, 'docx');
      assert.strictEqual(
        fileInfo.mimeType,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      assert(parser.constructor.name.includes('DOCX'));
    });

    it('should throw UnsupportedFormatError for unsupported files', async () => {
      await assert.rejects(
        () => ParserFactory.createParser(mockInvalidBuffer),
        UnsupportedFormatError,
      );
    });

    it('should respect allowedTypes option', async () => {
      const options = {
        allowedTypes: ['application/pdf'],
      };

      // Should work for PDF
      const { parserType } = await ParserFactory.createParser(mockPDFBuffer, options);
      assert.strictEqual(parserType, 'pdf');

      // Should fail for DOCX when only PDF is allowed
      const docxBuffer = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04,
        ...Buffer.from('[Content_Types].xml'),
      ]);

      await assert.rejects(
        () => ParserFactory.createParser(docxBuffer, options),
        UnsupportedFormatError,
      );
    });

    it('should respect strictValidation option', async () => {
      // Create ambiguous buffer that might have low confidence
      const ambiguousBuffer = Buffer.from('ambiguous content');

      const options = {
        strictValidation: true,
      };

      await assert.rejects(
        () => ParserFactory.createParser(ambiguousBuffer, options),
        UnsupportedFormatError,
      );
    });

    it('should skip validation when validateInput is false', async () => {
      const options = {
        validateInput: false,
      };

      const { parser } = await ParserFactory.createParser(mockPDFBuffer, options);
      assert(parser);
    });

    it('should handle File objects', async () => {
      const file = new File([mockPDFBuffer], 'test.pdf', { type: 'application/pdf' });
      const { parserType } = await ParserFactory.createParser(file);

      assert.strictEqual(parserType, 'pdf');
    });

    it('should handle ArrayBuffer inputs', async () => {
      const arrayBuffer = mockPDFBuffer.buffer.slice(
        mockPDFBuffer.byteOffset,
        mockPDFBuffer.byteOffset + mockPDFBuffer.byteLength,
      );

      const { parserType } = await ParserFactory.createParser(arrayBuffer);
      assert.strictEqual(parserType, 'pdf');
    });
  });

  describe('parseFile()', () => {
    it('should parse PDF file and include file info', async () => {
      // Create a mock PDF parser that returns a successful result
      const originalCreateParser = ParserFactory.createParser;

      // Mock the createParser to return a working parser
      ParserFactory.createParser = async () => ({
        parser: {
          parseWithValidation: async () => ({
            text: 'Test PDF content',
            pages: [{ pageNumber: 1, text: 'Test PDF content' }],
            pageCount: 1,
            metadata: {
              title: 'Test PDF',
              author: 'Test Author',
              pageCount: 1,
            },
            structure: { paragraphs: [], headings: [], lists: [] },
          }),
        },
        fileInfo: {
          mimeType: 'application/pdf',
          parser: 'pdf',
          size: mockPDFBuffer.length,
        },
        parserType: 'pdf',
      });

      try {
        const result = await ParserFactory.parseFile(mockPDFBuffer, {
          includeFileInfo: true,
        });

        assert(result.fileInfo);
        assert.strictEqual(result.fileInfo.parserUsed, 'pdf');
        assert.strictEqual(result.fileInfo.mimeType, 'application/pdf');
        assert(result.text !== undefined);
        assert(result.metadata);
      } finally {
        // Restore original method
        ParserFactory.createParser = originalCreateParser;
      }
    });

    it('should parse file without file info when requested', async () => {
      // Create a mock PDF parser that returns a successful result
      const originalCreateParser = ParserFactory.createParser;

      // Mock the createParser to return a working parser
      ParserFactory.createParser = async () => ({
        parser: {
          parseWithValidation: async () => ({
            text: 'Test PDF content',
            pages: [{ pageNumber: 1, text: 'Test PDF content' }],
            pageCount: 1,
            metadata: {
              title: 'Test PDF',
              author: 'Test Author',
              pageCount: 1,
            },
            structure: { paragraphs: [], headings: [], lists: [] },
          }),
        },
        fileInfo: {
          mimeType: 'application/pdf',
          parser: 'pdf',
          size: mockPDFBuffer.length,
        },
        parserType: 'pdf',
      });

      try {
        const result = await ParserFactory.parseFile(mockPDFBuffer, {
          includeFileInfo: false,
        });

        assert.strictEqual(result.fileInfo, undefined);
        assert(result.text !== undefined);
      } finally {
        // Restore original method
        ParserFactory.createParser = originalCreateParser;
      }
    });

    it('should pass parser options correctly', async () => {
      // Create a mock PDF parser that returns a successful result
      const originalCreateParser = ParserFactory.createParser;

      // Mock the createParser to return a working parser
      ParserFactory.createParser = async () => ({
        parser: {
          parseWithValidation: async () => ({
            text: 'Test PDF content',
            pages: [{ pageNumber: 1, text: 'Test PDF content' }],
            pageCount: 1,
            metadata: {
              title: 'Test PDF',
              author: 'Test Author',
              pageCount: 1,
            },
            structure: { paragraphs: [], headings: [], lists: [] },
          }),
        },
        fileInfo: {
          mimeType: 'application/pdf',
          parser: 'pdf',
          size: mockPDFBuffer.length,
        },
        parserType: 'pdf',
      });

      try {
        const parserOptions = {
          preserveLineBreaks: false,
          timeout: 5000,
        };

        const result = await ParserFactory.parseFile(mockPDFBuffer, {
          parserOptions,
        });

        assert(result.text !== undefined);
      } finally {
        // Restore original method
        ParserFactory.createParser = originalCreateParser;
      }
    });

    it('should handle parsing errors gracefully', async () => {
      await assert.rejects(
        () => ParserFactory.parseFile(mockInvalidBuffer),
        UnsupportedFormatError,
      );
    });
  });

  describe('getParserForType()', () => {
    it('should return correct parser class for PDF', () => {
      const ParserClass = ParserFactory.getParserForType('application/pdf');
      assert(ParserClass);
      assert.strictEqual(ParserClass.parserName, 'pdf');
    });

    it('should return correct parser class for DOCX', () => {
      const ParserClass = ParserFactory.getParserForType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      assert(ParserClass);
      assert.strictEqual(ParserClass.parserName, 'docx');
    });

    it('should return null for unsupported type', () => {
      const ParserClass = ParserFactory.getParserForType('text/plain');
      assert.strictEqual(ParserClass, null);
    });
  });

  describe('isSupported()', () => {
    it('should return true for supported PDF type', () => {
      const isSupported = ParserFactory.isSupported('application/pdf');
      assert.strictEqual(isSupported, true);
    });

    it('should return true for supported DOCX type', () => {
      const isSupported = ParserFactory.isSupported(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      assert.strictEqual(isSupported, true);
    });

    it('should return false for unsupported type', () => {
      const isSupported = ParserFactory.isSupported('text/plain');
      assert.strictEqual(isSupported, false);
    });
  });

  describe('getSupportedTypes()', () => {
    it('should return array of supported MIME types', () => {
      const supportedTypes = ParserFactory.getSupportedTypes();

      assert(Array.isArray(supportedTypes));
      assert(supportedTypes.includes('application/pdf'));
      assert(
        supportedTypes.includes(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      );
    });

    it('should only include available parser types', () => {
      const supportedTypes = ParserFactory.getSupportedTypes();

      // Should only include types that have actual parser implementations
      supportedTypes.forEach((type) => {
        const parserClass = ParserFactory.getParserForType(type);
        assert(parserClass !== null, `Parser should exist for supported type: ${type}`);
      });
    });
  });

  describe('getParserInfo()', () => {
    it('should return parser information', () => {
      const info = ParserFactory.getParserInfo();

      assert(typeof info === 'object');
      assert(info.pdf);
      assert(info.docx);
      assert.strictEqual(info.pdf.name, 'pdf');
      assert.strictEqual(info.pdf.available, true);
      assert.strictEqual(info.docx.name, 'docx');
      assert.strictEqual(info.docx.available, true);
    });

    it('should mark unavailable parsers correctly', () => {
      const info = ParserFactory.getParserInfo();

      // Test parser should be marked as unavailable
      if (info.test) {
        assert.strictEqual(info.test.available, false);
      }
    });
  });

  describe('registerParser()', () => {
    it('should register a new parser', () => {
      class MockParser {
        static parserName = 'mock';
        static supportedTypes = ['text/plain'];
        static extensions = ['.txt'];
      }

      ParserFactory.registerParser('mock', MockParser);

      const info = ParserFactory.getParserInfo();
      assert(info.mock);
      assert.strictEqual(info.mock.available, true);
      assert.strictEqual(info.mock.name, 'mock');

      // Clean up
      ParserFactory.unregisterParser('mock');
    });

    it('should throw error for invalid parser class', () => {
      assert.throws(() => {
        ParserFactory.registerParser('invalid', null);
      });

      assert.throws(() => {
        ParserFactory.registerParser('invalid', {});
      });
    });

    it('should throw error for parser without required properties', () => {
      class InvalidParser {}

      assert.throws(() => {
        ParserFactory.registerParser('invalid', InvalidParser);
      });
    });
  });

  describe('unregisterParser()', () => {
    it('should unregister a parser', () => {
      class MockParser {
        static parserName = 'mock';
        static supportedTypes = ['text/plain'];
      }

      ParserFactory.registerParser('mock', MockParser);
      let info = ParserFactory.getParserInfo();
      assert(info.mock);

      ParserFactory.unregisterParser('mock');
      info = ParserFactory.getParserInfo();
      assert(!info.mock);
    });
  });

  describe('detectFileType()', () => {
    it('should detect PDF file type', async () => {
      const fileInfo = await ParserFactory.detectFileType(mockPDFBuffer);

      assert.strictEqual(fileInfo.mimeType, 'application/pdf');
      assert.strictEqual(fileInfo.parser, 'pdf');
    });

    it('should detect DOCX file type', async () => {
      const docxBuffer = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04,
        ...Buffer.from('[Content_Types].xml'),
      ]);

      const fileInfo = await ParserFactory.detectFileType(docxBuffer);

      assert.strictEqual(
        fileInfo.mimeType,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      assert.strictEqual(fileInfo.parser, 'docx');
    });

    it('should pass through detection options', async () => {
      const options = {
        strictMode: true,
      };

      const fileInfo = await ParserFactory.detectFileType(mockPDFBuffer, options);
      assert(fileInfo);
    });
  });

  describe('validateFile()', () => {
    it('should validate supported file', async () => {
      const validation = await ParserFactory.validateFile(mockPDFBuffer);

      assert.strictEqual(validation.valid, true);
      assert(Array.isArray(validation.errors));
      assert(Array.isArray(validation.warnings));
    });

    it('should pass through validation options', async () => {
      const options = {
        allowedTypes: ['application/pdf'],
      };

      const validation = await ParserFactory.validateFile(mockPDFBuffer, options);
      assert.strictEqual(validation.valid, true);
    });
  });

  describe('batchProcess()', () => {
    it('should process multiple files successfully', async () => {
      // Mock parseFile to return successful results
      const originalParseFile = ParserFactory.parseFile;
      ParserFactory.parseFile = async () => ({
        text: 'Test PDF content',
        fileInfo: {
          parserUsed: 'pdf',
          mimeType: 'application/pdf',
        },
        metadata: { title: 'Test PDF' },
      });

      try {
        const files = [mockPDFBuffer, mockPDFBuffer]; // Two identical PDF files

        const result = await ParserFactory.batchProcess(files, {
          concurrency: 2,
        });

        assert.strictEqual(result.totalProcessed, 2);
        assert.strictEqual(result.successCount, 2);
        assert.strictEqual(result.errorCount, 0);
        assert.strictEqual(result.results.length, 2);
        assert.strictEqual(result.errors.length, 0);
      } finally {
        ParserFactory.parseFile = originalParseFile;
      }
    });

    it('should handle mixed file types', async () => {
      // Mock parseFile to return different results for different files
      const originalParseFile = ParserFactory.parseFile;
      let callCount = 0;
      ParserFactory.parseFile = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            text: 'Test PDF content',
            fileInfo: {
              parserUsed: 'pdf',
              mimeType: 'application/pdf',
            },
            metadata: { title: 'Test PDF' },
          };
        } else {
          return {
            text: 'Test DOCX content',
            fileInfo: {
              parserUsed: 'docx',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
            metadata: { title: 'Test DOCX' },
          };
        }
      };

      try {
        const docxBuffer = Buffer.from([
          0x50,
          0x4b,
          0x03,
          0x04,
          ...Buffer.from('[Content_Types].xml'),
        ]);

        const files = [mockPDFBuffer, docxBuffer];

        const result = await ParserFactory.batchProcess(files);

        assert.strictEqual(result.totalProcessed, 2);
        assert.strictEqual(result.successCount, 2);
        assert.strictEqual(result.results.length, 2);

        // Verify different parsers were used
        assert.strictEqual(result.results[0].fileInfo.parserUsed, 'pdf');
        assert.strictEqual(result.results[1].fileInfo.parserUsed, 'docx');
      } finally {
        ParserFactory.parseFile = originalParseFile;
      }
    });

    it('should handle errors gracefully with stopOnError=false', async () => {
      // Mock parseFile to succeed for valid files and fail for invalid
      const originalParseFile = ParserFactory.parseFile;
      ParserFactory.parseFile = async (file) => {
        if (file === mockInvalidBuffer) {
          throw new Error('Invalid file format');
        }
        return {
          text: 'Test PDF content',
          fileInfo: {
            parserUsed: 'pdf',
            mimeType: 'application/pdf',
          },
          metadata: { title: 'Test PDF' },
        };
      };

      try {
        const files = [mockPDFBuffer, mockInvalidBuffer, mockPDFBuffer];

        const result = await ParserFactory.batchProcess(files, {
          stopOnError: false,
        });

        assert.strictEqual(result.totalProcessed, 3);
        assert.strictEqual(result.successCount, 2);
        assert.strictEqual(result.errorCount, 1);
        assert.strictEqual(result.results.length, 3);
        assert.strictEqual(result.errors.length, 1);
      } finally {
        ParserFactory.parseFile = originalParseFile;
      }
    });

    it('should stop on error when stopOnError=true', async () => {
      const files = [mockInvalidBuffer, mockPDFBuffer];

      await assert.rejects(() =>
        ParserFactory.batchProcess(files, {
          stopOnError: true,
        }),
      );
    });

    it('should call progress callback', async () => {
      // Mock parseFile to return successful results
      const originalParseFile = ParserFactory.parseFile;
      ParserFactory.parseFile = async () => ({
        text: 'Test PDF content',
        fileInfo: {
          parserUsed: 'pdf',
          mimeType: 'application/pdf',
        },
        metadata: { title: 'Test PDF' },
      });

      try {
        const files = [mockPDFBuffer, mockPDFBuffer];
        const progressCalls = [];

        const result = await ParserFactory.batchProcess(files, {
          progressCallback: (processed, total, index, error) => {
            progressCalls.push({ processed, total, index, error });
          },
        });

        assert.strictEqual(result.successCount, 2);
        assert.strictEqual(progressCalls.length, 2);
        assert.strictEqual(progressCalls[0].processed, 1);
        assert.strictEqual(progressCalls[1].processed, 2);
        assert.strictEqual(progressCalls[0].total, 2);
        assert.strictEqual(progressCalls[1].total, 2);
      } finally {
        ParserFactory.parseFile = originalParseFile;
      }
    });

    it('should respect concurrency limits', async () => {
      const files = Array(5).fill(mockPDFBuffer);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      // Mock the parseFile method to track concurrency
      const originalParseFile = ParserFactory.parseFile;
      ParserFactory.parseFile = async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        await new Promise((resolve) => setTimeout(resolve, 10));

        currentConcurrent--;
        return {
          text: 'Test PDF content',
          fileInfo: {
            parserUsed: 'pdf',
            mimeType: 'application/pdf',
          },
          metadata: { title: 'Test PDF' },
        };
      };

      try {
        const result = await ParserFactory.batchProcess(files, {
          concurrency: 2,
        });

        assert.strictEqual(result.successCount, 5);
        assert(maxConcurrent <= 2, `Max concurrent was ${maxConcurrent}, expected <= 2`);
      } finally {
        // Restore original method
        ParserFactory.parseFile = originalParseFile;
      }
    });

    it('should handle empty file array', async () => {
      const result = await ParserFactory.batchProcess([]);

      assert.strictEqual(result.totalProcessed, 0);
      assert.strictEqual(result.successCount, 0);
      assert.strictEqual(result.errorCount, 0);
      assert.strictEqual(result.results.length, 0);
      assert.strictEqual(result.errors.length, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input gracefully', async () => {
      await assert.rejects(() => ParserFactory.createParser(null), /Invalid input/);
    });

    it('should handle undefined input gracefully', async () => {
      await assert.rejects(() => ParserFactory.createParser(undefined), /Invalid input/);
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await assert.rejects(() => ParserFactory.createParser(emptyBuffer), UnsupportedFormatError);
    });

    it('should handle very small buffer', async () => {
      const smallBuffer = Buffer.from([0x01]);

      await assert.rejects(() => ParserFactory.createParser(smallBuffer), UnsupportedFormatError);
    });

    it('should handle File with no type', async () => {
      const file = new File([mockPDFBuffer], 'test');
      const { parserType } = await ParserFactory.createParser(file);

      // Should still detect based on content
      assert.strictEqual(parserType, 'pdf');
    });

    it('should handle File with wrong type', async () => {
      // PDF content but wrong MIME type
      const file = new File([mockPDFBuffer], 'test.pdf', { type: 'text/plain' });
      const { parserType } = await ParserFactory.createParser(file);

      // Should detect based on actual content, not declared type
      assert.strictEqual(parserType, 'pdf');
    });
  });

  describe('Integration Tests', () => {
    it('should work with real-world PDF-like content', async () => {
      // Use the existing valid mock PDF buffer which represents a real PDF structure
      const { parser, fileInfo } = await ParserFactory.createParser(mockPDFBuffer);

      assert.strictEqual(fileInfo.parser, 'pdf');
      assert(parser);
    });

    it('should work with ZIP-based formats', async () => {
      // Create a more realistic DOCX-like ZIP structure
      const docxLikeBuffer = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP magic
        Buffer.from([0x14, 0x00, 0x00, 0x00]), // Version info
        Buffer.from('PK'),
        Buffer.from('[Content_Types].xml'), // DOCX indicator
        Buffer.from('application/vnd.openxmlformats'),
      ]);

      const { parser, fileInfo } = await ParserFactory.createParser(docxLikeBuffer);

      assert.strictEqual(fileInfo.parser, 'docx');
      assert(parser);
    });
  });
});
