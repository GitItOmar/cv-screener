import { ParserFactory } from '../../../lib/parsers/parserFactory.js';
import { TextExtractor } from '../../../lib/extractors/textExtractor.js';
import { llmExtractor } from '../../../lib/extractors/llmExtractor.js';
import { dataValidator } from '../../../lib/validators/dataValidator.js';

export async function POST(request) {
  const startTime = Date.now();

  try {
    console.info('[UPLOAD] Starting file upload and processing');
    const formData = await request.formData();

    const file = formData.get('file');
    const extractData = formData.get('extractData') === 'true'; // Optional parameter to control extraction

    if (!file) {
      console.warn('[UPLOAD] No file provided in request');
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      console.warn('[UPLOAD] Provided file is not a File object:', file);
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // File validation
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      console.warn('[UPLOAD] File validation failed:', validationResult.error);
      return Response.json({ error: validationResult.error }, { status: 400 });
    }

    console.info('[UPLOAD] File validation passed:', {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: validationResult.extension,
    });

    // Process the file
    let processedData = null;
    if (extractData) {
      try {
        processedData = await processFileContent(file, validationResult.extension);
        console.info('[UPLOAD] File processing completed successfully');
      } catch (processingError) {
        console.error('[UPLOAD] File processing failed:', processingError.message);

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
    }

    console.info('[UPLOAD] Upload completed successfully:', {
      fileName: file.name,
      extractionRequested: extractData,
      extractionSuccess: !!processedData,
      totalTime: Date.now() - startTime,
    });

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error('[UPLOAD] Upload failed:', error);
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
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = ['pdf', 'doc', 'docx', 'zip', 'csv'];

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`,
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
    extension: extension,
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
    doc: ['application/msword'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    csv: ['text/csv', 'application/csv', 'text/plain'],
    zip: ['application/zip', 'application/x-zip-compressed'],
  };

  const allowedMimes = validMimeTypes[extension] || [];

  // Some browsers might not set MIME type correctly, so we're lenient
  if (mimeType && !allowedMimes.includes(mimeType)) {
    console.warn(`[UPLOAD] MIME type mismatch: ${mimeType} for extension .${extension}`);
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
  console.info('[UPLOAD] Starting file content processing');
  const processingStartTime = Date.now();

  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.debug('[UPLOAD] File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

    // Parse the file using the appropriate parser
    console.info(`[UPLOAD] Parsing file with extension: .${extension}`);
    const rawText = await ParserFactory.parseFile(arrayBuffer, file.type, file.name);

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file');
    }

    console.info('[UPLOAD] File parsed successfully, text length:', rawText.length);

    // Clean and prepare text for LLM processing
    const cleanedText = TextExtractor.cleanAndNormalize(rawText, extension);
    console.debug('[UPLOAD] Text cleaned, final length:', cleanedText.length);

    // Extract semantic structure for additional metadata
    const semanticStructure = TextExtractor.extractSemanticStructure(cleanedText);

    // Extract structured data using LLM
    console.info('[UPLOAD] Starting LLM extraction');
    const extractedData = await llmExtractor.extractResumeData(cleanedText, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      useEnhancedPrompts: true,
      validateResults: true,
    });

    console.info('[UPLOAD] LLM extraction completed');

    // Validate the extracted data
    console.info('[UPLOAD] Starting data validation');
    const validationResult = await dataValidator.validateResumeData(extractedData);
    console.info('[UPLOAD] Data validation completed');

    // Get processing statistics
    const processingTime = Date.now() - processingStartTime;
    const extractionStats = llmExtractor.getExtractionStats();

    const result = {
      extractedData,
      validation: validationResult,
      statistics: {
        processingTime,
        textLength: cleanedText.length,
        originalTextLength: rawText.length,
        semanticStructure,
        llmStats: extractionStats,
        fileInfo: {
          name: file.name,
          size: file.size,
          extension: extension,
          type: file.type,
        },
      },
    };

    console.info('[UPLOAD] File processing completed successfully:', {
      processingTime,
      validationPassed: validationResult.isValid,
      errorsFound: validationResult.errors.length,
      warningsFound: validationResult.warnings.length,
    });

    return result;
  } catch (error) {
    console.error('[UPLOAD] File processing failed:', error);

    // Provide more specific error messages
    if (error.message.includes('No text content')) {
      throw new Error('The file appears to be empty or contains no readable text content');
    } else if (error.message.includes('Invalid PDF')) {
      throw new Error('The PDF file is corrupted or password-protected');
    } else if (error.message.includes('Invalid or corrupted')) {
      throw new Error(
        `The ${extension.toUpperCase()} file is corrupted or in an unsupported format`,
      );
    } else if (error.message.includes('rate limit')) {
      throw new Error('AI processing service is temporarily unavailable. Please try again later.');
    } else if (error.message.includes('API quota')) {
      throw new Error('AI processing quota exceeded. Please contact support.');
    } else {
      throw new Error(`File processing failed: ${error.message}`);
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
  console.debug(`[UPLOAD] Extracted extension: ${ext} from filename: ${filename}`);
  return ext;
}
