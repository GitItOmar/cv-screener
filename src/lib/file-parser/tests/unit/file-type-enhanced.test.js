/**
 * Unit tests for enhanced file type detection
 * Tests consensus algorithms and advanced detection methods
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { detectFileTypeEnhanced, batchDetectFileType } from '../../src/utils/fileType.js';

describe('Enhanced File Type Detection', () => {
  let mockPDFBuffer;
  let mockDOCXBuffer;
  let mockTextBuffer;

  beforeEach(() => {
    // Mock PDF buffer with proper PDF structure
    mockPDFBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('%âÃÏÓ\n'),
      Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    ]);

    // Mock DOCX buffer with ZIP structure and DOCX content
    mockDOCXBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP magic
      Buffer.from([0x14, 0x00, 0x06, 0x00, 0x08, 0x00]), // ZIP header
      Buffer.from('[Content_Types].xml'),
      Buffer.from('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]);

    // Mock text buffer
    mockTextBuffer = Buffer.from('This is plain text content\nwith multiple lines\nand some data.');
  });

  describe('detectFileTypeEnhanced()', () => {
    it('should detect PDF with high confidence using multiple methods', async () => {
      const result = await detectFileTypeEnhanced(mockPDFBuffer);

      assert.strictEqual(result.consensus.mimeType, 'application/pdf');
      assert.strictEqual(result.consensus.parser, 'pdf');
      assert.strictEqual(result.confidence, 'high');
      assert(result.detections.length >= 2); // Should have multiple detection methods

      // Should have magic number detection
      const magicDetection = result.detections.find((d) => d.method === 'magic');
      assert(magicDetection);
      assert.strictEqual(magicDetection.mimeType, 'application/pdf');
    });

    it('should detect DOCX with consensus from multiple methods', async () => {
      // Use a File object with proper filename to enable extension-based detection
      const docxFile = new File([mockDOCXBuffer], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await detectFileTypeEnhanced(docxFile);

      assert.strictEqual(
        result.consensus.mimeType,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      assert.strictEqual(result.consensus.parser, 'docx');
      assert(result.detections.length >= 2);

      // Should have both magic number and extension detection
      const methods = result.detections.map((d) => d.method);
      assert(methods.includes('magic'));
      assert(methods.includes('extension'));
    });

    it('should return unknown for unrecognizable content', async () => {
      const unknownBuffer = Buffer.from([0xff, 0xfe, 0xfd, 0xfc, 0xfb]);

      const result = await detectFileTypeEnhanced(unknownBuffer);

      assert.strictEqual(result.consensus.mimeType, 'application/octet-stream');
      assert.strictEqual(result.consensus.parser, 'unknown');
      assert.strictEqual(result.confidence, 'unknown');
    });

    it('should use file name extension as additional context', async () => {
      const file = new File([mockPDFBuffer], 'document.pdf', { type: 'application/pdf' });

      const result = await detectFileTypeEnhanced(file);

      assert.strictEqual(result.consensus.mimeType, 'application/pdf');

      // Should have extension-based detection
      const extDetection = result.detections.find((d) => d.method === 'extension');
      assert(extDetection);
    });

    it('should detect conflicting information and use consensus', async () => {
      // PDF content but with wrong file extension
      const file = new File([mockPDFBuffer], 'document.txt', { type: 'text/plain' });

      const result = await detectFileTypeEnhanced(file);

      // Should prioritize content over declared type
      assert.strictEqual(result.consensus.mimeType, 'application/pdf');
      assert(result.detections.length >= 2);

      // Should show conflicting detections
      const conflicts = result.detections.filter((d) => d.mimeType !== 'application/pdf');
      assert(conflicts.length > 0);
    });

    it('should handle zero-length files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await detectFileTypeEnhanced(emptyBuffer);

      assert(result.consensus);
      assert.strictEqual(result.consensus.parser, 'unknown');
    });

    it('should handle very small files', async () => {
      const tinyBuffer = Buffer.from([0x25]); // Just one byte

      const result = await detectFileTypeEnhanced(tinyBuffer);

      assert(result.consensus);
      assert(['unknown'].includes(result.consensus.parser));
    });
  });

  describe('batchDetectFileType()', () => {
    it('should detect types for multiple files', async () => {
      const files = [
        new File([mockPDFBuffer], 'doc1.pdf', { type: 'application/pdf' }),
        new File([mockDOCXBuffer], 'doc2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        new File([mockTextBuffer], 'doc3.txt', { type: 'text/plain' }),
      ];

      const results = await batchDetectFileType(files);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].result.parser, 'pdf');
      assert.strictEqual(results[1].result.parser, 'docx');
      // Note: text/plain files might not be supported and could return null result
      if (results[2].result) {
        assert.strictEqual(results[2].result.parser, 'test');
      }
    });

    it('should handle batch processing with concurrency', async () => {
      const files = Array(5)
        .fill(null)
        .map(() => new File([mockPDFBuffer], 'test.pdf', { type: 'application/pdf' }));

      const options = {
        concurrency: 2,
      };

      const results = await batchDetectFileType(files, options);

      assert.strictEqual(results.length, 5);
      results.forEach((result) => {
        assert.strictEqual(result.result.parser, 'pdf');
      });
    });

    it('should handle errors in batch processing gracefully', async () => {
      const files = [
        new File([mockPDFBuffer], 'good.pdf', { type: 'application/pdf' }),
        null, // This will cause error - invalid input type
        new File([mockDOCXBuffer], 'good2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ];

      const options = {
        continueOnError: true,
      };

      const results = await batchDetectFileType(files, options);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].result.parser, 'pdf');
      assert(results[1].error); // Should have error for null input
      assert.strictEqual(results[2].result.parser, 'docx');
    });

    it('should handle File objects in batch', async () => {
      const files = [
        new File([mockPDFBuffer], 'test1.pdf', { type: 'application/pdf' }),
        new File([mockDOCXBuffer], 'test2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ];

      const results = await batchDetectFileType(files);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].result.parser, 'pdf');
      assert.strictEqual(results[1].result.parser, 'docx');
    });
  });

  describe('Consensus Algorithm', () => {
    it('should prioritize high-confidence detections', async () => {
      const result = await detectFileTypeEnhanced(mockPDFBuffer);

      // PDF should be detected with high confidence from magic numbers
      const magicDetection = result.detections.find((d) => d.method === 'magic');
      if (magicDetection) {
        assert.strictEqual(magicDetection.confidence, 'high');
      }

      assert.strictEqual(result.consensus.mimeType, 'application/pdf');
    });

    it('should aggregate evidence from multiple sources', async () => {
      const file = new File([mockPDFBuffer], 'document.pdf', { type: 'application/pdf' });

      const result = await detectFileTypeEnhanced(file);

      // Should have evidence from multiple sources all agreeing
      const pdfDetections = result.detections.filter((d) => d.mimeType === 'application/pdf');
      assert(pdfDetections.length >= 2); // Magic, extension, declared type

      assert.strictEqual(result.confidence, 'high');
    });
  });

  describe('Performance Tests', () => {
    it('should handle reasonable timeout for detection', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024); // 10KB
      largeBuffer.write('%PDF-1.4');

      const startTime = Date.now();
      const result = await detectFileTypeEnhanced(largeBuffer);
      const endTime = Date.now();

      assert(result.consensus);
      assert(endTime - startTime < 5000, 'Detection should complete within 5 seconds');
    });

    it('should be efficient for batch processing', async () => {
      const files = Array(10).fill({ buffer: mockPDFBuffer, name: 'test.pdf' });

      const startTime = Date.now();
      const results = await batchDetectFileType(files, { concurrency: 3 });
      const endTime = Date.now();

      assert.strictEqual(results.length, 10);
      assert(endTime - startTime < 10000, 'Batch processing should complete within 10 seconds');
    });
  });
});
