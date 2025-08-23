# @screening/file-parser

A simplified file parsing package for CV screening. Supports PDF and DOCX file formats with hardcoded configurations optimized for resume processing.

## Features

- **Multi-format Support**: Parse PDF and DOCX files
- **Unified API**: Simple, consistent interface
- **Optimized for Resumes**: Hardcoded configurations for CV processing
- **Error Handling**: Basic error recovery and validation
- **Lightweight**: Minimal dependencies and simplified codebase

## Installation

This is a private package within the screening monorepo. Dependencies are automatically installed.

## Quick Start

```javascript
import FileParser from '@screening/file-parser';

// Parse any supported file format
const result = await FileParser.parse(file);

console.log(result.data.text); // Extracted text
console.log(result.parser); // Parser used ('pdf' or 'docx')
console.log(result.processingTime); // Time taken to parse
```

## Configuration

The package uses hardcoded configurations optimized for resume processing:

- **File size limit**: 1MB (suitable for resumes)
- **Timeout**: 45 seconds
- **PDF**: Max 50 pages, text cleaning enabled
- **DOCX**: Headers included, footers excluded, tables converted

## API Reference

### `FileParser.parse(file, options?)`

Parse a file and extract its text content.

**Parameters:**

- `file` (File|ArrayBuffer|Buffer): The file to parse
- `options` (Object, optional): Override default configurations

**Returns:** Promise\<Object>

- `success` (boolean): Whether parsing succeeded
- `data` (Object): Parsed content with `text` property
- `parser` (string): Parser used ('pdf' or 'docx')
- `processingTime` (number): Processing time in milliseconds
- `file` (Object): File information (name, size, type)
- `timestamp` (string): ISO timestamp of parsing

**Example:**

```javascript
const result = await FileParser.parse(file);
if (result.success) {
  console.log('Text:', result.data.text);
}
```

### `FileParser.getSupportedFormats()`

Get list of supported file formats.

**Returns:** Array of supported format information.

### `FileParser.isSupported(mimeType)`

Check if a MIME type is supported.

**Parameters:**

- `mimeType` (string): MIME type to check

**Returns:** boolean

## Error Handling

The parser throws descriptive errors that can be caught and handled:

```javascript
try {
  const result = await FileParser.parse(file);
} catch (error) {
  console.error('Parsing failed:', error.message);
}
```

## Supported Formats

| Format | MIME Type                                                                 | Extensions |
| ------ | ------------------------------------------------------------------------- | ---------- |
| PDF    | `application/pdf`                                                         | `.pdf`     |
| DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx`    |

## Dependencies

- `file-type`: File type detection
- `mammoth`: DOCX parsing
- `p-timeout`: Timeout handling
- `pdf2json`: PDF parsing

## License

MIT
