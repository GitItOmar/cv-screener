# Product Requirements Document: AI-Powered CV Screening Implementation

## Executive Summary

### Problem Statement
The current CV screening application uses a mock scoring system that provides no real value to recruiters. Manual review of hundreds of CVs is time-consuming and prone to human bias. Recruiters need an intelligent system that can accurately pre-screen candidates based on job requirements.

### Proposed Solution
Implement a comprehensive AI-powered screening system using OpenAI's GPT-4 API to analyze CVs against customizable job requirements, providing detailed scoring, ranking, and insights for each candidate.

### Key Benefits
- **80% reduction** in initial screening time
- **Consistent evaluation** across all candidates
- **Customizable criteria** for different roles
- **Detailed insights** beyond simple keyword matching
- **Bias reduction** through standardized evaluation

### Key Risks
- API costs at scale (mitigation: implement caching and rate limiting)
- Data privacy concerns (mitigation: GDPR-compliant data handling)
- AI hallucination/errors (mitigation: human review layer, confidence scores)

## Technical Analysis

### Current Architecture Assessment
```
Current State:
- Mock scoring in /app/review/page.jsx (random scores 1-100)
- No job requirement input mechanism
- No real CV text extraction
- Basic file upload to Vercel Blob storage
- No persistence layer for screening results
```

### Proposed Architecture Changes
```
Proposed State:
├── API Integration Layer
│   ├── OpenAI GPT-4 API client
│   ├── Rate limiting middleware
│   └── Response caching (Redis)
├── CV Processing Pipeline
│   ├── Text extraction service (pdf-parse, mammoth)
│   ├── Structured data parser
│   └── Batch processing queue
├── Screening Engine
│   ├── Job requirement parser
│   ├── Scoring algorithm
│   └── Ranking service
└── Data Layer
    ├── PostgreSQL for results
    └── Redis for caching
```

### Dependency Mapping
- **External APIs**: OpenAI GPT-4 API
- **New NPM packages**: 
  - `openai` (v4.x)
  - `pdf-parse` (CV text extraction)
  - `mammoth` (DOCX extraction)
  - `bull` (job queue)
  - `ioredis` (caching)
  - `@prisma/client` (ORM)
- **Infrastructure**: 
  - PostgreSQL database
  - Redis instance
  - Background job processor

### Performance Considerations
- Batch processing for multiple CVs (10 CVs per API call)
- Implement caching for repeated job requirements
- Async processing with progress indicators
- Target: Process 100 CVs in under 5 minutes

## Implementation Plan

### Phase 1: Foundation (Week 1)
- Set up database schema and Prisma ORM
- Implement CV text extraction pipeline
- Create job requirement input interface
- Set up Redis caching layer

### Phase 2: AI Integration (Week 2)
- Integrate OpenAI API client
- Develop prompt engineering templates
- Implement scoring algorithm
- Create confidence scoring system

### Phase 3: Processing Pipeline (Week 3)
- Build batch processing queue
- Implement progress tracking
- Add error handling and retry logic
- Create results persistence layer

### Phase 4: UI Enhancement (Week 4)
- Update review interface with AI insights
- Add job requirement management
- Implement filtering and sorting
- Create analytics dashboard

### Milestones
- **M1**: Text extraction working for all file types
- **M2**: First successful AI screening of single CV
- **M3**: Batch processing of 50+ CVs
- **M4**: Full UI integration complete

## Risk Assessment

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API rate limiting | High | Medium | Implement queue system, batch processing |
| Text extraction failures | High | Low | Fallback to manual review flag |
| AI response inconsistency | Medium | Medium | Implement validation, confidence scores |
| Database performance | Medium | Low | Index optimization, caching strategy |

### Timeline Risks
- OpenAI API approval delays → Pre-register, have backup provider
- Complex prompt engineering → Start with simple templates, iterate
- Integration complexity → Modular design, feature flags

### Cost Risks
- API costs exceeding budget → Implement spending limits, optimize prompts
- Infrastructure costs → Start with minimal resources, scale as needed

## Task List

### Task #1: Set Up Database Schema
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: None  
**Acceptance Criteria**:
- [ ] PostgreSQL database provisioned
- [ ] Prisma schema defined for jobs, candidates, screening_results
- [ ] Migration scripts created and tested
- [ ] Seed data for development environment
- [ ] Database connection pooling configured

### Task #2: Implement CV Text Extraction Service
**Priority**: High  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #1  
**Acceptance Criteria**:
- [ ] PDF text extraction working with pdf-parse
- [ ] DOCX extraction working with mammoth
- [ ] Structured data parser for common CV formats
- [ ] Error handling for corrupted files
- [ ] Unit tests with 90% coverage

