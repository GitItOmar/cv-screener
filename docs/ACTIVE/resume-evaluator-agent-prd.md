# Product Requirements Document: Resume Evaluator Agent

**Version:** 1.0  
**Date:** August 20, 2025  
**Author:** CV Screening Application Team  
**Status:** Active Development

## Executive Summary

### Problem Statement

The current CV screening application can successfully upload and extract structured information from resumes, but lacks the ability to evaluate and score candidates against specific job requirements. Hiring managers need an intelligent system that can automatically assess resume quality and candidate fit based on job descriptions.

### Proposed Solution

Implement an AI-powered Resume Evaluator Agent that uses Retrieval Augmented Generation (RAG) and multi-agent collaboration to score resumes against job descriptions. The system will provide detailed scoring breakdowns and personalized feedback through a collaborative multi-agent architecture.

### Key Benefits

- **Automated Candidate Scoring**: Reduce manual review time by 80%
- **Consistent Evaluation**: Eliminate human bias in initial screening
- **Detailed Feedback**: Provide actionable insights for both candidates and recruiters
- **Scalable Processing**: Handle bulk resume evaluations efficiently
- **Job-Specific Matching**: Dynamic adaptation to different role requirements

### Primary Risks

- **API Cost Management**: OpenAI API usage could become expensive with scale
- **Scoring Accuracy**: Risk of misaligned evaluations compared to human reviewers
- **Technical Complexity**: RAG implementation requires careful tuning
- **Performance**: Vector similarity searches may impact response times

## Technical Analysis

### Current Architecture Assessment

**Existing Components:**

- ✅ **File Upload System**: Handles PDF, DOCX, CSV, ZIP files
- ✅ **Text Extraction Pipeline**: PDF2JSON, Mammoth, CSV parsers
- ✅ **Resume Data Extractor**: LLM-based structured data extraction
- ✅ **Data Validator**: Comprehensive resume data validation
- ✅ **UI Components**: Upload, review interfaces using shadcn/ui

**Technology Stack:**

- Next.js 15 with App Router (React 19)
- OpenAI API integration (GPT models)
- Tailwind CSS with shadcn/ui components
- Node.js runtime

### Proposed Architecture Changes

**New Components to Add:**

1. **Vector Store Service** (ChromaDB)
   - Store job descriptions and requirements as embeddings
   - Enable semantic search for relevant criteria
   - Manage document chunking and metadata

2. **RAG Pipeline**
   - Generate embeddings using OpenAI API
   - Implement cosine similarity search (threshold: 0.3)
   - Dynamic prompt construction with retrieved context

3. **Multi-Agent Evaluation System**
   - **Resume Evaluator Agent**: Main scoring orchestrator
   - **CEO Sub-Agent**: Leadership and strategic fit assessment
   - **CTO Sub-Agent**: Technical skills evaluation
   - **HR Sub-Agent**: Soft skills and cultural fit analysis

4. **Scoring Engine**
   - Five-category scoring system (total: 10 points)
   - Weighted algorithms based on job requirements
   - Score normalization and consistency validation

### Dependencies and Integration Points

**New Dependencies:**

- `chromadb`: Vector database for embeddings storage
- `@chromadb/chromadb`: JavaScript client for ChromaDB
- `redis` (optional): Caching for performance optimization

**API Integrations:**

- Enhanced OpenAI API usage for evaluation
- Vector similarity computations
- Batch processing capabilities

**Performance Considerations:**

- Embedding generation: ~200ms per job description
- Similarity search: ~50ms per query
- LLM evaluation: ~2-3 seconds per resume
- Total target time: <3 seconds per resume

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Milestone:** RAG Foundation Ready

**Task 1: Install Vector Database Dependencies**

- Add ChromaDB to package.json
- Configure environment variables
- Set up development database instance
- **Acceptance Criteria:**
  - ChromaDB client connects successfully
  - Database persists between restarts
  - Environment configuration documented

**Task 2: Create Vector Store Service**

- Implement ChromaDB client wrapper
- Create collections for job data and requirements
- Add embedding generation functions
- **Acceptance Criteria:**
  - Vector store service initializes
  - Collections created with proper schema
  - Embeddings stored and retrieved correctly

**Task 3: Implement Document Chunking Service**

- Create chunking strategies for job descriptions
- Add metadata extraction and tagging
- Implement text preprocessing utilities
- **Acceptance Criteria:**
  - Job descriptions chunked into logical segments
  - Metadata preserved during chunking
  - Chunk size optimization (512-1024 tokens)

### Phase 2: RAG System Implementation (Week 2)

**Milestone:** Retrieval System Functional

**Task 4: Build Embedding Pipeline**

- Integrate OpenAI embeddings API
- Implement batch processing for efficiency
- Add caching mechanism for repeated queries
- **Acceptance Criteria:**
  - Embeddings generated for job descriptions
  - Batch processing reduces API calls by 70%
  - Cache hit rate >60% for common queries

**Task 5: Implement Similarity Search**

- Create cosine similarity computation
- Set relevance threshold (τ = 0.3)
- Build retrieval function with top-k results
- **Acceptance Criteria:**
  - Similarity search returns relevant chunks
  - Threshold filtering works correctly
  - Search response time <50ms

