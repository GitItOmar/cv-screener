# Product Requirements Document: @screening/file-parser Package

## Executive Summary

### Problem Statement

The CV screening application currently has file parsing functionality tightly coupled within the main application codebase. The parsers (PDF, DOCX, CSV) are scattered in the lib directory and directly import third-party dependencies. This creates several issues:

- Difficult to test parsers in isolation
- Hard to manage parser-specific dependencies
- No clear separation between parsing logic and application logic
- Challenging to extend with new file formats
- No consistent error handling across parsers

### Proposed Solution

Create an internal npm package `@screening/file-parser` that encapsulates all file parsing functionality. This package will:

- Provide a unified interface for parsing different file formats
- Abstract third-party dependencies behind a consistent API
- Implement robust error handling and validation
- Support extensibility for new file formats
- Include comprehensive testing and documentation

### Key Benefits

- **Modularity**: Clear separation of parsing logic from application code
- **Maintainability**: Centralized dependency management and updates
- **Testability**: Isolated unit tests for each parser
- **Reusability**: Can be used across different features (upload, extraction, batch processing)
- **Consistency**: Unified error handling and response format
- **Extensibility**: Easy to add new file format support

### Key Risks

- **Migration Effort**: Requires refactoring existing code that uses parsers
- **Learning Curve**: Team needs to understand package structure
- **Versioning Complexity**: Managing internal package versions
- **Build Configuration**: Setting up package build tooling

## Technical Analysis

### Current Architecture Assessment

#### Current Structure

```
src/lib/parsers/
├── pdfParser.js       # PDF parsing with pdf2json
├── docxParser.js      # DOCX parsing with mammoth
├── csvParser.js       # CSV parsing with csv-parse
└── parserFactory.js   # Factory pattern for parser selection
```

#### Current Dependencies

- **pdf2json**: PDF parsing (v3.2.0)
- **mammoth**: DOCX parsing (v1.10.0)
- **csv-parse**: CSV parsing (v6.1.0)

#### Current Issues

1. **Tight Coupling**: Parsers directly imported in route handlers
2. **Inconsistent APIs**: Each parser has slightly different method signatures
3. **No Abstraction**: Third-party libraries exposed directly
4. **Limited Error Context**: Generic error messages without parser context
5. **No Streaming Support**: All parsers load full file into memory

### Proposed Architecture

#### Package Structure

```
src/lib/file-parser/
├── package.json
├── README.md
├── src/
│   ├── index.js              # Main exports
│   ├── FileParser.js         # Main class/interface
│   ├── parsers/
│   │   ├── base.js          # Base parser class
│   │   ├── pdf.js           # PDF parser implementation
│   │   ├── docx.js          # DOCX parser implementation
│   │   └── csv.js           # CSV parser implementation
│   ├── utils/
│   │   ├── fileType.js      # File type detection
│   │   ├── validator.js     # File validation
│   │   └── errors.js        # Custom error classes
│   └── config/
│       └── defaults.js       # Default configurations
├── tests/
│   ├── unit/
│   │   ├── pdf.test.js
│   │   ├── docx.test.js
│   │   └── csv.test.js
│   ├── integration/
│   │   └── FileParser.test.js
│   └── fixtures/
│       ├── sample.pdf
│       ├── sample.docx
│       └── sample.csv
└── docs/
    ├── API.md
    └── examples/
```

#### API Design

```javascript
// Main interface
import FileParser from '@/lib/file-parser';

// Simple usage
const result = await FileParser.parse(file);

// Advanced usage with options
const result = await FileParser.parse(file, {
  type: 'pdf',              // Force specific parser
  extractMetadata: true,    // Extract file metadata
  maxSize: 10 * 1024 * 1024, // 10MB limit
  timeout: 30000,           // 30 second timeout
  onProgress: (progress) => console.log(progress)
});

// Result structure
{
  success: true,
  data: {
    text: "extracted text content",
    metadata: {
      title: "Document Title",
      author: "Author Name",
      created: "2024-01-01",
      pages: 10,
      format: "pdf"
    },
    statistics: {
      characters: 5000,
      words: 1000,
      lines: 100
    }
  },
  parser: "pdf",
  processingTime: 1500
}
```

### Dependency Mapping

#### Core Dependencies

- **pdf2json**: Continue using for PDF parsing
- **mammoth**: Continue using for DOCX parsing
- **csv-parse**: Continue using for CSV parsing

#### New Dependencies

- **file-type**: For accurate MIME type detection
- **p-timeout**: For timeout handling
- **joi**: For input validation (optional)

### Performance Considerations

1. **Memory Management**
   - Implement streaming for large files
   - Add memory usage monitoring
   - Garbage collection optimization

2. **Processing Speed**
   - Parallel processing for multiple files
   - Caching parsed results
   - Lazy loading of parsers

3. **Error Recovery**
   - Retry mechanism for transient failures
   - Partial extraction on errors
   - Graceful degradation

## Implementation Plan