### Task #3: Create Job Requirements Management UI
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #1  
**Acceptance Criteria**:
- [ ] Form for creating job requirements
- [ ] Fields for title, skills, experience, education
- [ ] Save/edit/delete functionality
- [ ] Template system for common roles
- [ ] Form validation and error handling

### Task #4: Integrate OpenAI API Client
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #2  
**Acceptance Criteria**:
- [ ] OpenAI client configured with API key
- [ ] Rate limiting middleware implemented
- [ ] Error handling for API failures
- [ ] Response validation
- [ ] Cost tracking per request

### Task #5: Develop Screening Prompt Templates
**Priority**: High  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #4  
**Acceptance Criteria**:
- [ ] Base prompt template for CV analysis
- [ ] Dynamic injection of job requirements
- [ ] Structured output format (JSON)
- [ ] Multiple prompt variations for testing
- [ ] Prompt versioning system

### Task #6: Build Scoring Algorithm
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #5  
**Acceptance Criteria**:
- [ ] Multi-factor scoring (skills, experience, education)
- [ ] Weighted scoring based on job priorities
- [ ] Confidence score calculation
- [ ] Percentile ranking system
- [ ] Score explanation generation

### Task #7: Implement Redis Caching Layer
**Priority**: Medium  
**Estimated Effort**: S (2-4 hours)  
**Dependencies**: Task #6  
**Acceptance Criteria**:
- [ ] Redis client configured
- [ ] Cache strategy for API responses
- [ ] TTL configuration per cache type
- [ ] Cache invalidation logic
- [ ] Performance metrics tracking

### Task #8: Create Batch Processing Queue
**Priority**: High  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #6, Task #7  
**Acceptance Criteria**:
- [ ] Bull queue setup for job processing
- [ ] Batch grouping logic (10 CVs per batch)
- [ ] Progress tracking per job
- [ ] Retry logic for failures
- [ ] Dead letter queue for failed jobs

### Task #9: Update Review Interface with AI Insights
**Priority**: High  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #8  
**Acceptance Criteria**:
- [ ] Display AI-generated scores and rankings
- [ ] Show detailed insights per candidate
- [ ] Highlight matching/missing skills
- [ ] Add confidence indicators
- [ ] Filter/sort by AI scores

### Task #10: Implement Progress Tracking UI
**Priority**: Medium  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #8  
**Acceptance Criteria**:
- [ ] Real-time progress bar for batch processing
- [ ] WebSocket connection for live updates
- [ ] Processing status per CV
- [ ] Error notification system
- [ ] Estimated time remaining

### Task #11: Add Analytics Dashboard
**Priority**: Low  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #9  
**Acceptance Criteria**:
- [ ] Screening statistics overview
- [ ] Score distribution charts
- [ ] Processing time metrics
- [ ] API usage and costs
- [ ] Export functionality for reports

### Task #12: Implement GDPR Compliance Features
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #9  
**Acceptance Criteria**:
- [ ] Data retention policies
- [ ] Candidate data anonymization
- [ ] Audit logging for data access
- [ ] Data export functionality
- [ ] Delete functionality with cascading

### Task #13: Create API Documentation
**Priority**: Medium  
**Estimated Effort**: S (2-4 hours)  
**Dependencies**: All API tasks  
**Acceptance Criteria**:
- [ ] OpenAPI/Swagger specification
- [ ] Endpoint documentation
- [ ] Request/response examples
- [ ] Error code documentation
- [ ] Integration guide

### Task #14: Performance Testing and Optimization
**Priority**: Medium  
**Estimated Effort**: L (6-8 hours)  
**Dependencies**: Task #11  
**Acceptance Criteria**:
- [ ] Load testing with 500+ CVs
- [ ] Database query optimization
- [ ] API response time < 2s
- [ ] Memory usage profiling
- [ ] Optimization recommendations implemented

### Task #15: Security Audit and Hardening
**Priority**: High  
**Estimated Effort**: M (4-6 hours)  
**Dependencies**: Task #14  
**Acceptance Criteria**:
- [ ] API key encryption
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] Rate limiting per user
- [ ] Security headers configured

## Success Metrics
- **Processing Speed**: < 3 seconds per CV
- **Accuracy**: 85% agreement with human reviewers
- **User Satisfaction**: > 4.5/5 rating
- **Cost Efficiency**: < $0.10 per CV screened
- **System Uptime**: 99.9% availability

## Documentation Requirements
- API integration guide
- Prompt engineering best practices
- Troubleshooting guide
- User manual for job requirement setup
- System architecture diagram

## Future Enhancements
- Multi-language CV support
- Video interview screening
- LinkedIn profile integration
- Custom AI model fine-tuning
- Automated interview scheduling