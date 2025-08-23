/**
 * Upload business logic
 */

import { validateFile } from './validator.js';

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

  // Prepare file metadata
  const fileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: validation.extension,
    uploadedAt: new Date().toISOString(),
  };

  try {
    // Call extraction API through HTTP
    const formData = new FormData();
    formData.append('file', file);
    formData.append('includeEvaluation', 'true'); // Request evaluation as well

    // Use absolute URL for extraction API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const extractionUrl = `${baseUrl}/extraction/api`;

    const extractionResponse = await fetch(extractionUrl, {
      method: 'POST',
      body: formData,
    });

    if (!extractionResponse.ok) {
      const errorData = await extractionResponse.json();
      throw new Error(errorData.details || errorData.error || 'Extraction failed');
    }

    const extractionResult = await extractionResponse.json();

    return {
      success: true,
      fileInfo: fileMetadata,
      extractedData: extractionResult.extractedData,
      evaluation: extractionResult.evaluation,
      evaluationError: extractionResult.evaluationError,
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
