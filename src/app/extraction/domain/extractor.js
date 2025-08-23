/**
 * Main extraction orchestrator
 * Coordinates the entire extraction process
 */

import FileParser from '@/lib/file-parser/src/FileParser.js';
import TextExtractor from './parser.js';
import { llmExtractor } from './llm.js';

/**
 * Extract structured data from file
 * @param {File} file - File to extract from
 * @returns {Promise<Object>} - Extraction result
 */
export async function extractFromFile(file) {
  try {
    // Determine file extension
    const extension = file.name.split('.').pop().toLowerCase();

    // Create a FileParser instance with optimized settings for resume processing
    const fileParser = new FileParser();

    // Parse the file using the FileParser
    const parseResult = await fileParser.parse(file);

    console.log(parseResult);

    // Extract text content from the result
    const rawText = parseResult.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file');
    }

    // Clean and prepare text for LLM processing
    const cleanedText = TextExtractor.cleanAndNormalize(rawText, extension);

    // Extract structured data using LLM with optimal hardcoded settings
    const extractedData = await llmExtractor.extractResumeData(cleanedText);

    return { extractedData };
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
