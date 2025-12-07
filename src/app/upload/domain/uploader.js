/**
 * Upload business logic
 */

import { validateFile } from './validator.js';
import { extractFromFile } from '@/app/extraction/public';
import { ResumeEvaluator, jobRequirements } from '@/app/evaluation/public';
import { ResumeSummarizer } from '@/app/summarization/public';

// Initialize summarizer instance (singleton pattern)
let summarizerInstance = null;

function getSummarizer() {
  if (!summarizerInstance) {
    summarizerInstance = new ResumeSummarizer();
  }
  return summarizerInstance;
}

/**
 * Handle file upload process with extraction, evaluation, and summarization
 * @param {File} file - File to upload
 * @param {Object} options - Processing options
 * @param {boolean} options.enableSummarization - Whether to generate AI feedback
 * @param {Object} options.jobSettings - Custom job requirements (optional)
 * @returns {Promise<Object>} - Complete processing result
 */
export async function handleFileUpload(file, options = {}) {
  const { enableSummarization = true, jobSettings = null } = options;

  // Create evaluator with custom settings if provided
  const evaluator = jobSettings ? new ResumeEvaluator(jobSettings) : new ResumeEvaluator();
  // Validate the file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
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

    // Call evaluation directly with raw text for summarization
    let evaluation = null;
    let evaluationError = null;
    let rawText = extractionResult.text; // Get the cleaned text from extraction

    try {
      const evaluationResult = await evaluator.evaluateResume(
        extractionResult.extractedData,
        rawText, // Pass raw text for potential summarization
      );

      if (evaluationResult.success) {
        evaluation = evaluationResult.data;
        // Keep raw text for downstream summarization
        rawText = evaluationResult.rawText || rawText;
      } else {
        evaluationError = evaluationResult.error;
      }
    } catch (evalError) {
      evaluationError = `Evaluation failed: ${evalError.message}`;
    }

    // Generate AI feedback if evaluation was successful and summarization is enabled
    let summarization = null;
    let summarizationError = null;

    if (enableSummarization && evaluation && !evaluationError) {
      try {
        const summarizer = getSummarizer();

        summarization = await summarizer.generateFeedback({
          structuredData: extractionResult.extractedData,
          rawText,
          evaluationScores: evaluation,
          jobRequirements: jobSettings || jobRequirements,
        });

        // Store summarization data for the review interface (client-side only)
        // This will be handled by the frontend when it receives the response
        // Server-side storage could be added here if needed
      } catch (summaryError) {
        summarizationError = `Summarization failed: ${summaryError.message}`;
      }
    }

    return {
      success: true,
      fileInfo: fileMetadata,
      extractedData: extractionResult.extractedData,
      evaluation,
      evaluationError,
      summarization,
      summarizationError,
      rawText, // Include raw text for potential future use
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
