# Error Codes Documentation

This document provides a comprehensive overview of all error codes used in the @screening/file-parser package, their meanings, recovery strategies, and troubleshooting guidance.

## Error Hierarchy

All parser errors inherit from the base `ParserError` class and follow Node.js best practices:

- Use built-in Error objects as base
- Preserve stack traces in development
- Provide user-friendly messages in production
- Include structured error information for debugging

## Error Categories

### 1. Operational Errors (Recoverable)

These errors are caused by external factors and can often be recovered from:

#### `PARSE_TIMEOUT` (TimeoutError)

- **Description**: Parsing operation exceeded the configured timeout
- **Severity**: High
- **Retryable**: Yes
- **Common Causes**:
  - Large file size
  - Complex document structure
  - System resource constraints
- **Recovery Strategies**:
  - Increase timeout value
  - Retry with exponential backoff
  - Split large files into smaller chunks
- **User Message**: "File processing took too long and was cancelled. Please try with a smaller file."

#### `CORRUPTED_FILE` (CorruptedFileError)

- **Description**: File appears to be damaged or corrupted
- **Severity**: High
- **Retryable**: Yes (with partial recovery)
- **Common Causes**:
  - Incomplete file transfer
  - Disk corruption
  - Encoding issues
- **Recovery Strategies**:
  - Attempt partial content extraction
  - Retry download/transfer
  - Try alternative parsing methods
- **User Message**: "File appears to be corrupted or damaged. Please try with a different file."

#### `PARSE_FAILED` (ParseError)

- **Description**: General parsing failure
- **Severity**: Medium
- **Retryable**: Depends on underlying cause
- **Common Causes**:
  - Unsupported file features
  - Memory limitations
  - Library-specific errors
- **Recovery Strategies**:
  - Retry with different parser options
  - Attempt graceful degradation
  - Use fallback parsing methods
- **User Message**: "Unable to extract content from file. The file may be password-protected or corrupted."

### 2. Client Errors (Non-Recoverable)

These errors are caused by invalid input and require user action:

#### `VALIDATION_FAILED` (ValidationError)

- **Description**: File failed validation checks
- **Severity**: Low
- **Retryable**: No
- **Common Causes**:
  - Invalid file format
  - Missing required metadata
  - Security validation failure
- **Recovery Strategies**:
  - None - user must provide valid file
- **User Message**: "File validation failed. Please check that the file is in the correct format."

#### `UNSUPPORTED_FORMAT` (UnsupportedFormatError)

- **Description**: File format is not supported by the parser
- **Severity**: Medium
- **Retryable**: No
- **Common Causes**:
  - Wrong file extension
  - Unsupported file version
  - Non-standard format variation
- **Recovery Strategies**:
  - Convert file to supported format
  - Use different parser
- **User Message**: "File format not supported. Supported formats: {supported_types}"

#### `FILE_SIZE_EXCEEDED` (FileSizeError)

- **Description**: File size exceeds configured limits
- **Severity**: Medium
- **Retryable**: No
- **Common Causes**:
  - File too large for system memory
  - Configured size limits
  - Security restrictions
- **Recovery Strategies**:
  - Compress file
  - Split into smaller files
  - Increase size limits (if appropriate)
- **User Message**: "File is too large ({file_size}MB). Maximum size allowed is {max_size}MB."

### 3. System Errors (Critical)

These errors indicate system-level problems:

#### `INVALID_CONFIGURATION` (ConfigurationError)

- **Description**: Parser configuration is invalid
- **Severity**: Critical
- **Retryable**: No
- **Common Causes**:
  - Invalid configuration values
  - Missing required configuration
  - Conflicting options
- **Recovery Strategies**:
  - Fix configuration
  - Use default configuration
  - Validate configuration on startup
- **User Message**: "System configuration error. Please contact support."

## Error Recovery Strategies

### 1. Retry with Exponential Backoff

```javascript
import { ErrorRecovery } from '@screening/file-parser';

const result = await ErrorRecovery.retry(() => parser.parse(file), {
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  retryCondition: (error) => error.isRetryable(),
});
```

### 2. Graceful Degradation

```javascript
const strategies = [
  // Primary strategy
  (context) => fullParser.parse(context.file),
  // Fallback strategy
  (context) => simpleParser.parse(context.file),
  // Last resort
  (context) => textOnlyParser.parse(context.file),
];

const result = await ErrorRecovery.gracefulDegradation(strategies, { file });
```

### 3. Partial Recovery

```javascript
const result = await ErrorRecovery.partialRecovery(
  () => parser.parse(file),
  () => parser.extractText(file), // Fallback extractor
  {
    allowPartial: true,
    partialThreshold: 0.1,
  },
);
```

### 4. Circuit Breaker

```javascript
const circuitBreaker = ErrorRecovery.createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

const result = await circuitBreaker.execute(() => parser.parse(file));
```

## Error Monitoring and Debugging

### Error Context

Every error includes detailed context for debugging:

