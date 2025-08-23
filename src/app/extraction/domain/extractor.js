/**
 * Main extraction orchestrator
 * Coordinates the entire extraction process
 */

import FileParser from '../../../lib/file-parser/src/FileParser.js';
import TextExtractor from './parser.js';
import { llmExtractor } from './llm.js';
import { dataValidator } from './transformer.js';

/**
 * Extract structured data from file
 * @param {File} file - File to extract from
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - Extraction result
 */
export async function extractFromFile(file, options = {}) {
  const processingStartTime = Date.now();

  try {
    // Determine file extension
    const extension = file.name.split('.').pop().toLowerCase();

    // Create a FileParser instance with optimized settings for resume processing
    const fileParser = new FileParser({
      maxFileSize: 1024 * 1024, // 1MB for resumes
      timeout: 45000, // 45 seconds
      extractMetadata: true,
      enableRecovery: true,
      retryAttempts: 2,
      allowPartialRecovery: true,
      pdf: {
        maxPages: 50, // Reasonable limit for resumes
        cleanText: true,
        normalizeText: true,
      },
      docx: {
        preserveFormatting: false, // Focus on text content for LLM processing
        includeHeaders: true,
        includeFooters: false,
        convertTables: true,
      },
    });

    // Parse the file using the FileParser
    const parseResult = await fileParser.parse(file);

    // Extract text content from the comprehensive result
    const rawText = parseResult.data?.text;
    const parsedText = rawText; // Save for debugging

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file');
    }

    // Clean and prepare text for LLM processing
    const cleanedText = TextExtractor.cleanAndNormalize(rawText, extension);

    // Extract structured data using LLM
    const extractedData = await llmExtractor.extractResumeData(cleanedText, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      useEnhancedPrompts: true,
      validateResults: true,
      ...options.llmOptions,
    });

    // Validate the extracted data
    const validationResult = await dataValidator.validateResumeData(extractedData);

    // Get processing statistics - combine FileParser stats with extraction stats
    const processingTime = Date.now() - processingStartTime;
    const extractionStats = llmExtractor.getExtractionStats();
    const parserStats = fileParser.getStats();

    const result = {
      extractedData,
      validation: validationResult,
      statistics: {
        processingTime,
        textLength: cleanedText.length,
        originalTextLength: rawText.length,
        llmStats: extractionStats,
        parser: {
          // FileParser statistics
          ...parserStats,
          parsingTime: parseResult.processingTime,
          success: parseResult.success,
          parser: parseResult.parser,
          quality: parseResult.quality,
        },
        fileInfo: {
          name: file.name,
          size: file.size,
          extension,
          type: file.type,
          // Enhanced file info from FileParser
          ...parseResult.file,
        },
      },
      debug: {
        parsedText,
        cleanedText,
        // Additional debugging info from FileParser
        parseResult: {
          success: parseResult.success,
          parser: parseResult.parser,
          processingTime: parseResult.processingTime,
          quality: parseResult.quality,
          validation: parseResult.validation,
          performance: parseResult.performance,
        },
      },
    };

    return result;
  } catch (error) {
    // Enhanced error handling with FileParser errors
    // Log error for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('File processing error:', error);
    }

    // Check if it's a FileParser error with user-friendly messages
    if (error.getUserMessage && typeof error.getUserMessage === 'function') {
      // Use the FileParser's user-friendly error message
      throw new Error(error.getUserMessage());
    }

    // Handle specific error types
    if (error.code) {
      switch (error.code) {
        case 'UNSUPPORTED_FORMAT':
          throw new Error(`Unsupported file format. Please upload a PDF or DOCX file.`);
        case 'FILE_SIZE_EXCEEDED':
          throw new Error('File is too large. Please upload a file smaller than 1MB.');
        case 'PARSE_TIMEOUT':
          throw new Error('File processing timed out. Please try with a smaller file.');
        case 'CORRUPTED_FILE':
          throw new Error(
            'The file appears to be corrupted or damaged. Please try with a different file.',
          );
        case 'VALIDATION_FAILED':
          throw new Error(
            'File validation failed. Please ensure the file is not password-protected.',
          );
        default:
          break;
      }
    }

    // Fallback error handling for non-FileParser errors
    if (error.message.includes('No text content')) {
      throw new Error('The file appears to be empty or contains no readable text content');
    } else if (error.message.includes('rate limit')) {
      throw new Error('AI processing service is temporarily unavailable. Please try again later.');
    } else if (error.message.includes('API quota')) {
      throw new Error('AI processing quota exceeded. Please contact support.');
    } else {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }
}
