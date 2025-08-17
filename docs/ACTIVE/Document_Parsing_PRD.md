# Product Requirements Document: Document Parsing System

## Executive Summary

### Problem Statement

The current upload system accepts CV files but doesn't actually process or parse their contents. Files are uploaded but no information is extracted, making it impossible to perform actual CV screening or analysis. The system needs to extract structured data from various document formats to enable meaningful candidate evaluation.

### Proposed Solution

Implement a comprehensive document parsing system that:

- Extracts text and structured data from multiple file formats (PDF, DOC, DOCX, CSV, ZIP)
- Uses LLM agent (OpenAI/Anthropic) to standardize and extract structured information
- Identifies six key categories: position applied for, self-evaluation, skills & specialties, work experience, basic information, and education
- Handles errors gracefully for corrupt or unparseable files
- Operates efficiently within serverless function constraints
- Returns standardized structured data for downstream processing

### Key Benefits

- **Real Data Extraction**: Actually read and process CV content
- **Multi-Format Support**: Handle all common CV formats
- **LLM Standardization**: Consistent data extraction using AI
- **Structured Output**: Six standardized categories for analysis
- **Scalable Processing**: Efficient parsing within serverless limits
- **Error Resilience**: Graceful handling of problematic files

### Key Risks

- **Memory Constraints**: Large files may exceed serverless limits (1GB)
- **Processing Time**: Complex documents may cause timeouts (10s limit)
- **LLM API Costs**: Each resume extraction incurs API costs
- **LLM Rate Limits**: API rate limits may throttle processing
- **Format Variations**: Different CV structures and layouts
- **Library Dependencies**: Additional packages increase bundle size

## Technical Analysis

### Current Architecture Assessment

#### Existing Components

- Upload endpoint at `/app/api/upload/route.js`
- File validation (type, size, format)
- Mock response generation
- Error handling structure
- Supported formats: PDF, DOC, DOCX, ZIP, CSV

#### Missing Components

- Document parsing libraries
- Text extraction logic
- Data structuring algorithms
- CV content analyzers
- Batch processing for ZIP files
- Memory management utilities

### Proposed Architecture

#### Data Flow

```
1. Receive file upload →
2. Validate file format →
3. Convert file to buffer →
4. Parse based on file type →
5. Extract raw text →
6. Send text to LLM agent →
7. LLM extracts structured data →
8. Validate and normalize response →
9. Return standardized results
```

#### Component Structure

```
/app
  /api
    /upload
      route.js              # Main upload endpoint
  /lib
    /parsers
      pdfParser.js          # PDF parsing logic
      docxParser.js         # DOCX parsing logic
      docParser.js          # DOC parsing logic
      csvParser.js          # CSV parsing logic
      zipHandler.js         # ZIP extraction and processing
    /extractors
      textExtractor.js      # Raw text extraction
      llmExtractor.js       # LLM-based structured extraction
    /agents
      resumeAgent.js        # LLM agent for resume standardization
      promptTemplates.js    # Structured prompts for extraction
    /utils
      memoryManager.js      # Memory usage monitoring
      errorHandler.js       # Parsing error handling
      dataValidator.js      # Validate LLM responses
      dataStructurer.js     # Data organization
```

### File Format Specifications

#### PDF Files

- **Library**: `pdf-parse` (lightweight, 2MB)
- **Approach**: Extract text layer, fall back to OCR if needed
- **Challenges**: Layout preservation, tables, multi-column
- **Output**: Plain text with basic structure markers

#### DOCX Files

- **Library**: `mammoth` (1MB, reliable)
- **Approach**: Extract XML content, preserve formatting hints
- **Challenges**: Complex formatting, embedded objects
- **Output**: HTML/text with semantic structure

#### DOC Files (Legacy)

- **Library**: `node-word-extractor` or convert to DOCX
- **Approach**: Binary parsing or conversion pipeline
- **Challenges**: Legacy format complexity, limited libraries
- **Output**: Plain text, may lose formatting

#### CSV Files

- **Library**: Native or `csv-parse` (lightweight)
- **Approach**: Parse rows as individual candidates
- **Expected Structure**: Name, Email, Skills, Experience columns
- **Output**: Array of structured candidate objects

#### ZIP Files

- **Library**: `adm-zip` or `node-stream-zip`
- **Approach**: Extract files, process each individually
- **Challenges**: Memory management for large archives
- **Output**: Array of parsed documents

### Data Extraction Strategy

#### Primary Information to Extract