### Phase 1: Package Setup (Day 1)

- Initialize package structure
- Configure package.json
- Set up build tools
- Create base parser interface

### Phase 2: Parser Migration (Day 2-3)

- Migrate PDF parser
- Migrate DOCX parser
- Migrate CSV parser
- Create unified error handling

### Phase 3: API Development (Day 4)

- Implement FileParser main class
- Add file type detection
- Create validation utilities
- Build configuration system

### Phase 4: Testing (Day 5)

- Write unit tests for each parser
- Create integration tests
- Add performance benchmarks
- Test error scenarios

### Phase 5: Documentation (Day 6)

- Write API documentation
- Create usage examples
- Document migration guide
- Add troubleshooting guide

### Phase 6: Integration (Day 7)

- Update application to use package
- Refactor existing code
- Test in application context
- Fix integration issues

## Risk Assessment

### Technical Risks

| Risk                             | Impact | Probability | Mitigation                                       |
| -------------------------------- | ------ | ----------- | ------------------------------------------------ |
| Breaking changes in dependencies | High   | Medium      | Pin dependency versions, add compatibility tests |
| Performance degradation          | Medium | Low         | Benchmark before/after, optimize critical paths  |
| Memory leaks                     | High   | Low         | Add memory profiling, implement proper cleanup   |
| Incompatible file formats        | Medium | Medium      | Graceful error handling, clear error messages    |

### Timeline Risks

| Risk                      | Impact | Probability | Mitigation                                |
| ------------------------- | ------ | ----------- | ----------------------------------------- |
| Underestimated complexity | Medium | Medium      | Add buffer time, prioritize core features |
| Integration issues        | High   | Medium      | Early integration testing, staged rollout |
| Testing takes longer      | Low    | Medium      | Parallel test development, use TDD        |

### Mitigation Strategies

1. **Incremental Migration**: Migrate one parser at a time
2. **Feature Flags**: Use flags to toggle between old/new implementation
3. **Comprehensive Testing**: Extensive test coverage before integration
4. **Rollback Plan**: Keep old implementation available for quick rollback
5. **Monitoring**: Add logging and metrics for production monitoring

## Task List

### 1. Package Initialization

