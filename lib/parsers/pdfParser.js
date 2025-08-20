export class PDFParser {
  /**
   * Parse PDF file and extract text content
   * @param {ArrayBuffer} buffer - PDF file buffer
   * @returns {Promise<string>} - Extracted text content
   */
  static async parse(buffer) {
    try {
      // Dynamic import for Next.js compatibility
      const PDFParser = (await import('pdf2json')).default;

      // Convert ArrayBuffer to Buffer for pdf2json
      const pdfBuffer = Buffer.from(buffer);

      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);

        pdfParser.on('pdfParser_dataError', (errData) => {
          reject(new Error(`PDF parsing failed: ${errData.parserError}`));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          try {
            // Extract text from parsed PDF data
            const extractedText = this.extractTextFromPDFData(pdfData);

            if (!extractedText || extractedText.trim().length === 0) {
              reject(new Error('No text content found in PDF'));
              return;
            }

            // Clean and structure the text
            const cleanedText = this.cleanPDFText(extractedText);
            resolve(cleanedText);
          } catch (error) {
            reject(new Error(`Text extraction failed: ${error.message}`));
          }
        });

        // Parse the PDF buffer
        pdfParser.parseBuffer(pdfBuffer);
      });
    } catch (error) {
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
   * Extract text from pdf2json data structure
   * @param {Object} pdfData - Parsed PDF data from pdf2json
   * @returns {string} - Extracted text
   */
  static extractTextFromPDFData(pdfData) {
    let fullText = '';

    // Iterate through all pages
    if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
      pdfData.Pages.forEach((page) => {
        let pageText = '';

        // Extract text from Texts array
        if (page.Texts && Array.isArray(page.Texts)) {
          page.Texts.forEach((textItem) => {
            if (textItem.R && Array.isArray(textItem.R)) {
              textItem.R.forEach((run) => {
                if (run.T) {
                  // Decode URI-encoded text
                  const decodedText = decodeURIComponent(run.T);
                  pageText += decodedText;
                }
              });
            }
          });
        }

        // Add page break between pages
        if (pageText.trim()) {
          fullText += `${pageText}\n\n`;
        }
      });
    }

    return fullText;
  }

  /**
   * Clean extracted PDF text to improve structure
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanPDFText(text) {
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
    } catch {
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
      // Dynamic import for Next.js compatibility
      const PDFParser = (await import('pdf2json')).default;

      const pdfBuffer = Buffer.from(buffer);

      return new Promise((resolve) => {
        const pdfParser = new PDFParser(null, 1);

        pdfParser.on('pdfParser_dataError', () => {
          resolve({}); // Return empty metadata on error
        });

        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          try {
            const metadata = {
              title: pdfData.Meta?.Title || null,
              author: pdfData.Meta?.Author || null,
              creator: pdfData.Meta?.Creator || null,
              producer: pdfData.Meta?.Producer || null,
              creationDate: pdfData.Meta?.CreationDate || null,
              modificationDate: pdfData.Meta?.ModDate || null,
              pageCount: pdfData.Pages ? pdfData.Pages.length : 0,
              encrypted: false, // pdf2json doesn't provide this info directly
            };
            resolve(metadata);
          } catch {
            resolve({});
          }
        });

        pdfParser.parseBuffer(pdfBuffer);
      });
    } catch {
      return {};
    }
  }
}

export default PDFParser;