**Task 6: Create Contextual Prompt Builder**

- Format retrieved chunks into structured prompts
- Implement prompt template management
- Add dynamic context injection based on job requirements
- **Acceptance Criteria:**
  - Prompts include relevant job context
  - Template system supports multiple job types
  - Context length optimized for model limits

### Phase 3: Resume Evaluator Agent (Week 3)

**Milestone:** Core Evaluation System Operational

**Task 7: Create Job Description Parser**

- Parse job requirements into structured format
- Extract key skills, qualifications, experience levels
- Normalize job data for consistent matching
- **Acceptance Criteria:**
  - Job descriptions parsed into standard schema
  - Skills extraction accuracy >90%
  - Experience level classification working

**Task 8: Build Scoring Engine**

- Implement 5-category scoring system:
  - Self-evaluation (0-1 points)
  - Skills & specialties (0-2 points)
  - Work experience (0-4 points)
  - Basic information (0-1 point)
  - Educational background (0-2 points)
- **Acceptance Criteria:**
  - All scoring categories implemented
  - Scores normalized to 0-10 scale
  - Consistent scoring across similar profiles

**Task 9: Implement Evaluator Agent Class**

- Create main evaluation orchestrator
- Integrate RAG retrieval system
- Add job-specific requirement matching
- **Acceptance Criteria:**
  - Agent coordinates all evaluation steps
  - RAG integration provides relevant context
  - Job matching accuracy >85%

### Phase 4: Multi-Agent Summarizer (Week 4)

**Milestone:** Collaborative Feedback System Active

**Task 10: Create Sub-Agent Architecture**

- Implement CEO agent (leadership/strategic fit)
- Implement CTO agent (technical expertise)
- Implement HR agent (soft skills/culture fit)
- **Acceptance Criteria:**
  - Each agent provides specialized evaluation
  - Agent responses differentiated by role
  - Sub-agent coordination working

**Task 11: Build Collaborative Reasoning System**

- Create inter-agent communication protocol
- Implement consensus mechanism
- Add debate resolution for conflicting assessments
- **Acceptance Criteria:**
  - Agents communicate effectively
  - Consensus reached for final scores
  - Conflicting views resolved appropriately

**Task 12: Generate Feedback Reports**

- Create structured feedback templates
- Implement personalized recommendations
- Add strengths/weaknesses analysis
- **Acceptance Criteria:**
  - Feedback reports comprehensive and actionable
  - Personalization based on candidate profile
  - Recommendations specific to job requirements

### Phase 5: API Integration (Week 5)

**Milestone:** Evaluation API Ready for Frontend

**Task 13: Create Evaluation API Endpoint**

- Build POST /api/evaluate endpoint
- Handle job description + resume input
- Return structured scores and feedback
- **Acceptance Criteria:**
  - API accepts job description and resume data
  - Returns complete evaluation results
  - Error handling for invalid inputs

**Task 14: Add Batch Processing**

- Implement queue system for bulk evaluations
- Add progress tracking for long-running jobs
- Create result aggregation and reporting
- **Acceptance Criteria:**
  - Batch processing handles 50+ resumes
  - Progress tracking updates in real-time
  - Results exported in multiple formats

### Phase 6: UI Components (Week 6)

**Milestone:** User Interface Complete

**Task 15: Create Job Description Input**

- Build form for job requirements
- Add job template selection
- Implement validation and preview
- **Acceptance Criteria:**
  - Job description input form functional
  - Templates speed up job creation
  - Validation prevents invalid inputs

**Task 16: Build Evaluation Dashboard**

- Display scoring breakdown by category
- Show RAG retrieval results and context
- Present multi-agent feedback in organized tabs
- **Acceptance Criteria:**
  - Dashboard displays all evaluation data
  - Scoring visualization clear and intuitive
  - Multi-agent feedback well-organized

**Task 17: Implement Results Visualization**

- Create score charts and comparisons
- Add candidate ranking and filtering
- Build export functionality for results
- **Acceptance Criteria:**
  - Visualizations help understand candidate fit
  - Ranking system works correctly
  - Export includes all relevant data

### Phase 7: Testing & Optimization (Week 7)

**Milestone:** Production-Ready System

**Task 18: Unit Testing**

- Test scoring algorithms with known inputs
- Validate RAG retrieval accuracy
- Test inter-agent communication
- **Acceptance Criteria:**
  - 90%+ code coverage achieved
  - All scoring edge cases tested
  - RAG retrieval consistency validated

**Task 19: Performance Optimization**

- Optimize embedding generation pipeline
- Implement caching for frequent queries
- Add rate limiting for API protection
- **Acceptance Criteria:**
  - Evaluation time <3 seconds per resume
  - Cache hit rate >60%
  - API rate limits prevent overuse

**Task 20: End-to-End Testing**

- Test complete evaluation flow
- Validate scoring consistency across candidates
- Test system under load conditions
- **Acceptance Criteria:**
  - Full evaluation flow works without errors
  - Scoring variance <10% for similar candidates
  - System handles 10 concurrent evaluations

