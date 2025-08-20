# @screening/file-parser

A comprehensive file parsing package for the CV screening application. This package provides a unified interface for parsing PDF and DOCX files with robust error handling and metadata extraction.

## Features

- **Multi-format Support**: Parse PDF and DOCX files
- **Unified API**: Consistent interface across all parsers
- **Error Handling**: Comprehensive error reporting with context
- **Metadata Extraction**: Extract document metadata and statistics
- **Progress Reporting**: Track parsing progress for large files
- **Type Detection**: Automatic file type detection
- **Validation**: Built-in file validation

## Installation

This is a private package within the screening monorepo. Install dependencies:

```bash
npm install
```

## Quick Start

```javascript
import FileParser from '@screening/file-parser';

// Parse any supported file format
const result = await FileParser.parse(file);

console.log(result.data.text); // Extracted text
console.log(result.data.metadata); // File metadata
console.log(result.parser); // Parser used
```

## Advanced Usage

```javascript
import FileParser from '@screening/file-parser';

// Parse with options
const result = await FileParser.parse(file, {
  type: 'pdf', // Force specific parser
  extractMetadata: true, // Extract file metadata
  maxSize: 10 * 1024 * 1024, // 10MB limit
  timeout: 30000, // 30 second timeout
  onProgress: (progress) => {
    console.log(`Parsing: ${progress}%`);
  },
});

// Check result
if (result.success) {
  const { text, metadata, statistics } = result.data;
  console.log(`Parsed ${statistics.pages} pages`);
  console.log(`Created: ${metadata.created}`);
} else {
  console.error('Parsing failed:', result.error);
}
```

## Supported File Formats

| Format | Extension | Parser   | Description              |
| ------ | --------- | -------- | ------------------------ |
| PDF    | .pdf      | pdf2json | Portable Document Format |
| DOCX   | .docx     | mammoth  | Microsoft Word Document  |

## API Reference

### FileParser.parse(file, options?)

Parse a file and extract text content.

**Parameters:**

- `file` (File | ArrayBuffer): File to parse
- `options` (Object, optional): Parsing options
  - `type` (string): Force specific parser ('pdf', 'docx')
  - `extractMetadata` (boolean): Extract file metadata (default: true)
  - `maxSize` (number): Maximum file size in bytes
  - `timeout` (number): Parsing timeout in milliseconds
  - `onProgress` (function): Progress callback

**Returns:** Promise<ParseResult>

```typescript
interface ParseResult {
  success: boolean;
  data?: {
    text: string;
    metadata: {
      title?: string;
      author?: string;
      created?: string;
      modified?: string;
      pages?: number;
      format: string;
    };
    statistics: {
      characters: number;
      words: number;
      lines: number;
    };
  };
  parser: string;
  processingTime: number;
  error?: string;
}
```

## Development

### Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Project Structure

```
src/
├── index.js              # Main exports
├── FileParser.js         # Main parser class
├── parsers/
│   ├── base.js          # Base parser class
│   ├── pdf.js           # PDF parser
│   └── docx.js          # DOCX parser
├── utils/
│   ├── fileType.js      # File type detection
│   ├── validator.js     # File validation
│   └── errors.js        # Custom error classes
└── config/
    └── defaults.js       # Default configurations
```

### Adding New Parsers

1. Create parser class extending `BaseParser`
2. Implement required methods: `parse()`, `validate()`, `extractMetadata()`
3. Add file type detection support
4. Create comprehensive tests
5. Update documentation

Example:

```javascript
import BaseParser from './base.js';

export default class NewFormatParser extends BaseParser {
  static supportedTypes = ['application/x-new-format'];
  static extensions = ['.nf'];

  async parse(buffer, options = {}) {
    // Implementation
    return this.createResult(text, metadata);
  }

  async validate(buffer) {
    // Validation logic
    return { valid: true };
  }

  async extractMetadata(buffer) {
    // Metadata extraction
    return {};
  }
}
```

## Testing

Run the test suite:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

Test files are located in:

- `tests/unit/`: Unit tests for individual parsers
- `tests/integration/`: Integration tests for FileParser
- `tests/fixtures/`: Sample files for testing

## Error Handling

The package provides comprehensive error handling with specific error types:

```javascript
import { ParseError, ValidationError, TimeoutError } from '@screening/file-parser';

try {
  const result = await FileParser.parse(file);
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Parsing failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('File validation failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Parsing timed out:', error.message);
  }
}
```

## Performance

- Streaming support for large files
- Memory-efficient processing
- Progress reporting for long operations
- Configurable timeouts and limits

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run linting and formatting
5. Ensure all tests pass

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0

- Initial release
- Support for PDF and DOCX parsing
- Unified API interface
- Comprehensive error handling
- Metadata extraction
- Progress reporting
