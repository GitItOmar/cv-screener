/**
 * File type detection and validation utilities
 */

import { fileTypeFromBuffer } from 'file-type';
import { ValidationError, UnsupportedFormatError } from './errors.js';

/**
 * Supported file types configuration
 */
export const SUPPORTED_TYPES = {
  'application/pdf': {
    extensions: ['.pdf'],
    magicNumbers: [0x25, 0x50, 0x44, 0x46], // %PDF
    parser: 'pdf',
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    magicNumbers: [0x50, 0x4b, 0x03, 0x04], // PK (ZIP header)
    parser: 'docx',
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  'text/csv': {
    extensions: ['.csv'],
    magicNumbers: null, // CSV has no magic number
    parser: 'csv',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'application/csv': {
    extensions: ['.csv'],
    magicNumbers: null,
    parser: 'csv',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  // Test types for unit testing
  'text/plain': {
    extensions: ['.txt'],
    magicNumbers: null,
    parser: 'test',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'application/test': {
    extensions: ['.test'],
    magicNumbers: null,
    parser: 'test',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * Detect file type from buffer or file object
 * @param {ArrayBuffer|Buffer|File} input - File data
 * @param {string} filename - Optional filename for extension fallback
 * @returns {Promise<Object>} File type information
 */
export async function detectFileType(input, filename = '') {
  let buffer;
  let name = filename;

  // Handle different input types
  if (input instanceof File) {
    name = input.name;
    buffer = Buffer.from(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    buffer = Buffer.from(input);
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    throw new ValidationError('Invalid input type for file detection');
  }

  // Try magic number detection first (most reliable)
  const detectedType = await detectByMagicNumber(buffer);
  if (detectedType) {
    return detectedType;
  }

  // Try file-type library
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    if (fileType && SUPPORTED_TYPES[fileType.mime]) {
      return {
        mimeType: fileType.mime,
        extension: fileType.ext,
        parser: SUPPORTED_TYPES[fileType.mime].parser,
        confidence: 'high',
        method: 'file-type-library',
      };
    }
  } catch {
    // Continue to extension fallback
  }

  // Fallback to extension detection
  if (name) {
    const extensionType = detectByExtension(name);
    if (extensionType) {
      return {
        ...extensionType,
        confidence: 'medium',
        method: 'extension',
      };
    }
  }

  // Try content analysis for CSV
  if (buffer.length > 0) {
    const csvType = detectCSVByContent(buffer);
    if (csvType) {
      return {
        ...csvType,
        confidence: 'low',
        method: 'content-analysis',
      };
    }
  }

  throw new UnsupportedFormatError('Unable to determine file type', {
    detectedType: 'unknown',
    supportedTypes: Object.keys(SUPPORTED_TYPES),
    filename: name,
  });
}

/**
 * Detect file type by magic numbers
 * @param {Buffer} buffer - File buffer
 * @returns {Object|null} File type or null
 */
function detectByMagicNumber(buffer) {
  if (buffer.length < 4) return null;

  for (const [mimeType, config] of Object.entries(SUPPORTED_TYPES)) {
    if (!config.magicNumbers) continue;

    const matches = config.magicNumbers.every((byte, index) => {
      return index < buffer.length && buffer[index] === byte;
    });

    if (matches) {
      return {
        mimeType,
        extension: config.extensions[0],
        parser: config.parser,
        confidence: 'high',
        method: 'magic-number',
      };
    }
  }

  return null;
}

/**
 * Detect file type by extension
 * @param {string} filename - Filename with extension
 * @returns {Object|null} File type or null
 */
function detectByExtension(filename) {
  const extension = getFileExtension(filename);
  if (!extension) return null;

  for (const [mimeType, config] of Object.entries(SUPPORTED_TYPES)) {
    if (config.extensions.includes(extension)) {
      return {
        mimeType,
        extension,
        parser: config.parser,
      };
    }
  }

  return null;
}

/**
 * Detect CSV by content analysis
 * @param {Buffer} buffer - File buffer
 * @returns {Object|null} File type or null
 */
function detectCSVByContent(buffer) {
  try {
    const text = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    const lines = text.split('\n').slice(0, 5); // Check first 5 lines

    // Look for CSV patterns
    const csvIndicators = [
      /^[^,\n]*,[^,\n]*,/, // At least 2 commas per line
      /^[^;\n]*;[^;\n]*;/, // Semicolon separated
      /^[^\t\n]*\t[^\t\n]*\t/, // Tab separated
    ];

    let matchingLines = 0;
    for (const line of lines) {
      if (line.trim() && csvIndicators.some((pattern) => pattern.test(line))) {
        matchingLines++;
      }
    }

    // If most lines look like CSV, assume it's CSV
    if (matchingLines >= Math.ceil(lines.length * 0.6)) {
      return {
        mimeType: 'text/csv',
        extension: '.csv',
        parser: 'csv',
      };
    }
  } catch {
    // Ignore content analysis errors
  }

  return null;
}

/**
 * Extract file extension from filename
 * @param {string} filename - Filename
 * @returns {string} Extension with dot or empty string
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';

  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return '';

  return filename.substring(lastDot).toLowerCase();
}

/**
 * Validate file against type configuration
 * @param {ArrayBuffer|Buffer|File} input - File data
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
export async function validateFile(input, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = Object.keys(SUPPORTED_TYPES),
    checkMagicNumbers = true,
    requireExtension = false,
  } = options;

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    fileType: null,
    size: 0,
  };

  let buffer;
  let filename = '';
  let fileSize = 0;

  // Handle different input types and get basic info
  if (input instanceof File) {
    filename = input.name;
    fileSize = input.size;
    buffer = Buffer.from(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    fileSize = input.byteLength;
    buffer = Buffer.from(input);
  } else if (Buffer.isBuffer(input)) {
    fileSize = input.length;
    buffer = input;
  } else {
    result.valid = false;
    result.errors.push('Invalid input type');
    return result;
  }

  result.size = fileSize;

  // Check file size
  if (fileSize > maxSize) {
    result.valid = false;
    result.errors.push(`File size (${fileSize} bytes) exceeds maximum allowed (${maxSize} bytes)`);
  }

  if (fileSize === 0) {
    result.valid = false;
    result.errors.push('File is empty');
    return result;
  }

  // Detect file type
  try {
    const fileType = await detectFileType(buffer, filename);
    result.fileType = fileType;

    // Check if type is allowed
    if (!allowedTypes.includes(fileType.mimeType)) {
      result.valid = false;
      result.errors.push(`File type ${fileType.mimeType} is not allowed`);
    }

    // Check type-specific size limits
    const typeConfig = SUPPORTED_TYPES[fileType.mimeType];
    if (typeConfig && fileSize > typeConfig.maxSize) {
      result.valid = false;
      result.errors.push(
        `File size (${fileSize} bytes) exceeds maximum for ${fileType.mimeType} (${typeConfig.maxSize} bytes)`,
      );
    }

    // Warn about low confidence detection
    if (fileType.confidence === 'low') {
      result.warnings.push('File type detection confidence is low');
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(error.message);
  }

  // Check filename requirements
  if (requireExtension && filename && !getFileExtension(filename)) {
    result.valid = false;
    result.errors.push('File must have an extension');
  }

  // Additional magic number validation for security
  if (checkMagicNumbers && result.fileType) {
    try {
      await validateMagicNumbers(buffer, result.fileType);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Security validation failed: ${error.message}`);
    }
  }

  return result;
}

/**
 * Validate magic numbers for security
 * @param {Buffer} buffer - File buffer
 * @param {Object} fileType - Detected file type
 */
async function validateMagicNumbers(buffer, fileType) {
  const config = SUPPORTED_TYPES[fileType.mimeType];
  if (!config.magicNumbers) return; // No magic numbers to check

  const matches = config.magicNumbers.every((byte, index) => {
    return index < buffer.length && buffer[index] === byte;
  });

  if (!matches && fileType.method !== 'extension') {
    throw new ValidationError(
      `File content does not match expected format for ${fileType.mimeType}`,
      {
        expectedMagicNumbers: config.magicNumbers,
        actualBytes: Array.from(buffer.subarray(0, 8)),
      },
    );
  }
}

/**
 * Check if file type is supported
 * @param {string} mimeType - MIME type to check
 * @returns {boolean} Whether type is supported
 */
export function isSupported(mimeType) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_TYPES, mimeType);
}

/**
 * Get list of supported MIME types
 * @returns {string[]} Array of supported MIME types
 */
export function getSupportedTypes() {
  return Object.keys(SUPPORTED_TYPES);
}

/**
 * Get list of supported extensions
 * @returns {string[]} Array of supported extensions
 */
export function getSupportedExtensions() {
  const extensions = new Set();
  Object.values(SUPPORTED_TYPES).forEach((config) => {
    config.extensions.forEach((ext) => extensions.add(ext));
  });
  return Array.from(extensions);
}

/**
 * Get parser name for MIME type
 * @param {string} mimeType - MIME type
 * @returns {string|null} Parser name or null
 */
export function getParserForType(mimeType) {
  const config = SUPPORTED_TYPES[mimeType];
  return config ? config.parser : null;
}