## Risk Assessment

### Technical Risks

**High Risk: API Cost Management**

- **Risk**: OpenAI API costs could escalate with heavy usage
- **Mitigation**: Implement caching, batch processing, cost monitoring
- **Contingency**: Rate limiting, usage caps, fallback to simpler models

**Medium Risk: Scoring Accuracy**

- **Risk**: AI evaluations may not align with human judgment
- **Mitigation**: Extensive testing against human reviewers, continuous calibration
- **Contingency**: Manual review flags, confidence thresholds

**Medium Risk: Performance at Scale**

- **Risk**: Vector searches may slow down with large job databases
- **Mitigation**: Database optimization, indexing strategies, caching
- **Contingency**: Async processing, result pagination

### Timeline Risks

**Medium Risk: RAG Implementation Complexity**

- **Risk**: RAG system may require more tuning than estimated
- **Mitigation**: Start with simpler retrieval, iterate incrementally
- **Contingency**: Reduce retrieval complexity, focus on core functionality

**Low Risk: Multi-Agent Coordination**

- **Risk**: Agent consensus mechanism may be complex to implement
- **Mitigation**: Start with weighted scoring, add collaboration later
- **Contingency**: Single-agent evaluation with multiple perspectives

## Success Metrics

### Primary KPIs

- **Evaluation Accuracy**: >85% alignment with human reviewers
- **Processing Speed**: <3 seconds per resume evaluation
- **System Reliability**: >99% uptime for evaluation API
- **Cost Efficiency**: <$0.10 per resume evaluation

### Secondary Metrics

- **User Satisfaction**: >4.0/5.0 rating from hiring managers
- **Time Savings**: 80% reduction in manual review time
- **Candidate Feedback Quality**: >4.0/5.0 rating from candidates
- **System Scalability**: Handle 1000+ evaluations per day

## Appendix

### Task List Summary

1. **[P1]** [Install Vector Database Dependencies](https://github.com/GitItOmar/cv-screener/issues/34)
2. **[P1]** [Create Vector Store Service](https://github.com/GitItOmar/cv-screener/issues/35)
3. **[P1]** [Implement Document Chunking Service](https://github.com/GitItOmar/cv-screener/issues/36)
4. **[P2]** [Build Embedding Pipeline](https://github.com/GitItOmar/cv-screener/issues/37)
5. **[P2]** [Implement Similarity Search](https://github.com/GitItOmar/cv-screener/issues/38)
6. **[P2]** [Create Contextual Prompt Builder](https://github.com/GitItOmar/cv-screener/issues/39)
7. **[P3]** [Create Job Description Parser](https://github.com/GitItOmar/cv-screener/issues/40)
8. **[P3]** [Build Scoring Engine](https://github.com/GitItOmar/cv-screener/issues/41)
9. **[P3]** [Implement Evaluator Agent Class](https://github.com/GitItOmar/cv-screener/issues/42)
10. **[P4]** [Create Sub-Agent Architecture](https://github.com/GitItOmar/cv-screener/issues/43)
11. **[P4]** [Build Collaborative Reasoning System](https://github.com/GitItOmar/cv-screener/issues/44)
12. **[P4]** [Generate Feedback Reports](https://github.com/GitItOmar/cv-screener/issues/45)
13. **[P5]** [Create Evaluation API Endpoint](https://github.com/GitItOmar/cv-screener/issues/46)
14. **[P5]** [Add Batch Processing](https://github.com/GitItOmar/cv-screener/issues/47)
15. **[P6]** [Create Job Description Input](https://github.com/GitItOmar/cv-screener/issues/48)
16. **[P6]** [Build Evaluation Dashboard](https://github.com/GitItOmar/cv-screener/issues/49)
17. **[P6]** [Implement Results Visualization](https://github.com/GitItOmar/cv-screener/issues/50)
18. **[P7]** [Unit Testing](https://github.com/GitItOmar/cv-screener/issues/51)
19. **[P7]** [Performance Optimization](https://github.com/GitItOmar/cv-screener/issues/52)
20. **[P7]** [End-to-End Testing](https://github.com/GitItOmar/cv-screener/issues/53)

### API Schema Examples

**Evaluation Request:**

```json
{
  "jobDescription": {
    "title": "Senior Full Stack Developer",
    "requirements": ["5+ years experience", "React", "Node.js"],
    "preferredSkills": ["TypeScript", "AWS"],
    "experienceLevel": "senior"
  },
  "resumeData": {
    // Structured resume data from extraction
  }
}
```

**Evaluation Response:**

```json
{
  "overallScore": 7.5,
  "categoryScores": {
    "selfEvaluation": 0.8,
    "skillsAndSpecialties": 1.6,
    "workExperience": 3.2,
    "basicInformation": 1.0,
    "educationBackground": 0.9
  },
  "agentFeedback": {
    "ceo": "Strong leadership potential...",
    "cto": "Excellent technical skills...",
    "hr": "Good cultural fit..."
  },
  "recommendations": ["Strengthen AWS experience", "Highlight leadership roles"]
}
```
