import mammoth from 'mammoth';

export class DOCXParser {
  /**
   * Parse DOCX file and extract text content
   * @param {ArrayBuffer} buffer - DOCX file buffer
   * @returns {Promise<string>} - Extracted text content
   */
  static async parse(buffer) {

    try {
      // Convert ArrayBuffer to Buffer for mammoth
      const docxBuffer = Buffer.from(buffer);

      // Extract text with HTML styling preserved for better structure
      const options = {
        // Convert to HTML to preserve structure
        convertImage: mammoth.images.ignoreAll,
        // Include style information for headers, lists, etc.
        includeDefaultStyleMap: true,
        // Custom style mappings for better structure preservation
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Heading 1'] => h2:fresh",
          "p[style-name='Heading 2'] => h3:fresh",
          "p[style-name='Heading 3'] => h4:fresh",
          "p[style-name='List Paragraph'] => li:fresh",
          'b => strong',
          'i => em',
        ],
      };

      const result = await mammoth.convertToHtml(docxBuffer, options);

      if (!result || !result.value) {
        throw new Error('No content found in DOCX file');
      }

      const htmlContent = result.value;

      // Log any warnings from mammoth


      // Convert HTML to structured text
      const structuredText = this.htmlToStructuredText(htmlContent);

      return structuredText;
    } catch (error) {

      // Provide more specific error messages
      if (error.message.includes('not a valid zip file') || error.message.includes('corrupt')) {
        throw new Error('Invalid or corrupted DOCX file');
      } else if (error.message.includes('password')) {
        throw new Error('Password-protected DOCX files are not supported');
      } else if (error.message.includes('No content found')) {
        throw new Error('DOCX file appears to be empty');
      } else {
        throw new Error(`DOCX parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Convert HTML content to structured plain text
   * @param {string} html - HTML content from mammoth
   * @returns {string} - Structured plain text
   */
  static htmlToStructuredText(html) {

    let text = html;

    // Convert headers to structured format
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n=== $1 ===\n');
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n--- $1 ---\n');
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n• $1\n');
    text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n$1:\n');

    // Convert lists
    text = text.replace(/<ul[^>]*>/gi, '\n');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<ol[^>]*>/gi, '\n');
    text = text.replace(/<\/ol>/gi, '\n');
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');

    // Convert paragraphs
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // Handle emphasis (preserve important formatting cues)
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Convert line breaks
    text = text.replace(/<br[^>]*>/gi, '\n');

    // Convert tables (basic structure preservation)
    text = text.replace(/<table[^>]*>/gi, '\n--- TABLE ---\n');
    text = text.replace(/<\/table>/gi, '\n--- END TABLE ---\n');
    text = text.replace(/<tr[^>]*>/gi, '');
    text = text.replace(/<\/tr>/gi, '\n');
    text = text.replace(/<td[^>]*>(.*?)<\/td>/gi, '$1 | ');
    text = text.replace(/<th[^>]*>(.*?)<\/th>/gi, '**$1** | ');

    // Remove any remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Clean up whitespace and formatting
    text = this.cleanDocxText(text);

    return text;
  }

  /**
   * Clean extracted DOCX text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanDocxText(text) {

    let cleaned = text;

    // Decode HTML entities
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&nbsp;/g, ' ');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // Normalize line breaks
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove leading/trailing whitespace from each line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Remove empty lines at start and end
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Extract plain text only (without structure)
   * @param {ArrayBuffer} buffer - DOCX file buffer
   * @returns {Promise<string>} - Plain text content
   */
  static async extractPlainText(buffer) {

    try {
      const docxBuffer = Buffer.from(buffer);
      const result = await mammoth.extractRawText(docxBuffer);

      if (!result || !result.value) {
        throw new Error('No text content found in DOCX file');
      }

      const plainText = result.value.trim();

      return plainText;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate if buffer contains a valid DOCX file
   * @param {ArrayBuffer} buffer - File buffer
   * @returns {boolean} - Whether buffer is a valid DOCX
   */
  static isValidDOCX(buffer) {
    try {
      const docxBuffer = Buffer.from(buffer);
      // Check for ZIP file signature (DOCX is a ZIP file)
      const signature = docxBuffer.subarray(0, 4);
      const zipSignature = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

      return signature.every((byte, index) => byte === zipSignature[index]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract document properties/metadata
   * @param {ArrayBuffer} buffer - DOCX file buffer
   * @returns {Promise<Object>} - Document metadata
   */
  static async extractMetadata(buffer) {
    try {
      const docxBuffer = Buffer.from(buffer);

      // Use mammoth to extract document info
      const result = await mammoth.convertToHtml(docxBuffer);

      // Basic metadata (mammoth doesn't provide extensive metadata)
      return {
        hasContent: !!result.value,
        contentLength: result.value ? result.value.length : 0,
        warningsCount: result.messages ? result.messages.length : 0,
        warnings: result.messages || [],
      };
    } catch (error) {
      return {};
    }
  }
}

export default DOCXParser;
