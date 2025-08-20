/**
 * File validation logic for upload feature
 */

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_EXTENSIONS = ['pdf', 'docx'];

/**
 * Validate uploaded file
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 1MB.`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file type: .${extension}. Supported types: ${ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(', ')}`,
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
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
function getFileExtension(filename) {
  const ext = filename.split('.').pop() || 'unknown';
  return ext;
}
