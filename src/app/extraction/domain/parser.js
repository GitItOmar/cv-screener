class TextExtractor {
  /**
   * Clean and normalize extracted text from various sources
   * @param {string} rawText - Raw text extracted from document
   * @param {string} sourceType - Type of source (pdf, docx, csv)
   * @returns {string} - Cleaned and normalized text
   */
  static cleanAndNormalize(rawText, sourceType = 'unknown') {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let cleaned = rawText;

    // Apply source-specific cleaning
    switch (sourceType.toLowerCase()) {
      case 'pdf':
        cleaned = this.cleanPDFText(cleaned);
        break;
      case 'docx':
        cleaned = this.cleanDOCXText(cleaned);
        break;
      default:
        cleaned = this.cleanGenericText(cleaned);
    }

    // Apply universal cleaning steps
    cleaned = this.applyUniversalCleaning(cleaned);

    return cleaned;
  }

  /**
   * Clean text specifically extracted from PDFs
   * @param {string} text - PDF extracted text
   * @returns {string} - Cleaned text
   */
  static cleanPDFText(text) {
    let cleaned = text;

    // Fix common PDF extraction issues
    // Remove page numbers and headers/footers that might be repeated
    cleaned = cleaned.replace(/^Page \d+.*$/gm, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');

    // Fix hyphenated words broken across lines
    cleaned = cleaned.replace(/([a-z])-\n([a-z])/g, '$1$2');

    // Fix bullet points
    cleaned = cleaned.replace(/^[•·▪▫▬►‣⁃]\s*/gm, '• ');

    // Fix spacing issues around punctuation
    cleaned = cleaned.replace(/([.!?])([A-Z])/g, '$1 $2');

    return cleaned;
  }

  /**
   * Clean text specifically extracted from DOCX files
   * @param {string} text - DOCX extracted text
   * @returns {string} - Cleaned text
   */
  static cleanDOCXText(text) {
    let cleaned = text;

    // DOCX often preserves structure better, so minimal cleaning needed
    // Remove any leftover HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');

    return cleaned;
  }

  /**
   * Generic text cleaning for unknown sources
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  static cleanGenericText(text) {
    let cleaned = text;

    // Basic cleaning steps
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');

    return cleaned;
  }

  /**
   * Apply universal cleaning steps to all text
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  static applyUniversalCleaning(text) {
    let cleaned = text;

    // Normalize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // Remove excessive line breaks (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace from each line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Remove leading and trailing whitespace
    cleaned = cleaned.trim();

    // Fix common encoding issues
    cleaned = this.fixEncodingIssues(cleaned);

    // Remove or fix special characters
    cleaned = this.normalizeSpecialCharacters(cleaned);

    return cleaned;
  }

  /**
   * Fix common encoding issues
   * @param {string} text - Text with potential encoding issues
   * @returns {string} - Text with fixed encoding
   */
  static fixEncodingIssues(text) {
    let fixed = text;

    // Common UTF-8 encoding issues
    const encodingFixes = {
      'â€™': "'", // Right single quotation mark
      'â€œ': '"', // Left double quotation mark
      'â€\x9D': '"', // Right double quotation mark
      'â€¢': '•', // Bullet point
      'â€"': '—', // Em dash
      'â€¦': '...', // Ellipsis
      'Ã¡': 'á', // a with acute accent
      'Ã©': 'é', // e with acute accent
      'Ã­': 'í', // i with acute accent
      'Ã³': 'ó', // o with acute accent
      Ãº: 'ú', // u with acute accent
      'Ã±': 'ñ', // n with tilde
      '\\u00a0': ' ', // Non-breaking space
      '\\u2019': "'", // Right single quotation mark
      '\\u201c': '"', // Left double quotation mark
      '\\u201d': '"', // Right double quotation mark
      '\\u2022': '•', // Bullet point
      '\\u2013': '–', // En dash
      '\\u2014': '—', // Em dash
    };

    for (const [corrupted, correct] of Object.entries(encodingFixes)) {
      fixed = fixed.replace(new RegExp(corrupted, 'g'), correct);
    }

    return fixed;
  }

  /**
   * Normalize special characters
   * @param {string} text - Text with special characters
   * @returns {string} - Text with normalized characters
   */
  static normalizeSpecialCharacters(text) {
    let normalized = text;

    // Normalize different types of quotes
    normalized = normalized.replace(/[""]/g, '"');
    normalized = normalized.replace(/['']/g, "'");

    // Normalize different types of dashes
    normalized = normalized.replace(/[–—]/g, '-');

    // Normalize bullet points
    normalized = normalized.replace(/[•▪▫‣⁃]/g, '•');

    // Remove or replace problematic characters
    normalized = normalized.replace(/[^\u0020-\u007E\u0080-\u00FF]/g, '?'); // Non-printable characters

    return normalized;
  }
}

export default TextExtractor;
