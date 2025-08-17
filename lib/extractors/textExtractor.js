export class TextExtractor {
  /**
   * Clean and normalize extracted text from various sources
   * @param {string} rawText - Raw text extracted from document
   * @param {string} sourceType - Type of source (pdf, docx, csv)
   * @returns {string} - Cleaned and normalized text
   */
  static cleanAndNormalize(rawText, sourceType = 'unknown') {
    console.debug('[TextExtractor] Cleaning text from source type:', sourceType);
    console.debug('[TextExtractor] Input text length:', rawText?.length || 0);

    if (!rawText || typeof rawText !== 'string') {
      console.warn('[TextExtractor] Invalid input text');
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
      case 'csv':
        cleaned = this.cleanCSVText(cleaned);
        break;
      default:
        cleaned = this.cleanGenericText(cleaned);
    }

    // Apply universal cleaning steps
    cleaned = this.applyUniversalCleaning(cleaned);

    // Identify and preserve document structure
    cleaned = this.identifyDocumentSections(cleaned);

    console.debug('[TextExtractor] Cleaned text length:', cleaned.length);
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
   * Clean text specifically from CSV files
   * @param {string} text - CSV formatted text
   * @returns {string} - Cleaned text
   */
  static cleanCSVText(text) {
    let cleaned = text;

    // CSV text is usually already well-structured
    // Just ensure proper formatting
    cleaned = cleaned.replace(/===\s*CANDIDATE\s*\d+\s*===/g, (match) => {
      return '\n\n' + match + '\n';
    });

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

  /**
   * Identify and mark document sections
   * @param {string} text - Text to analyze
   * @returns {string} - Text with identified sections
   */
  static identifyDocumentSections(text) {
    console.debug('[TextExtractor] Identifying document sections');

    let structured = text;

    // Common resume section patterns
    const sectionPatterns = [
      // Contact/Personal Information
      {
        pattern: /^(PERSONAL\s+INFORMATION|CONTACT\s+INFORMATION|CONTACT\s+DETAILS).*$/gim,
        marker: '[SECTION:CONTACT]',
      },

      // Professional Summary/Objective
      {
        pattern: /^(PROFESSIONAL\s+SUMMARY|CAREER\s+SUMMARY|SUMMARY|OBJECTIVE|PROFILE).*$/gim,
        marker: '[SECTION:SUMMARY]',
      },

      // Work Experience
      {
        pattern:
          /^(WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT\s+HISTORY|CAREER\s+HISTORY).*$/gim,
        marker: '[SECTION:EXPERIENCE]',
      },

      // Skills
      {
        pattern: /^(SKILLS|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|COMPETENCIES|EXPERTISE).*$/gim,
        marker: '[SECTION:SKILLS]',
      },

      // Education
      {
        pattern: /^(EDUCATION|EDUCATIONAL\s+BACKGROUND|ACADEMIC\s+BACKGROUND|QUALIFICATIONS).*$/gim,
        marker: '[SECTION:EDUCATION]',
      },

      // Certifications
      {
        pattern: /^(CERTIFICATIONS|CERTIFICATES|PROFESSIONAL\s+CERTIFICATIONS).*$/gim,
        marker: '[SECTION:CERTIFICATIONS]',
      },

      // Projects
      {
        pattern: /^(PROJECTS|KEY\s+PROJECTS|NOTABLE\s+PROJECTS|PROJECT\s+EXPERIENCE).*$/gim,
        marker: '[SECTION:PROJECTS]',
      },

      // Awards/Achievements
      {
        pattern: /^(AWARDS|ACHIEVEMENTS|HONORS|RECOGNITION).*$/gim,
        marker: '[SECTION:AWARDS]',
      },
    ];

    // Apply section markers
    sectionPatterns.forEach(({ pattern, marker }) => {
      structured = structured.replace(pattern, (match) => {
        return `${marker}\n${match}`;
      });
    });

    // Identify email addresses and phone numbers
    structured = structured.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '[EMAIL:$1]',
    );
    structured = structured.replace(/(\+?[\d\s\-()]{10,})/g, (match) => {
      // Only mark as phone if it looks like a phone number
      if (match.replace(/[\s\-()]/g, '').length >= 10) {
        return `[PHONE:${match.trim()}]`;
      }
      return match;
    });

    // Identify dates (common formats)
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g, // MM/DD/YYYY
      /\b(\d{4}-\d{1,2}-\d{1,2})\b/g, // YYYY-MM-DD
      /\b([A-Za-z]{3,9}\s+\d{4})\b/g, // Month YYYY
      /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/g, // DD Month YYYY
    ];

    datePatterns.forEach((pattern) => {
      structured = structured.replace(pattern, '[DATE:$1]');
    });

    console.debug('[TextExtractor] Section identification completed');
    return structured;
  }

  /**
   * Extract semantic structure from text
   * @param {string} text - Text to analyze
   * @returns {Object} - Structured representation
   */
  static extractSemanticStructure(text) {
    console.debug('[TextExtractor] Extracting semantic structure');

    const structure = {
      sections: {},
      contacts: {
        emails: [],
        phones: [],
        locations: [],
      },
      dates: [],
      keywords: [],
      metadata: {
        totalLength: text.length,
        lineCount: text.split('\n').length,
        wordCount: text.split(/\s+/).length,
      },
    };

    // Extract marked sections
    const sectionRegex = /\[SECTION:(\w+)\]/g;
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
      const sectionType = match[1].toLowerCase();
      if (!structure.sections[sectionType]) {
        structure.sections[sectionType] = [];
      }
      structure.sections[sectionType].push({
        position: match.index,
        type: sectionType,
      });
    }

    // Extract contact information
    const emailRegex = /\[EMAIL:([^\]]+)\]/g;
    while ((match = emailRegex.exec(text)) !== null) {
      structure.contacts.emails.push(match[1]);
    }

    const phoneRegex = /\[PHONE:([^\]]+)\]/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      structure.contacts.phones.push(match[1].trim());
    }

    // Extract dates
    const dateRegex = /\[DATE:([^\]]+)\]/g;
    while ((match = dateRegex.exec(text)) !== null) {
      structure.dates.push(match[1]);
    }

    // Extract potential keywords (words that appear frequently)
    const words = text
      .toLowerCase()
      .replace(/\[[^\]]+\]/g, '') // Remove markers
      .split(/\s+/)
      .filter((word) => word.length > 3 && /^[a-z]+$/.test(word));

    const wordCount = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    structure.keywords = Object.entries(wordCount)
      .filter(([, count]) => count > 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);

    console.debug('[TextExtractor] Semantic structure extraction completed');
    return structure;
  }

  /**
   * Prepare text for LLM processing
   * @param {string} text - Cleaned text
   * @returns {string} - LLM-ready text
   */
  static prepareForLLM(text) {
    console.debug('[TextExtractor] Preparing text for LLM processing');

    let prepared = text;

    // Remove section markers (LLM will identify sections itself)
    prepared = prepared.replace(/\[SECTION:\w+\]\n?/g, '');

    // Keep contact markers but simplify them
    prepared = prepared.replace(/\[EMAIL:([^\]]+)\]/g, '$1');
    prepared = prepared.replace(/\[PHONE:([^\]]+)\]/g, '$1');
    prepared = prepared.replace(/\[DATE:([^\]]+)\]/g, '$1');

    // Ensure reasonable length for LLM processing
    const maxLength = 8000; // Reasonable limit for most LLMs
    if (prepared.length > maxLength) {
      console.warn('[TextExtractor] Text too long, truncating to', maxLength, 'characters');
      prepared = prepared.substring(0, maxLength) + '\n\n[TEXT TRUNCATED DUE TO LENGTH]';
    }

    console.debug('[TextExtractor] Text prepared for LLM, final length:', prepared.length);
    return prepared;
  }

  /**
   * Extract text statistics
   * @param {string} text - Text to analyze
   * @returns {Object} - Text statistics
   */
  static getTextStatistics(text) {
    const stats = {
      characterCount: text.length,
      wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
      lineCount: text.split('\n').length,
      paragraphCount: text.split(/\n\s*\n/).length,
      sentenceCount: text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
      averageWordsPerSentence: 0,
      estimatedReadingTime: 0, // in minutes
    };

    if (stats.sentenceCount > 0) {
      stats.averageWordsPerSentence = Math.round(stats.wordCount / stats.sentenceCount);
    }

    // Estimate reading time (average 200 words per minute)
    stats.estimatedReadingTime = Math.ceil(stats.wordCount / 200);

    return stats;
  }
}

export default TextExtractor;
