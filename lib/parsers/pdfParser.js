import pdfParse from 'pdf-parse';

export class PDFParser {
  /**
   * Parse PDF file and extract text content
   * @param {ArrayBuffer} buffer - PDF file buffer
   * @returns {Promise<string>} - Extracted text content
   */
  static async parse(buffer) {
    console.debug('[PDFParser] Starting PDF parsing');

    try {
      // Convert ArrayBuffer to Buffer for pdf-parse
      const pdfBuffer = Buffer.from(buffer);

      // Parse PDF with options for better text extraction
      const options = {
        // Preserve whitespace for better structure
        normalizeWhitespace: false,
        // Don't discard fontInfo as it can help with structure
        disableFontFace: false,
        // Maximum pages to parse (safety limit)
        max: 50,
      };

      console.debug('[PDFParser] Parsing PDF with options:', options);
      const data = await pdfParse(pdfBuffer, options);

      if (!data || !data.text) {
        throw new Error('No text content found in PDF');
      }

      const extractedText = data.text;
      const pageCount = data.numpages;
      const info = data.info;

      console.info('[PDFParser] Successfully extracted text from', pageCount, 'pages');
      console.debug('[PDFParser] PDF info:', {
        pages: pageCount,
        title: info?.Title || 'Unknown',
        creator: info?.Creator || 'Unknown',
        textLength: extractedText.length,
      });

      // Clean and structure the text
      const cleanedText = this.cleanPDFText(extractedText);

      console.debug('[PDFParser] Text length after cleaning:', cleanedText.length);
      return cleanedText;
    } catch (error) {
      console.error('[PDFParser] Failed to parse PDF:', error.message);

      // Provide more specific error messages
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid or corrupted PDF file');
      } else if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported');
      } else if (error.message.includes('No text content')) {
        throw new Error('PDF appears to be image-only (OCR not yet supported)');
      } else {
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Clean extracted PDF text to improve structure
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanPDFText(text) {
    console.debug('[PDFParser] Cleaning extracted text');

    let cleaned = text;

    // Remove excessive whitespace while preserving line breaks
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // Normalize line breaks (handle different line ending types)
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove leading/trailing whitespace from each line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Remove completely empty lines at start and end
    cleaned = cleaned.trim();

    // Handle common PDF text extraction issues
    cleaned = this.fixCommonPDFIssues(cleaned);

    console.debug('[PDFParser] Text cleaning completed');
    return cleaned;
  }

  /**
   * Fix common PDF text extraction issues
   * @param {string} text - Text to fix
   * @returns {string} - Fixed text
   */
  static fixCommonPDFIssues(text) {
    let fixed = text;

    // Fix broken words that were split across lines
    fixed = fixed.replace(/([a-z])\n([a-z])/g, '$1$2');

    // Fix bullet points that might have been mangled
    fixed = fixed.replace(/^[•·▪▫▬►‣⁃]/gm, '• ');

    // Ensure proper spacing after punctuation
    fixed = fixed.replace(/([.!?])([A-Z])/g, '$1 $2');

    // Fix common encoding issues
    fixed = fixed.replace(/â€™/g, "'");
    fixed = fixed.replace(/â€œ/g, '"');
    fixed = fixed.replace(/â€/g, '"');
    fixed = fixed.replace(/â€¢/g, '•');

    return fixed;
  }

  /**
   * Validate if buffer contains a valid PDF
   * @param {ArrayBuffer} buffer - File buffer
   * @returns {boolean} - Whether buffer is a valid PDF
   */
  static isValidPDF(buffer) {
    try {
      const pdfBuffer = Buffer.from(buffer);
      // Check PDF magic number
      const header = pdfBuffer.subarray(0, 4).toString();
      return header === '%PDF';
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract metadata from PDF
   * @param {ArrayBuffer} buffer - PDF file buffer
   * @returns {Promise<Object>} - PDF metadata
   */
  static async extractMetadata(buffer) {
    try {
      const pdfBuffer = Buffer.from(buffer);
      const data = await pdfParse(pdfBuffer, { max: 1 }); // Only parse first page for metadata

      return {
        title: data.info?.Title || null,
        author: data.info?.Author || null,
        creator: data.info?.Creator || null,
        producer: data.info?.Producer || null,
        creationDate: data.info?.CreationDate || null,
        modificationDate: data.info?.ModDate || null,
        pageCount: data.numpages,
        encrypted: data.info?.IsEncrypted || false,
      };
    } catch (error) {
      console.warn('[PDFParser] Failed to extract metadata:', error.message);
      return {};
    }
  }
}

export default PDFParser;
