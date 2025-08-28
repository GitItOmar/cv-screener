// Public API for the extraction module
// Other modules should only import from this file
// The domain files contain 'use server' directives

export { extractFromFile } from '../domain/extractor.js';
export { keywordDetector } from '../domain/keywordDetector.js';
