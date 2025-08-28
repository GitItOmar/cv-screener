/**
 * Upload business logic
 */

import { validateFile } from './validator.js';
import { extractFromFile } from '@/app/extraction/domain/extractor.js';
import { resumeEvaluator } from '@/app/evaluation/domain/evaluator.js';

/**
 * Handle file upload process with extraction and evaluation
 * @param {File} file - File to upload
 * @returns {Promise<Object>} - Upload, extraction, and evaluation result
 */
export async function handleFileUpload(file) {
  // Validate the file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Processing file:', file.name, 'Size:', file.size);
  }

  // Prepare file metadata
  const fileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: validation.extension,
    uploadedAt: new Date().toISOString(),
  };

  try {
    // Call extraction directly
    const extractionResult = await extractFromFile(file);

    if (!extractionResult.extractedData) {
      throw new Error('No data could be extracted from the file');
    }

    // Call evaluation directly
    let evaluation = null;
    let evaluationError = null;

    try {
      const evaluationResult = await resumeEvaluator.evaluateResume(extractionResult.extractedData);

      if (evaluationResult.success) {
        evaluation = evaluationResult.data;
        if (process.env.NODE_ENV === 'development') {
          console.log('Evaluation successful. Score:', `${evaluation.overall?.finalPercentage}%`);
        }
      } else {
        evaluationError = evaluationResult.error;
        if (process.env.NODE_ENV === 'development') {
          console.log('Evaluation failed:', evaluationError);
        }
      }
    } catch (evalError) {
      evaluationError = `Evaluation failed: ${evalError.message}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('Evaluation exception:', evalError.message);
      }
    }

    return {
      success: true,
      fileInfo: fileMetadata,
      extractedData: extractionResult.extractedData,
      evaluation,
      evaluationError,
    };
  } catch (extractionError) {
    // Return partial success with file info but extraction error
    return {
      success: true,
      fileInfo: fileMetadata,
      processing: {
        success: false,
        error: extractionError.message,
      },
    };
  }
}