1. **Position Applied For**
   - Position name/title
   - Level classification:
     - Junior (0-2 years)
     - Mid-level (3-5 years)
     - Senior (5-10 years)
     - Leadership (10+ years or management roles)
   - Relevant keywords from job descriptions

2. **Self-Evaluation**
   - Professional summary/objective
   - Career highlights
   - Personal strengths
   - Career goals
   - Key achievements

3. **Skills & Specialties**
   - Technical skills
   - Programming languages
   - Frameworks and tools
   - Domain expertise
   - Soft skills
   - Certifications
   - Industry-specific knowledge

4. **Work Experience**
   - Company name
   - Duration (start date - end date)
   - Total years at company
   - Job title/position
   - Key responsibilities
   - Projects completed
   - Achievements and impact

5. **Basic Information**
   - Full name
   - Email address
   - Phone number
   - Location (city, country)
   - LinkedIn profile
   - GitHub/portfolio links
   - Availability/notice period

6. **Education Background**
   - Degree type (Bachelor's, Master's, PhD)
   - Field of study
   - Institution name
   - Graduation year
   - GPA (if mentioned)
   - Relevant coursework
   - Academic projects

#### LLM-Based Extraction Strategy

1. **Text Preprocessing**
   - Clean extracted text
   - Remove formatting artifacts
   - Normalize whitespace
   - Segment into logical sections

2. **LLM Prompt Engineering**
   - Structured prompt template
   - JSON schema for response
   - Few-shot examples for consistency
   - Error handling instructions

3. **Response Validation**
   - Schema validation
   - Required fields check
   - Data type verification
   - Confidence scoring

4. **Fallback Strategies**
   - Pattern-based extraction for missing fields
   - Default values for optional fields
   - Manual review flags for low confidence

#### Expected Output Schema

```json
{
  "positionAppliedFor": {
    "title": "Software Engineer",
    "level": "senior", // junior | mid-level | senior | leadership
    "yearsRequired": 5,
    "keywords": ["React", "Node.js", "AWS"]
  },
  "selfEvaluation": {
    "summary": "Experienced full-stack developer...",
    "careerHighlights": ["Led team of 5", "Increased performance by 40%"],
    "strengths": ["Problem solving", "Team leadership"],
    "goals": "Seeking technical leadership role"
  },
  "skillsAndSpecialties": {
    "technical": ["JavaScript", "Python", "React", "Node.js"],
    "frameworks": ["Next.js", "Express", "Django"],
    "tools": ["Docker", "Kubernetes", "AWS"],
    "domains": ["E-commerce", "FinTech"],
    "softSkills": ["Leadership", "Communication"],
    "certifications": ["AWS Solutions Architect"]
  },
  "workExperience": [
    {
      "company": "Tech Corp",
      "position": "Senior Developer",
      "startDate": "2020-01",
      "endDate": "2024-01",
      "duration": "4 years",
      "responsibilities": ["Led development team", "Architected microservices"],
      "achievements": ["Reduced costs by 30%", "Improved performance 2x"]
    }
  ],
  "basicInformation": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "linkedIn": "linkedin.com/in/johndoe",
    "github": "github.com/johndoe",
    "availability": "2 weeks notice"
  },
  "educationBackground": {
    "degrees": [
      {
        "type": "Bachelor's",
        "field": "Computer Science",
        "institution": "MIT",
        "graduationYear": 2016,
        "gpa": 3.8
      }
    ],
    "relevantCoursework": ["Data Structures", "Algorithms"],
    "projects": ["Built distributed system for thesis"]
  },
  "metadata": {
    "extractionConfidence": 0.92,
    "processingTime": 4.2,
    "tokensUsed": 1850,
    "extractionDate": "2024-01-15T10:30:00Z"
  }
}
```

### Performance Considerations

#### Memory Management

- **Stream Processing**: Process large files in chunks
- **Buffer Limits**: Cap file size at 10MB (frontend enforced)
- **Garbage Collection**: Explicitly clear large objects
- **Monitoring**: Track memory usage during parsing

#### Processing Optimization

- **Async Operations**: Non-blocking parsing
- **Parallel Processing**: Process multiple small files concurrently
- **Caching**: Cache parsed results temporarily
- **Early Termination**: Fail fast on corrupt files

#### Timeout Prevention

- **Time Budgets**: Allocate max time per file type
- **Progress Tracking**: Monitor parsing progress
- **Partial Results**: Return what's parsed if timeout approaches
- **Chunking**: Break large operations into smaller tasks

