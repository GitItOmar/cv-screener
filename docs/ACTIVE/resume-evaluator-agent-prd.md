# Resume Evaluator Agent - Product Requirements Document

## Executive Summary

### Problem Statement

The current CV screening application successfully extracts structured information from resumes using the Resume Extractor Agent, but lacks an automated evaluation system to score and rank candidates against job requirements. Recruiters must manually review each extracted candidate profile without objective scoring criteria, leading to inconsistent evaluation and inefficient screening processes.

### Proposed Solution

Build a Resume Evaluator Agent that automatically scores extracted resume data against predefined job requirements using LLM-based evaluation. The MVP will implement intelligent evaluation without RAG (Retrieval-Augmented Generation) or vector database integration, focusing on a single Shopify Junior Developer job description with comprehensive evaluation criteria.

The evaluator will use LLM-based scoring across five evaluation categories with embedded evaluation signals and critical requirement gates:

**Core Categories (10-Point System):**

1. **Self-evaluation** (0-1 points): Summary quality, career goals, plus **Passion** and **Communication** signals
2. **Skills & specialties** (0-2 points): Technical skill matching, plus **Brains** and **Selectivity** signals
3. **Work experience** (0-4 points): Experience relevance, plus **Hardcore**, **Communication**, and **Diversity** signals
4. **Basic information** (0-1 point): Contact completeness, location alignment, and language proficiency evidence
5. **Educational background** (0-2 points): Educational relevance, plus **Selectivity** and **Brains** signals

**Critical Requirements (Applied as Gates):**

- **Mandatory Shopify Experience**: Minimum 1 year required - caps score at 40% if missing
- **Language Proficiency**: C1 level English or German with evidence - caps score at 50% if insufficient
- **Onboarding Readiness**: Ability to adapt within 3 weeks - flagged for manual review

**Evaluation Signals (Integrated Within Categories):**

- **Passion**: Personal projects, open source, blogs, meetups
- **Communication**: Client-facing work, leadership, clear presentation
- **Brains**: Complex problem-solving, technical depth
- **Selectivity**: Selective job history, certifications, competitions
- **Hardcore**: Ambitious projects, startup experience
- **Diversity**: Unique background, international experience

Total scores range from 0-10 points, normalized to a 0-100% scale, with critical requirement gates applied to final percentage.

### LLM-Based Evaluation Approach

Instead of rule-based scoring, the system uses Large Language Model evaluation to:

- **Contextual Understanding**: Interpret nuanced experience and skills that rule-based systems might miss
- **Flexible Matching**: Find relevant but differently-worded competencies and experiences
- **Evidence-Based Scoring**: Provide specific quotes and reasoning for each score
- **Holistic Assessment**: Consider overall profile coherence and candidate potential
- **Mandatory Gate Enforcement**: Strict evaluation of critical requirements (Shopify experience, language proficiency)

### Key Benefits

- **Intelligent Evaluation**: LLM provides nuanced understanding of candidate profiles beyond keyword matching
- **Objective Scoring**: Consistent evaluation criteria applied to all candidates with detailed reasoning
- **Critical Requirements**: Strict enforcement of mandatory Shopify experience and language proficiency
- **Comprehensive Assessment**: Evaluation of soft skills and cultural fit indicators
- **Time Efficiency**: Automated scoring reduces manual review time
- **Data-Driven Decisions**: Quantified candidate assessment enables better hiring decisions
- **Scalability**: Can evaluate hundreds of candidates quickly and consistently

### Risks

- **Limited Job Specificity**: Without RAG, scoring criteria are generic rather than company-specific
- **LLM Costs**: Additional API calls for evaluation processing (estimated $0.002-0.008 per evaluation)
- **Scoring Consistency**: LLM-based evaluation may have some variance between runs (mitigated with temperature=0)
- **Language Detection Accuracy**: May miss subtle language proficiency indicators
- **Signal Detection**: Evaluation signals detection depends on resume quality and completeness

## Technical Analysis

### Current Architecture Assessment

The existing codebase provides a solid foundation for the evaluator agent:

**Strengths:**

- **Complete Extraction Pipeline**: Fully functional resume extraction with FileParser → TextExtractor → LLM → Validator
- **Structured Data**: Already extracts all 6 required categories from the research paper
- **LLM Integration**: OpenAI integration established with cost tracking and error handling
- **Review Interface**: Ready to consume and display scored candidates
- **File Processing**: Robust file parsing for PDF/DOCX formats

**Current Data Flow:**

