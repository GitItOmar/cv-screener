/**
 * Upload business logic
 */

import { validateFile } from './validator.js';
import { extractFromFile } from '@/app/extraction/domain/extractor.js';

/**
 * Handle file upload process with extraction
 * @param {File} file - File to upload
 * @returns {Promise<Object>} - Upload and extraction result
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
    // Extract data from the uploaded file
    const extractionResult = await extractFromFile(file);

    return {
      success: true,
      fileInfo: fileMetadata,
      extractedData: extractionResult.extractedData,
      validation: extractionResult.validation,
      statistics: extractionResult.statistics,
      debug: extractionResult.debug,
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