## Implementation Plan

### Phase 1: Core Parsing Infrastructure (Priority: High)

**Goal**: Set up basic document parsing capabilities

- Install and configure parsing libraries
- Create parser factory pattern
- Implement basic text extraction
- Add error handling framework
- Test with sample files

### Phase 2: Format-Specific Parsers (Priority: High)

**Goal**: Implement parsers for each file format

- PDF parser implementation
- DOCX parser implementation
- CSV parser implementation
- Basic DOC support
- ZIP file handler

### Phase 3: LLM Integration (Priority: High)

**Goal**: Integrate LLM for structured data extraction

- Set up LLM API (OpenAI/Anthropic)
- Create prompt templates
- Implement resume agent
- Response validation logic
- Error handling for API failures

### Phase 4: Data Standardization (Priority: High)

**Goal**: Standardize extracted data into six categories

- Map LLM response to schema
- Normalize position levels
- Standardize date formats
- Validate required fields
- Calculate experience totals
- Generate confidence scores

### Phase 5: Performance Optimization (Priority: Medium)

**Goal**: Optimize for serverless constraints

- Implement streaming for large files
- Add memory monitoring
- Optimize parsing algorithms
- Add caching layer
- Performance benchmarking

### Phase 6: Error Handling & Recovery (Priority: Low)

**Goal**: Robust error handling

- Graceful degradation for unparseable content
- Detailed error reporting
- Retry logic for transient failures
- Fallback strategies
- User-friendly error messages

## Risk Assessment

### Technical Risks

1. **Memory Overflow**
   - **Risk**: Large or complex files exceed 1GB limit
   - **Impact**: Function crashes, upload fails
   - **Mitigation**:
     - Strict file size limits
     - Stream processing
     - Memory monitoring and early termination

2. **Processing Timeouts**
   - **Risk**: Complex parsing exceeds 10s limit
   - **Impact**: Incomplete parsing, poor UX
   - **Mitigation**:
     - Time budgets per operation
     - Async processing where possible
     - Partial result returns

3. **Parsing Accuracy**
   - **Risk**: Poor text extraction quality
   - **Impact**: Missing or incorrect candidate data
   - **Mitigation**:
     - Multiple extraction strategies
     - Confidence scoring
     - Manual review option

4. **Format Variations**
   - **Risk**: Unusual CV formats break parsers
   - **Impact**: Failed extractions
   - **Mitigation**:
     - Robust error handling
     - Fallback to basic text extraction
     - Continuous parser improvements

### Timeline Risks

1. **Library Integration Complexity**
   - **Risk**: Parsing libraries have unexpected limitations
   - **Impact**: Delayed implementation
   - **Mitigation**: Early prototyping, have backup libraries

2. **Testing Complexity**
   - **Risk**: Need extensive test documents
   - **Impact**: Inadequate testing coverage
   - **Mitigation**: Create comprehensive test suite early

## Task List

### Task #1: Install Dependencies