1. File Upload → FileParser
2. Text Extraction → TextExtractor
3. LLM Processing → ResumeAgent
4. Data Validation → DataValidator
5. Storage → File system/memory
6. Review → Manual candidate review interface

### Proposed Changes

The evaluator will integrate seamlessly into the existing pipeline:

**New Data Flow:**

1. File Upload → FileParser
2. Text Extraction → TextExtractor
3. LLM Processing → ResumeAgent
4. Data Validation → DataValidator
5. **[NEW] Resume Evaluation → EvaluatorAgent**
6. Storage → Enhanced with evaluation scores
7. Review → Candidates with scores and rankings

### Architecture Design

```
src/app/evaluation/
├── domain/
│   ├── evaluator.js         # Main orchestrator - coordinates LLM evaluation process
│   ├── scorer.js            # LLM-based scoring for each category + evaluation signals
│   └── jobMatcher.js        # Job requirement matching and critical gate enforcement
├── api/
│   └── route.js             # REST API endpoint for evaluation requests
└── data/
    └── jobRequirements.js   # Shopify Junior Developer requirements with evaluation signals
```

### LLM Integration Architecture

The scorer will use structured LLM prompts for each evaluation component:

- **Category Scoring**: Individual prompts for each of the 5 core categories
- **Signal Detection**: Dedicated prompt to identify the 6 evaluation signals
- **Critical Gates**: Specialized prompts for Shopify experience and language proficiency
- **Response Parsing**: JSON-structured responses for consistent scoring

### Dependencies

- **Existing**: OpenAI API (already integrated)
- **Existing**: Resume extraction pipeline (fully functional)
- **New**: No additional external dependencies required

### Performance Considerations

- **Evaluation Time**: Target < 3 seconds per resume
- **Batch Processing**: Support for evaluating multiple candidates
- **API Response**: Target < 2 seconds for evaluation endpoint
- **LLM Costs**: Estimated additional $0.001-0.005 per evaluation

## Implementation Plan

### Phase 1: Core Evaluation Engine (Days 1-2)

#### 1.1 Job Requirements Schema

Create a structured job description with:

- Position title and level (junior/mid-level/senior/leadership)
- Required skills (must-have competencies)
- Preferred skills (nice-to-have competencies)
- Minimum years of experience
- Education requirements
- Location preferences

#### 1.2 Scoring Engine

Implement five category scorers based on research paper methodology:

**Self-Evaluation Scorer (0-1 points):**

- Evaluate summary quality and clarity
- Assess career goals alignment with position
- Check for professional self-awareness

**Skills & Specialties Scorer (0-2 points):**

- Match technical skills to job requirements
- Weight by skill importance (required vs. preferred)
- Consider skill depth and breadth
- Scoring: 2 = exceeds requirements, 1 = meets requirements, 0.5 = partially meets

**Work Experience Scorer (0-4 points):**

- Calculate relevant experience years
- Evaluate role progression and responsibility growth
- Assess company quality and project complexity
- Match previous roles to target position
- Scoring: 4 = exceptional fit, 3 = strong fit, 2 = adequate fit, 1 = weak fit

**Basic Information Scorer (0-1 point):**

- Verify contact information completeness
- Check location alignment with job requirements
- Assess availability and flexibility

**Educational Background Scorer (0-2 points):**

- Match degree field to job requirements
- Consider institution quality (if data available)
- Evaluate relevant coursework and projects
- Account for alternative education paths

### Phase 2: Integration (Days 3-4)

#### 2.1 API Development

Create REST endpoint:

- `POST /api/evaluation/evaluate`
- Input: Extracted resume data + job requirements
- Output: Scored evaluation with category breakdowns

#### 2.2 Pipeline Integration

- Connect extraction output to evaluation input
- Handle data transformation between systems
- Implement error handling and fallbacks
- Ensure data consistency throughout pipeline

#### 2.3 Data Storage

- Extend candidate data structure to include evaluation scores
- Maintain evaluation metadata (timestamp, version, criteria used)
- Enable re-evaluation if needed

### Phase 3: Testing and Refinement (Day 5)

#### 3.1 End-to-End Testing

- Test complete pipeline from file upload to scored candidate
- Validate scoring consistency and accuracy
- Test error handling and edge cases

#### 3.2 Performance Optimization

- Optimize LLM prompts for consistent scoring
- Implement caching where appropriate
- Monitor API response times

## Detailed Technical Specifications

### Job Requirements Schema