```javascript
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321
  },
  "error": {
    "name": "ParseError",
    "message": "PDF parsing failed: Invalid signature",
    "code": "PARSE_FAILED",
    "stack": "...", // Only in development
    "fingerprint": "ParseError|PARSE_FAILED|pdf|a1b2c3"
  },
  "context": {
    "parser": "pdf",
    "filename": "resume.pdf",
    "fileSize": 1024000,
    "operation": "parseWithValidation"
  },
  "timing": {
    "duration": 5000,
    "startTime": 1642248600000
  }
}
```

### Error Aggregation

For monitoring multiple errors:

```javascript
import { ErrorUtils } from '@screening/file-parser';

const summary = ErrorUtils.aggregateErrors(errors);
// Returns:
{
  "total": 100,
  "byType": {
    "ParseError": 45,
    "TimeoutError": 30,
    "ValidationError": 25
  },
  "byCode": {
    "PARSE_FAILED": 45,
    "PARSE_TIMEOUT": 30,
    "VALIDATION_FAILED": 25
  },
  "mostCommon": {
    "type": "ParseError",
    "count": 45,
    "percentage": 45
  },
  "transientCount": 75,
  "criticalCount": 5
}
```

## Best Practices

### 1. Error Handling in Applications

```javascript
import { ParserFactory, ErrorUtils, formatErrorForUser } from '@screening/file-parser';

try {
  const result = await ParserFactory.parseFile(file, {
    enableRecovery: true,
    retryAttempts: 2,
    allowPartialRecovery: true,
  });

  // Handle partial results
  if (result.partial) {
    console.warn('Partial recovery used:', result.warnings);
  }

  return result;
} catch (error) {
  // Log detailed error for debugging
  console.error(
    'Parse error:',
    ErrorUtils.createErrorContext(error, {
      parser: 'auto',
      filename: file.name,
      fileSize: file.size,
    }),
  );

  // Show user-friendly message
  const userMessage = formatErrorForUser(error);
  throw new Error(userMessage);
}
```

### 2. Configuration for Different Environments

```javascript
// Development
const devConfig = {
  enableRecovery: true,
  retryAttempts: 1,
  timeout: 10000,
  allowPartialRecovery: true,
  verboseErrors: true,
};

// Production
const prodConfig = {
  enableRecovery: true,
  retryAttempts: 3,
  timeout: 30000,
  allowPartialRecovery: false,
  verboseErrors: false,
};
```

### 3. Error Monitoring Integration

```javascript
// Custom error handler for monitoring
function handleParserError(error, context) {
  // Create error fingerprint for deduplication
  const fingerprint = ErrorUtils.createErrorFingerprint(error, context);

  // Send to monitoring service
  monitoring.recordError({
    fingerprint,
    severity: error.getSeverity(),
    retryable: error.isRetryable(),
    context: ErrorUtils.createErrorContext(error, context),
  });

  // Log locally
  console.error(`Parser error [${fingerprint}]:`, error.toJSON());
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### "File validation failed"

1. Check file format matches extension
2. Verify file is not corrupted
3. Ensure file size is within limits
4. Check file permissions

#### "Parsing timed out"

1. Increase timeout value
2. Check system resources
3. Try with smaller file
4. Enable partial recovery

#### "Unsupported format"

1. Verify file format is supported
2. Check file extension
3. Convert to supported format
4. Update parser to support format

#### "File too large"

1. Compress file before upload
2. Split large files
3. Increase size limits
4. Use streaming parser (if available)

### Performance Optimization

1. **Enable Recovery**: Use error recovery for better reliability
2. **Configure Timeouts**: Set appropriate timeouts for your use case
3. **Monitor Memory**: Watch memory usage with large files
4. **Use Circuit Breaker**: Prevent cascading failures
5. **Implement Caching**: Cache successful parse results

### Security Considerations

1. **Sanitize File Paths**: Never trust user-provided file paths
2. **Validate File Types**: Always validate actual file content, not just extension
3. **Limit Resource Usage**: Set memory and timeout limits
4. **Log Security Events**: Monitor for malicious files
5. **Use Sandboxing**: Run parsing in isolated environment when possible

## Migration from Legacy Error Handling

If you're migrating from the old error handling system:

### Before (Legacy)

```javascript
try {
  const result = parser.parse(file);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('corrupt')) {
    // Handle corruption
  }
  // Generic error handling
}
```

### After (New System)

```javascript
try {
  const result = await parser.parseWithValidation(file, { enableRecovery: true });
} catch (error) {
  switch (error.code) {
    case 'PARSE_TIMEOUT':
      // Handle timeout with retry
      break;
    case 'CORRUPTED_FILE':
      // Handle corruption with partial recovery
      break;
    default:
      // Use error utilities for better handling
      const userMessage = error.getUserMessage();
      const shouldRetry = error.isRetryable();
  }
}
```

## API Reference

For complete API documentation, see:

- [Base Error Classes](./api/errors.md)
- [Error Recovery Strategies](./api/recovery.md)
- [Error Utilities](./api/utils.md)
- [Configuration Options](./api/config.md)