**Priority**: High  
**Estimated Effort**: S (1 hour)  
**Dependencies**: None  
**GitHub Issue**: [#4](https://github.com/GitItOmar/cv-screener/issues/4)  
**Acceptance Criteria**:

- [ ] Install pdf-parse for PDF processing
- [ ] Install mammoth for DOCX processing
- [ ] Install csv-parse for CSV processing
- [ ] Install adm-zip for ZIP handling
- [ ] Install OpenAI SDK or Anthropic SDK
- [ ] Update package.json with dependencies
- [ ] Set up environment variables for API keys
- [ ] Verify installations work in Next.js environment

### Task #2: Create Parser Factory

**Priority**: High  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: Task #1  
**GitHub Issue**: [#5](https://github.com/GitItOmar/cv-screener/issues/5)  
**Acceptance Criteria**:

- [ ] Create `/lib/parsers/parserFactory.js`
- [ ] Implement file type detection logic
- [ ] Route files to appropriate parsers
- [ ] Handle unsupported formats
- [ ] Add comprehensive logging
- [ ] Unit tests for factory pattern

### Task #3: Implement PDF Parser

**Priority**: High  
**Estimated Effort**: M (3-4 hours)  
**Dependencies**: Task #2  
**GitHub Issue**: [#6](https://github.com/GitItOmar/cv-screener/issues/6)  
**Acceptance Criteria**:

- [ ] Create `/lib/parsers/pdfParser.js`
- [ ] Extract text from PDF files
- [ ] Handle multi-page documents
- [ ] Preserve basic structure (paragraphs, lists)
- [ ] Error handling for corrupt PDFs
- [ ] Test with various PDF samples

### Task #4: Implement DOCX Parser

**Priority**: High  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: Task #2  
**GitHub Issue**: [#7](https://github.com/GitItOmar/cv-screener/issues/7)  
**Acceptance Criteria**:

- [ ] Create `/lib/parsers/docxParser.js`
- [ ] Extract text and structure from DOCX
- [ ] Preserve formatting hints (bold, headers)
- [ ] Handle tables and lists
- [ ] Error handling for corrupt files
- [ ] Test with various DOCX samples

### Task #5: Implement CSV Parser

**Priority**: High  
**Estimated Effort**: S (1-2 hours)  
**Dependencies**: Task #2  
**GitHub Issue**: [#8](https://github.com/GitItOmar/cv-screener/issues/8)  
**Acceptance Criteria**:

- [ ] Create `/lib/parsers/csvParser.js`
- [ ] Parse CSV rows into objects
- [ ] Handle different delimiters
- [ ] Map columns to candidate fields
- [ ] Validate data types
- [ ] Test with various CSV formats

### Task #6: Implement ZIP Handler

**Priority**: Medium  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: Tasks #3-5  
**GitHub Issue**: [#9](https://github.com/GitItOmar/cv-screener/issues/9)  
**Acceptance Criteria**:

- [ ] Create `/lib/parsers/zipHandler.js`
- [ ] Extract files from ZIP archives
- [ ] Process each file individually
- [ ] Handle nested folders
- [ ] Memory-efficient extraction
- [ ] Return array of parsed results

### Task #7: Create Text Extractor

**Priority**: High  
**Estimated Effort**: M (3-4 hours)  
**Dependencies**: Tasks #3-5  
**GitHub Issue**: [#10](https://github.com/GitItOmar/cv-screener/issues/10)  
**Acceptance Criteria**:

- [ ] Create `/lib/extractors/textExtractor.js`
- [ ] Clean and normalize extracted text
- [ ] Remove special characters/formatting
- [ ] Identify document sections
- [ ] Preserve semantic structure
- [ ] Handle different encodings

### Task #8: Create LLM Resume Agent

**Priority**: High  
**Estimated Effort**: L (4-5 hours)  
**Dependencies**: Task #1  
**GitHub Issue**: [#11](https://github.com/GitItOmar/cv-screener/issues/11)  
**Acceptance Criteria**:

- [ ] Create `/lib/agents/resumeAgent.js`
- [ ] Configure LLM client (OpenAI/Anthropic)
- [ ] Implement retry logic for API failures
- [ ] Handle rate limiting
- [ ] Add cost tracking
- [ ] Test with various resume formats

### Task #9: Create Prompt Templates

**Priority**: High  
**Estimated Effort**: M (3-4 hours)  
**Dependencies**: Task #8  
**GitHub Issue**: [#12](https://github.com/GitItOmar/cv-screener/issues/12)  
**Acceptance Criteria**:

- [ ] Create `/lib/agents/promptTemplates.js`
- [ ] Design structured extraction prompt
- [ ] Define JSON response schema
- [ ] Include few-shot examples
- [ ] Handle six extraction categories
- [ ] Test prompt effectiveness
- [ ] Optimize for token usage

### Task #10: Implement LLM Extractor

**Priority**: High  
**Estimated Effort**: L (4-5 hours)  
**Dependencies**: Tasks #8-9  
**GitHub Issue**: [#13](https://github.com/GitItOmar/cv-screener/issues/13)  
**Acceptance Criteria**:

- [ ] Create `/lib/extractors/llmExtractor.js`
- [ ] Send text to LLM with structured prompt
- [ ] Parse LLM JSON response
- [ ] Extract position applied for with level
- [ ] Extract self-evaluation section
- [ ] Extract skills & specialties
- [ ] Extract work experience with duration
- [ ] Extract basic information
- [ ] Extract education background

### Task #11: Create Data Validator

**Priority**: High  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: Task #10  
**GitHub Issue**: [#14](https://github.com/GitItOmar/cv-screener/issues/14)  
**Acceptance Criteria**:

- [ ] Create `/lib/utils/dataValidator.js`
- [ ] Validate LLM response structure
- [ ] Check required fields presence
- [ ] Validate data types and formats
- [ ] Normalize position levels (junior/mid/senior/leadership)
- [ ] Calculate total experience years
- [ ] Generate extraction confidence scores
- [ ] Flag incomplete or suspicious data

### Task #12: Implement Memory Manager

**Priority**: Medium  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: None  
**GitHub Issue**: [#15](https://github.com/GitItOmar/cv-screener/issues/15)  
**Acceptance Criteria**:

- [ ] Create `/lib/utils/memoryManager.js`
- [ ] Monitor memory usage
- [ ] Implement garbage collection helpers
- [ ] Add memory threshold alerts
- [ ] Streaming for large files
- [ ] Buffer management utilities

### Task #13: Update Upload Route

**Priority**: High  
**Estimated Effort**: L (4-5 hours)  
**Dependencies**: Tasks #1-11  
**GitHub Issue**: [#16](https://github.com/GitItOmar/cv-screener/issues/16)  
**Acceptance Criteria**:

- [ ] Integrate parser factory
- [ ] Extract text from uploaded files
- [ ] Send text to LLM agent
- [ ] Return standardized six-category structure
- [ ] Handle LLM API errors
- [ ] Add cost and performance monitoring
- [ ] Update response format to match new schema

### Task #14: Add Error Handling

**Priority**: Medium  
**Estimated Effort**: M (2-3 hours)  
**Dependencies**: Task #13  
**GitHub Issue**: [#17](https://github.com/GitItOmar/cv-screener/issues/17)  
**Acceptance Criteria**:

- [ ] Create `/lib/utils/errorHandler.js`
- [ ] Categorize error types
- [ ] Implement fallback strategies
- [ ] User-friendly error messages
- [ ] Error logging and monitoring
- [ ] Partial success handling

### Task #15: Performance Testing

**Priority**: Low  
**Estimated Effort**: M (3-4 hours)  
**Dependencies**: All tasks  
**GitHub Issue**: [#18](https://github.com/GitItOmar/cv-screener/issues/18)  
**Acceptance Criteria**:

- [ ] Create performance test suite
- [ ] Test with various file sizes
- [ ] Measure memory usage
- [ ] Benchmark parsing times
- [ ] Identify bottlenecks
- [ ] Optimize critical paths

## Success Metrics

1. **Functional Metrics**
   - Successfully parse 95% of standard CV formats
   - Extract all six categories with 90% completeness
   - Correctly classify position level 85% of the time
   - LLM extraction success rate > 95%

2. **Performance Metrics**
   - Total processing time < 8 seconds per resume
   - Text extraction < 2 seconds
   - LLM processing < 5 seconds
   - Memory usage < 512MB for typical files
   - Handle 5 concurrent uploads (due to LLM rate limits)

3. **Quality Metrics**
   - All six categories populated for 90% of resumes
   - Position level classification accuracy > 85%
   - Work experience duration calculation 95% accurate
   - Skills extraction completeness > 90%
   - Education information accuracy > 95%

4. **Cost Metrics**
   - Average cost per resume < $0.10
   - Token usage optimized < 2000 tokens per resume
   - Cache hit rate > 30% for similar resumes

## Notes & Considerations

1. **Library Selection Rationale**
   - `pdf-parse`: Lightweight, reliable, good text extraction
   - `mammoth`: Best DOCX support, preserves structure
   - `csv-parse`: Standard, streaming support
   - `adm-zip`: Pure JS, no native dependencies
   - **LLM Choice**: OpenAI GPT-4 or Anthropic Claude for accuracy

2. **LLM Prompt Strategy**
   - Use structured JSON output format
   - Provide clear category definitions
   - Include examples for consistency
   - Set temperature to 0.3 for deterministic results
   - Implement token limits to control costs

3. **Future Enhancements**
   - Fine-tune custom model for resume extraction
   - OCR support for scanned PDFs
   - Multi-language resume support
   - Real-time streaming of extraction results
   - Batch processing optimization
   - Resume similarity detection

4. **Testing Strategy**
   - Create diverse test resume set
   - Test various position levels and industries
   - Include edge cases (minimal info, non-standard formats)
   - Test LLM response consistency
   - Validate extraction accuracy metrics
   - Monitor API costs during testing

5. **Security & Compliance**
   - Sanitize all extracted text
   - No PII stored permanently
   - LLM API calls use secure connections
   - Rate limiting to prevent abuse
   - GDPR compliance for EU candidates
   - Audit logging for all extractions

---

**Document Version**: 2.0  
**Created**: 2024  
**Updated**: 2024 - Added LLM-based extraction and six-category standardization  
**Status**: ACTIVE  
**Next Review**: After Phase 1 completion