```javascript
{
  position: {
    title: "Senior Full Stack Developer",
    level: "senior",
    department: "Engineering"
  },
  experience: {
    yearsRequired: 5,
    yearsPreferred: 7,
    relevantRoles: ["Full Stack Developer", "Software Engineer", "Web Developer"]
  },
  skills: {
    required: ["JavaScript", "React", "Node.js", "SQL"],
    preferred: ["TypeScript", "AWS", "Docker", "GraphQL", "Python"],
    categories: {
      frontend: ["React", "Vue.js", "Angular"],
      backend: ["Node.js", "Python", "Java"],
      database: ["PostgreSQL", "MongoDB", "Redis"],
      devops: ["Docker", "AWS", "Kubernetes"]
    }
  },
  education: {
    minimumLevel: "Bachelor's",
    preferredFields: ["Computer Science", "Software Engineering", "Information Technology"],
    alternatives: ["Equivalent experience", "Bootcamp certification"]
  },
  location: {
    preferred: "Remote",
    acceptable: ["San Francisco", "New York", "Austin"]
  }
}
```

### Evaluation Output Schema

```javascript
{
  candidateId: "string",
  jobId: "string",
  overallScore: 85, // 0-100%
  categoryScores: {
    selfEvaluation: { score: 0.8, maxScore: 1, percentage: 80 },
    skillsSpecialties: { score: 1.8, maxScore: 2, percentage: 90 },
    workExperience: { score: 3.2, maxScore: 4, percentage: 80 },
    basicInformation: { score: 1.0, maxScore: 1, percentage: 100 },
    educationBackground: { score: 1.6, maxScore: 2, percentage: 80 }
  },
  matchDetails: {
    skillsMatched: ["JavaScript", "React", "Node.js"],
    skillsMissing: ["TypeScript"],
    experienceGap: "Meets minimum requirements",
    educationMatch: "Strong match",
    locationMatch: "Perfect match"
  },
  recommendations: [
    "Strong technical skills match",
    "Consider for technical interview",
    "Verify TypeScript proficiency during interview"
  ],
  metadata: {
    evaluatedAt: "2024-01-15T10:30:00Z",
    evaluatorVersion: "1.0.0",
    processingTime: 2.3,
    confidence: 0.85
  }
}
```

## Risk Assessment

### Technical Risks

**Risk**: LLM Scoring Inconsistency

- **Impact**: Same resume might receive different scores on re-evaluation
- **Probability**: Medium
- **Mitigation**: Use temperature=0, implement score validation ranges, test with sample data

**Risk**: API Performance Issues

- **Impact**: Slow evaluation could block user workflow
- **Probability**: Low
- **Mitigation**: Set appropriate timeouts, implement async processing for batch operations

**Risk**: Integration Complexity

- **Impact**: Evaluation system conflicts with existing extraction pipeline
- **Probability**: Low
- **Mitigation**: Design with existing architecture patterns, thorough testing

### Timeline Risks

**Risk**: Scope Creep

- **Impact**: Adding features beyond MVP requirements
- **Probability**: Medium
- **Mitigation**: Strict adherence to MVP scope, document future enhancements separately

**Risk**: LLM Prompt Engineering Complexity

- **Impact**: More time needed to achieve consistent scoring
- **Probability**: Medium
- **Mitigation**: Start with simple prompts, iterate based on testing results

### Quality Risks

**Risk**: Scoring Accuracy Without RAG

- **Impact**: Generic scoring may miss job-specific nuances
- **Probability**: High (expected in MVP)
- **Mitigation**: Design system for easy RAG integration later, focus on core scoring accuracy

**Risk**: Bias in Evaluation Criteria

- **Impact**: Unfair candidate scoring based on biased criteria
- **Probability**: Medium
- **Mitigation**: Review scoring criteria for bias, implement diverse test cases

## Success Metrics

### Functional Requirements

- [ ] System scores resumes across all 5 categories
- [ ] Total scores accurately range from 0-100%
- [ ] Evaluation completes within 5 seconds per resume
- [ ] Batch processing handles 50+ resumes efficiently
- [ ] Scoring shows reasonable consistency (±5% variance for same input)

### Technical Requirements

- [ ] API endpoint response time < 2 seconds
- [ ] System error rate < 1%
- [ ] Integration doesn't break existing extraction pipeline
- [ ] Evaluation data persists correctly with candidate profiles

### Integration Requirements

- [ ] Seamless integration with current extraction workflow
- [ ] Evaluation scores available in candidate data
- [ ] System gracefully handles evaluation failures
- [ ] Existing review interface can consume scored data (no changes needed)

## Task Breakdown

### Core Development Tasks