**GitHub Issue**: [#54](https://github.com/GitItOmar/cv-screener/issues/54)  
**Priority**: High  
**Story Points**: 2  
**User Story**: As a developer, I want a properly configured parser package so that I can develop and test parsers in isolation  
**Acceptance Criteria**:

- [ ] Package structure created with all directories
- [ ] package.json configured with scripts and dependencies
- [ ] ESLint and Prettier configured
- [ ] Basic README with setup instructions
- [ ] Git ignore patterns configured

### 2. Base Parser Interface

**GitHub Issue**: [#55](https://github.com/GitItOmar/cv-screener/issues/55)  
**Priority**: High  
**Story Points**: 3  
**User Story**: As a developer, I want a consistent parser interface so that all parsers follow the same contract  
**Acceptance Criteria**:

- [ ] BaseParser class with abstract methods defined
- [ ] Common validation methods implemented
- [ ] Error handling structure established
- [ ] Progress reporting mechanism created
- [ ] Unit tests for base functionality

### 3. PDF Parser Implementation

**GitHub Issue**: [#56](https://github.com/GitItOmar/cv-screener/issues/56)  
**Priority**: High  
**Story Points**: 5  
**User Story**: As a user, I want to parse PDF files so that I can extract text from PDF resumes  
**Acceptance Criteria**:

- [ ] PDF parser extends BaseParser
- [ ] Handles encrypted PDFs gracefully
- [ ] Extracts text with structure preservation
- [ ] Extracts metadata (author, creation date, etc.)
- [ ] Handles multi-page documents
- [ ] Unit tests with various PDF formats

### 4. DOCX Parser Implementation

**Priority**: High  
**Story Points**: 5  
**User Story**: As a user, I want to parse DOCX files so that I can extract text from Word resumes  
**Acceptance Criteria**:

- [ ] DOCX parser extends BaseParser
- [ ] Preserves document structure (headings, lists)
- [ ] Handles tables appropriately
- [ ] Extracts basic metadata
- [ ] Handles corrupted files gracefully
- [ ] Unit tests with various DOCX formats

### 6. File Type Detection

**Priority**: High  
**Story Points**: 2  
**User Story**: As a developer, I want automatic file type detection so that the correct parser is selected  
**Acceptance Criteria**:

- [ ] MIME type detection implemented
- [ ] File extension fallback
- [ ] Magic number validation for security
- [ ] Support for all configured file types
- [ ] Unit tests for edge cases

### 7. Unified Error Handling

**Priority**: High  
**Story Points**: 3  
**User Story**: As a developer, I want consistent error handling so that I can handle parsing failures gracefully  
**Acceptance Criteria**:

- [ ] Custom error classes created
- [ ] Error codes defined and documented
- [ ] Stack traces preserved in development
- [ ] User-friendly messages in production
- [ ] Error recovery strategies implemented

### 8. Main FileParser Class

**Priority**: High  
**Story Points**: 5  
**User Story**: As a developer, I want a simple API to parse files so that I don't need to know parser internals  
**Acceptance Criteria**:

- [ ] Single entry point for all parsing
- [ ] Automatic parser selection
- [ ] Options validation
- [ ] Progress reporting
- [ ] Comprehensive result structure
- [ ] Integration tests

### 9. Configuration System

**Priority**: Medium  
**Story Points**: 2  
**User Story**: As a developer, I want to configure parser behavior so that I can customize parsing for my needs  
**Acceptance Criteria**:

- [ ] Default configuration defined
- [ ] Runtime configuration override
- [ ] Environment variable support
- [ ] Validation of configuration values
- [ ] Documentation of all options

### 10. Memory Optimization

**Priority**: Medium  
**Story Points**: 3  
**User Story**: As a developer, I want efficient memory usage so that the application can handle large files  
**Acceptance Criteria**:

- [ ] Streaming support for large files
- [ ] Memory usage monitoring
- [ ] Cleanup of temporary resources
- [ ] Memory limit configuration
- [ ] Performance benchmarks

### 11. Testing Suite

**Priority**: High  
**Story Points**: 5  
**User Story**: As a developer, I want comprehensive tests so that I can ensure parser reliability  
**Acceptance Criteria**:

- [ ] Unit tests for each parser
- [ ] Integration tests for FileParser
- [ ] Performance benchmarks
- [ ] Edge case coverage
- [ ] Test fixtures for all formats
- [ ] CI/CD integration

### 12. Documentation

**Priority**: Medium  
**Story Points**: 3  
**User Story**: As a developer, I want clear documentation so that I can use the parser package effectively  
**Acceptance Criteria**:

- [ ] API documentation complete
- [ ] Usage examples provided
- [ ] Migration guide from old parsers
- [ ] Troubleshooting section
- [ ] Performance tips

### 13. Package Build System

**Priority**: High  
**Story Points**: 2  
**User Story**: As a developer, I want a build system so that the package can be used in the application  
**Acceptance Criteria**:

- [ ] Build scripts configured
- [ ] Source maps generated
- [ ] Minification for production
- [ ] Watch mode for development
- [ ] Clean build process

### 14. Application Integration

**Priority**: High  
**Story Points**: 5  
**User Story**: As a developer, I want to use the parser package in the application so that parsing is centralized  
**Acceptance Criteria**:

- [ ] Package integrated into application lib structure
- [ ] Upload route refactored to use package
- [ ] Extraction feature uses package
- [ ] All tests passing
- [ ] No regression in functionality

### 15. Performance Monitoring

**Priority**: Low  
**Story Points**: 2  
**User Story**: As a developer, I want to monitor parser performance so that I can identify bottlenecks  
**Acceptance Criteria**:

- [ ] Timing metrics collected
- [ ] Memory usage tracked
- [ ] Success/failure rates logged
- [ ] Performance dashboard (optional)
- [ ] Alerting for degradation

## Success Metrics

### Technical Metrics

- **Test Coverage**: >90% code coverage
- **Performance**: <2 second parsing for 10MB files
- **Memory Usage**: <100MB for typical files
- **Error Rate**: <1% parsing failures
- **Build Time**: <30 seconds

### Development Metrics

- **Development Time**: 7 days as planned
- **Bug Count**: <5 critical bugs during integration
- **Documentation Coverage**: 100% of public APIs
- **Code Quality**: A rating on code analysis tools

### Business Metrics

- **Feature Adoption**: 100% of parsing uses new package
- **Developer Satisfaction**: Positive feedback from team
- **Maintenance Time**: 50% reduction in parser-related bugs
- **Extensibility**: New parser added in <1 day

## Next Steps

1. **Review and Approval**: Get team feedback on PRD
2. **Technical Spike**: Validate package integration approach
3. **Create GitHub Issues**: Convert tasks to trackable issues
4. **Begin Implementation**: Start with Phase 1
5. **Regular Check-ins**: Daily progress updates during implementation

## References

- [Node.js Best Practices - Wrap Utilities](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/wraputilities.md)
- [npm Package Development](https://docs.npmjs.com/creating-node-js-modules)
- [File Type Detection Best Practices](https://github.com/sindresorhus/file-type)

## Appendix

### A. Current Parser Usage Analysis

- Upload route: Uses all three parsers via ParserFactory
- Extraction feature: Uses ParserFactory for initial parsing
- No other direct parser usage found

### B. Dependency License Review

- pdf2json: Apache-2.0
- mammoth: BSD-2-Clause
- csv-parse: MIT
- All licenses are compatible with commercial use

### C. Alternative Approaches Considered

1. **Keep parsers in lib**: Rejected due to lack of modularity
2. **External npm package**: Rejected as overkill for internal use
3. **Microservice**: Rejected due to complexity and latency
4. **Browser-based parsing**: Rejected due to performance limitations
