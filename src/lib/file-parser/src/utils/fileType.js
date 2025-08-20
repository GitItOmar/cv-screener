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
  'application/vnd.ms-word.document.macroEnabled.12': {
    extensions: ['.docm'],
    magicNumbers: [0x50, 0x4b, 0x03, 0x04], // PK (ZIP header)
    parser: 'docx',
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  // Test types for unit testing (excluded from public API)
  'text/plain': {
    extensions: ['.txt'],
    magicNumbers: null,
    parser: 'test',
    maxSize: 10 * 1024 * 1024, // 10MB
    isTestType: true,
  },
  'application/test': {
    extensions: ['.test'],
    magicNumbers: null,
    parser: 'test',
    maxSize: 10 * 1024 * 1024, // 10MB
    isTestType: true,
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

  // Additional magic number validation
  if (checkMagicNumbers && result.fileType) {
    try {
      await validateMagicNumbers(buffer, result.fileType);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Magic number validation failed: ${error.message}`);
    }
  }

  return result;
}

/**
 * Validate magic numbers for file integrity
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
  return Object.entries(SUPPORTED_TYPES)
    .filter(([, config]) => !config.isTestType)
    .map(([mimeType]) => mimeType);
}

/**
 * Get list of supported extensions
 * @returns {string[]} Array of supported extensions
 */
export function getSupportedExtensions() {
  const extensions = new Set();
  Object.values(SUPPORTED_TYPES)
    .filter((config) => !config.isTestType)
    .forEach((config) => {
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

/**
 * Enhanced file type detection with multiple methods
 * @param {ArrayBuffer|Buffer|File} input - File data
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} Enhanced file type information
 */
export async function detectFileTypeEnhanced(input, options = {}) {
  const {
    useMultipleMethods = true,
    requireMagicNumbers = false,
    confidenceThreshold = 'medium', // 'low', 'medium', 'high'
  } = options;

  const results = {
    detections: [],
    consensus: null,
    confidence: 'unknown',
    recommendedParser: null,
  };

  try {
    // Method 1: Magic number detection
    const magicResult = await detectByMagicNumber(
      Buffer.isBuffer(input)
        ? input
        : input instanceof File
          ? Buffer.from(await input.arrayBuffer())
          : Buffer.from(input),
    );

    if (magicResult) {
      results.detections.push({
        method: 'magic',
        mimeType: magicResult.mimeType,
        confidence: 'high',
        parser: magicResult.parser,
      });
    }

    if (useMultipleMethods) {
      // Method 2: File-type library
      try {
        const buffer = Buffer.isBuffer(input)
          ? input
          : input instanceof File
            ? Buffer.from(await input.arrayBuffer())
            : Buffer.from(input);

        const fileType = await fileTypeFromBuffer(buffer);
        if (fileType && SUPPORTED_TYPES[fileType.mime]) {
          results.detections.push({
            method: 'file-type',
            mimeType: fileType.mime,
            confidence: 'high',
            parser: SUPPORTED_TYPES[fileType.mime].parser,
          });
        }
      } catch {
        // Continue with other methods
      }

      // Method 3: Extension-based detection
      const filename = input instanceof File ? input.name : '';
      if (filename) {
        const extensionResult = detectByExtension(filename);
        if (extensionResult) {
          results.detections.push({
            method: 'extension',
            mimeType: extensionResult.mimeType,
            confidence: 'medium',
            parser: extensionResult.parser,
          });
        }
      }

      // Method 4: Content analysis (removed - CSV detection not implemented)
    }

    // Determine consensus
    results.consensus = determineConsensus(results.detections, { requireMagicNumbers });

    // If no consensus found, provide default unknown result
    if (!results.consensus) {
      results.consensus = {
        mimeType: 'application/octet-stream',
        parser: 'unknown',
        confidence: 'unknown',
        method: 'fallback',
      };
    }

    results.confidence = results.consensus.confidence || 'unknown';
    results.recommendedParser = results.consensus.parser || null;

    // Check confidence threshold
    const confidenceLevels = { low: 1, medium: 2, high: 3 };
    const requiredLevel = confidenceLevels[confidenceThreshold];
    const actualLevel = confidenceLevels[results.confidence];

    if (actualLevel < requiredLevel) {
      throw new UnsupportedFormatError(
        `File type detection confidence ${results.confidence} below threshold ${confidenceThreshold}`,
        {
          detections: results.detections,
          confidence: results.confidence,
          threshold: confidenceThreshold,
        },
      );
    }

    return results;
  } catch (error) {
    if (error instanceof UnsupportedFormatError) {
      throw error;
    }

    throw new ValidationError(`Enhanced file type detection failed: ${error.message}`);
  }
}

/**
 * Determine consensus from multiple detection results
 * @param {Array} detections - Array of detection results
 * @param {Object} options - Consensus options
 * @returns {Object|null} Consensus result
 * @private
 */
function determineConsensus(detections, options = {}) {
  if (detections.length === 0) {
    return null;
  }

  const { requireMagicNumbers = false } = options;

  // If magic numbers are required, prioritize those results
  if (requireMagicNumbers) {
    const magicResult = detections.find((d) => d.method === 'magic');
    if (magicResult) {
      return magicResult;
    }
    return null; // No magic number detection available
  }

  // Count votes for each parser/MIME type combination
  const votes = {};
  detections.forEach((detection) => {
    const key = `${detection.parser}:${detection.mimeType}`;
    if (!votes[key]) {
      votes[key] = {
        count: 0,
        detection,
        methods: [],
        maxConfidence: 'low',
      };
    }

    votes[key].count++;
    votes[key].methods.push(detection.method);

    // Update max confidence
    const confidenceLevels = { low: 1, medium: 2, high: 3 };
    if (confidenceLevels[detection.confidence] > confidenceLevels[votes[key].maxConfidence]) {
      votes[key].maxConfidence = detection.confidence;
    }
  });

  // Find the most voted result
  const sortedVotes = Object.values(votes).sort((a, b) => {
    // First sort by vote count
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    // Then by confidence level
    const confidenceLevels = { low: 1, medium: 2, high: 3 };
    return confidenceLevels[b.maxConfidence] - confidenceLevels[a.maxConfidence];
  });

  const winner = sortedVotes[0];
  return {
    ...winner.detection,
    confidence: winner.maxConfidence,
    voteCount: winner.count,
    methods: winner.methods,
  };
}

/**
 * Batch file type detection
 * @param {Array} files - Array of file inputs
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of detection results
 */
export async function batchDetectFileType(files, options = {}) {
  const { concurrency = 5, continueOnError = true } = options;

  const results = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchPromises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;

      try {
        const detection = await detectFileType(file, options);
        return { index: fileIndex, result: detection, error: null };
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        return { index: fileIndex, result: null, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Sort by original index
  results.sort((a, b) => a.index - b.index);

  return results.map((r) => ({
    result: r.result,
    error: r.error,
  }));
}
