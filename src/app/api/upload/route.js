import FileParser from '../../../lib/file-parser/src/FileParser.js';
import TextExtractor from '../../../lib/extractors/textExtractor.js';
import { llmExtractor } from '../../../lib/extractors/llmExtractor.js';
import { dataValidator } from '../../../lib/validators/dataValidator.js';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const extractData = true;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // File validation
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      return Response.json({ error: validationResult.error }, { status: 400 });
    }

    // Process the file
    let processedData = null;
    if (extractData) {
      try {
        processedData = await processFileContent(file, validationResult.extension);
      } catch (processingError) {
        // Return partial success with error details
        return Response.json(
          {
            success: true,
            fileInfo: {
              name: file.name,
              size: file.size,
              type: file.type,
              extension: validationResult.extension,
              uploadedAt: new Date().toISOString(),
            },
            processing: {
              success: false,
              error: processingError.message,
              processingTime: Date.now() - startTime,
            },
          },
          { status: 200 },
        );
      }
    }

    // Prepare response
    const response = {
      success: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: validationResult.extension,
        uploadedAt: new Date().toISOString(),
      },
      processing: {
        success: !!processedData,
        processingTime: Date.now() - startTime,
      },
    };

    // Add processed data if extraction was requested and successful
    if (processedData) {
      response.extractedData = processedData.extractedData;
      response.validation = processedData.validation;
      response.processing.statistics = processedData.statistics;
      response.debug = {
        parsedText: processedData.debug?.parsedText,
        cleanedText: processedData.debug?.cleanedText,
        semanticStructure: processedData.debug?.semanticStructure,
      };
    }

    return Response.json(response, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: 'Upload failed',
        details: error.message,
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Validate uploaded file
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
function validateFile(file) {
  const maxSize = 1024 * 1024; // 1MB - consistent with FileParser config
  const allowedExtensions = ['pdf', 'docx']; // Removed 'doc' as FileParser doesn't support it

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 1MB.`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file type: .${extension}. Supported types: ${allowedExtensions.map((ext) => `.${ext}`).join(', ')}`,
    };
  }

  // Additional validation based on file type
  const mimeTypeValidation = validateMimeType(file.type, extension);
  if (!mimeTypeValidation.isValid) {
    return mimeTypeValidation;
  }

  return {
    isValid: true,
    extension,
  };
}

/**
 * Validate MIME type against file extension
 * @param {string} mimeType - File MIME type
 * @param {string} extension - File extension
 * @returns {Object} - Validation result
 */
function validateMimeType(mimeType, extension) {
  const validMimeTypes = {
    pdf: ['application/pdf'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
    ],
  };

  const allowedMimes = validMimeTypes[extension] || [];

  // Some browsers might not set MIME type correctly, so we're lenient
  if (mimeType && !allowedMimes.includes(mimeType)) {
    // Don't fail validation, just warn
  }

  return { isValid: true };
}

/**
 * Process file content and extract resume data
 * @param {File} file - File to process
 * @param {string} extension - File extension
 * @returns {Promise<Object>} - Processing result
 */
async function processFileContent(file, extension) {
  const processingStartTime = Date.now();

  try {
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

    // Parse the file using the new FileParser
    const parseResult = await fileParser.parse(file);

    // Extract text content from the comprehensive result
    const rawText = parseResult.data?.text;
    const parsedText = rawText; // Save for debugging

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file');
    }

    // Clean and prepare text for LLM processing
    const cleanedText = TextExtractor.cleanAndNormalize(rawText, extension);

    // Extract semantic structure for additional metadata
    const semanticStructure = TextExtractor.extractSemanticStructure(cleanedText);

    // Extract structured data using LLM
    const extractedData = await llmExtractor.extractResumeData(cleanedText, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      useEnhancedPrompts: true,
      validateResults: true,
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
        semanticStructure,
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
        semanticStructure,
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

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
function getFileExtension(filename) {
  const ext = filename.split('.').pop() || 'unknown';
  return ext;
}