1. **Set up evaluation folder structure** (1 story point)
   - **User Story**: As a developer, I want a clear project structure so that the evaluation code is organized and maintainable
   - **Acceptance Criteria**:
     - Create evaluation folder with domain, api, and data subfolders
     - Follow existing project naming conventions
     - Ensure proper import/export structure

2. **Define job requirements schema** (2 story points)
   - **User Story**: As a recruiter, I want to evaluate candidates against specific job criteria so that I can find the best fit
   - **Acceptance Criteria**:
     - Hardcoded job requirements for Senior Full Stack Developer position
     - Include required/preferred skills, experience level, education requirements
     - Schema supports all evaluation categories

3. **Implement scorer module** (5 story points)
   - **User Story**: As the system, I need to score candidates objectively so that recruiters get consistent evaluations
   - **Acceptance Criteria**:
     - Self-evaluation scoring (0-1 scale) based on summary quality
     - Skills scoring (0-2 scale) with required/preferred skill matching
     - Experience scoring (0-4 scale) considering years and role relevance
     - Basic info scoring (0-1 scale) for contact completeness
     - Education scoring (0-2 scale) for degree relevance
     - All scorers handle missing data gracefully

4. **Create job matching logic** (3 story points)
   - **User Story**: As the system, I need to match candidate profiles to job requirements so that scoring is accurate
   - **Acceptance Criteria**:
     - Match candidate skills to required/preferred job skills
     - Calculate experience alignment with job requirements
     - Evaluate education fit with job criteria
     - Generate match percentage and details

5. **Build main evaluator orchestrator** (3 story points)
   - **User Story**: As the system, I need to coordinate the evaluation process so that candidates receive complete scores
   - **Acceptance Criteria**:
     - Orchestrate all 5 category scorers
     - Calculate weighted total score (0-10 → 0-100%)
     - Generate comprehensive evaluation result object
     - Handle errors gracefully with partial scoring

6. **Create evaluation API endpoint** (2 story points)
   - **User Story**: As a developer, I need an API endpoint so that other parts of the system can request evaluations
   - **Acceptance Criteria**:
     - POST /api/evaluation/evaluate endpoint
     - Accept extracted resume data as input
     - Return scored evaluation with category breakdowns
     - Include proper error handling and validation

7. **Connect extraction to evaluation** (2 story points)
   - **User Story**: As the system, I need to automatically evaluate extracted resumes so that the process is seamless
   - **Acceptance Criteria**:
     - Chain extraction output directly to evaluator input
     - Handle data transformation between systems
     - Maintain data integrity throughout pipeline

8. **Update extraction flow** (2 story points)
   - **User Story**: As a recruiter, I want evaluated candidates so that I can see scores with extracted data
   - **Acceptance Criteria**:
     - Modify extraction API to include evaluation
     - Include evaluation scores in extraction response
     - Ensure backward compatibility with existing clients

9. **Store evaluation results** (1 story point)
   - **User Story**: As the system, I need to persist evaluation results so that they're available for review
   - **Acceptance Criteria**:
     - Add evaluation scores to candidate data structure
     - Store evaluation metadata (timestamp, version)
     - Enable retrieval of evaluation details

**Total Story Points: 21**

## Future Enhancements (Post-MVP)

### Phase 4: RAG Integration

- Implement vector database (ChromaDB) for job descriptions
- Add company-specific requirement retrieval
- Dynamic scoring criteria based on similar successful hires
- Cosine similarity matching as described in research paper

### Phase 5: Advanced Features

- Multiple job description support
- Configurable scoring weights
- Batch evaluation optimization
- Real-time evaluation streaming

### Phase 6: Analytics & Learning

- Evaluation accuracy tracking
- Recruiter feedback integration
- Score calibration based on hiring outcomes
- Bias detection and mitigation

### Phase 7: UI Integration

- Review interface updates to display scores
- Score-based filtering and sorting
- Evaluation detail breakdowns
- Manual score adjustment capabilities

## Conclusion

The Resume Evaluator Agent MVP provides a solid foundation for automated candidate scoring while maintaining simplicity and focus. By implementing the core evaluation engine first, we establish the scoring methodology and integration patterns that will support future enhancements like RAG integration and advanced analytics.

The modular design ensures that each component can be developed, tested, and refined independently while maintaining compatibility with the existing extraction pipeline. This approach minimizes risk while delivering immediate value to recruiters through consistent, objective candidate evaluation.

Success of this MVP will be measured by scoring accuracy, system performance, and seamless integration with the existing workflow. The design specifically accommodates future RAG integration, ensuring this foundational work supports the full research paper implementation in subsequent phases.
