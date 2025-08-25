# Product Requirements Document: Resume Summarizer Agent

## Executive Summary

### Problem Statement

The current CV screening system provides numerical scores and basic category breakdowns but lacks comprehensive, human-readable feedback that explains evaluation decisions and provides actionable insights. Recruiters and candidates need detailed, context-aware feedback that goes beyond scores to understand strengths, weaknesses, and improvement areas.

### Proposed Solution

Implement a multi-agent Resume Summarizer system that functions as a hiring coordinator, generating personalized feedback through collaborative reasoning between three specialized sub-agents (CEO, CTO, HR). This system will analyze both the raw resume text and evaluation scores to produce balanced, actionable recommendations.

### Key Benefits

- **Enhanced Explainability**: Provides clear reasoning behind scoring decisions
- **Holistic Assessment**: Multiple perspectives ensure comprehensive evaluation
- **Actionable Feedback**: Specific recommendations for candidates and recruiters
- **Improved Decision Making**: Richer context for hiring decisions
- **Scalable Architecture**: Modular design allows future agent additions

### Key Risks

- **Processing Time**: Multi-agent approach may increase latency (Mitigation: Parallel processing)
- **Token Costs**: Additional LLM calls increase API costs (Mitigation: Cost tracking, caching)
- **Consistency**: Different agents may produce conflicting assessments (Mitigation: Consensus mechanism)
- **Complexity**: Multi-agent coordination adds system complexity (Mitigation: Clear interfaces, robust error handling)

## Technical Analysis

### Current Architecture Assessment

#### Data Flow

```
Current: File → Extractor (structured data) → Evaluator (scores) → Results
Proposed: File → Extractor (structured + raw) → Evaluator (scores) → Summarizer (feedback) → Results
```

#### Architectural Recommendation

**Recommended Approach: Hybrid Data Flow**

After analyzing your codebase, I recommend passing **both structured data AND raw text** through the pipeline:

1. **Extractor Output Enhancement**:
   - Continue extracting structured data (current behavior)
   - Include cleaned raw text in the output (already implemented)
   - This provides maximum context to downstream agents

2. **Evaluator Enhancement**:
   - Continue scoring structured data (current behavior)
   - Pass through the raw text unchanged to summarizer
   - This maintains evaluation consistency while preserving context

3. **Summarizer Input**:
   - Receives structured data from extractor
   - Receives evaluation scores from evaluator
   - Receives raw text for additional context
   - This enables rich, context-aware feedback generation

**Rationale**:

- **Structured data** provides consistent, queryable information
- **Raw text** preserves nuances and context that may be lost in extraction
- **Scores** provide quantitative baseline for feedback generation
- Each agent can leverage the data format most suitable for its task

### Proposed Architecture Changes

#### New Components

```
/src/app/summarization/
├── api/
│   └── route.js              # API endpoint for summarization
├── domain/
│   ├── summarizer.js         # Main orchestrator
│   ├── agents/
│   │   ├── ceoAgent.js       # Leadership assessment
│   │   ├── ctoAgent.js       # Technical evaluation
│   │   └── hrAgent.js        # Soft skills & culture fit
│   ├── coordinator.js        # Multi-agent coordinator
│   ├── consensus.js          # Consensus mechanism
│   └── prompts.js            # Agent-specific prompts
```

#### Integration Points

1. **Extraction API**: Modify to always include raw text
2. **Evaluation API**: Pass through raw text to summarizer
3. **New Summarization API**: Callable independently or chained
4. **Review Interface**: Display enriched feedback

### Dependency Mapping

#### Internal Dependencies

- LLMClient library (existing)
- Evaluation scores and categories
- Extracted structured data
- Job requirements configuration

#### External Dependencies

- OpenAI API (gpt-4o model)
- No new npm packages required

### Performance Considerations

#### Latency Optimization

- Parallel agent execution (CEO, CTO, HR simultaneously)
- Response streaming for real-time feedback
- Caching for repeated evaluations
- Timeout management (30s max per agent)

#### Token Optimization

- Structured prompts to minimize token usage
- Shared context between agents
- Summary length limits (500-1000 tokens)
- Cost tracking per agent

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 days)

**Goal**: Establish foundation for multi-agent system

**Deliverables**:

- Base summarizer orchestrator
- Agent interface definition
- LLM integration for agents
- Error handling framework

### Phase 2: Agent Implementation (3-4 days)

**Goal**: Implement three specialized agents

**Deliverables**:

- CEO Agent (leadership assessment)
- CTO Agent (technical evaluation)
- HR Agent (soft skills & culture)
- Agent-specific prompts

### Phase 3: Coordination & Consensus (2-3 days)

**Goal**: Enable multi-agent collaboration

**Deliverables**:

- Multi-agent coordinator
- Consensus mechanism
- Conflict resolution logic
- Structured feedback generator

### Phase 4: Integration & API (2 days)

**Goal**: Integrate with existing pipeline

**Deliverables**:

- Summarization API endpoint
- Pipeline integration
- Data flow optimization
- Response formatting

### Phase 5: Testing & Optimization (2 days)

**Goal**: Ensure reliability and performance

**Deliverables**:

- Unit tests for agents
- Integration tests
- Performance optimization
- Error recovery mechanisms

### Resource Requirements

- Development: 1 developer × 12-15 days
- API Costs: ~$50-100 for testing
- Review: Product owner validation

## Risk Assessment

### Technical Risks

#### High Risk

- **LLM Response Variability**: Different runs may produce inconsistent feedback
  - _Mitigation_: Temperature control, structured outputs, validation

#### Medium Risk

- **Agent Coordination Failures**: Agents may timeout or produce conflicting views
  - _Mitigation_: Timeout handling, fallback mechanisms, weighted consensus

- **Cost Overruns**: Multiple LLM calls per resume expensive at scale
  - _Mitigation_: Cost tracking, batch processing, response caching

#### Low Risk

- **Integration Complexity**: May complicate existing pipeline
  - _Mitigation_: Clean interfaces, optional activation, backwards compatibility

### Timeline Risks

- **API Rate Limits**: May slow development/testing
  - _Mitigation_: Multiple API keys, request throttling

- **Scope Creep**: Additional agent capabilities requested
  - _Mitigation_: Phased approach, clear MVP definition

## Task List

### **Priority**: High | **Story Points**: 13

**User Story**: As a recruiter, I want AI-generated feedback that explains resume evaluations through multiple expert perspectives, so I can make informed hiring decisions with clear justification.

**Acceptance Criteria**:

- [ ] Summarizer processes both structured data and raw text
- [ ] Three agents (CEO, CTO, HR) provide distinct perspectives
- [ ] Consensus mechanism resolves conflicting assessments
- [ ] Feedback includes strengths, weaknesses, and recommendations
- [ ] Response time under 10 seconds for single resume
- [ ] Cost tracking per summarization request
- [ ] Error handling for agent failures
- [ ] Structured JSON output format

### Detailed Task Breakdown

#### 1. Create Summarizer Infrastructure

**Priority**: High | **Story Points**: 3  
**User Story**: As a developer, I want a robust summarizer foundation so I can build multi-agent capabilities on top.

**Acceptance Criteria**:

- [ ] Create `/src/app/summarization/` directory structure
- [ ] Implement base `Summarizer` class with LLM integration
- [ ] Define `AgentInterface` for standardized agent behavior
- [ ] Implement error handling and retry logic
- [ ] Add logging and monitoring capabilities

#### 2. Implement CEO Agent

**Priority**: High | **Story Points**: 2  
**User Story**: As a hiring manager, I want leadership potential assessment so I can identify candidates with growth potential.

**Acceptance Criteria**:

- [ ] Evaluate leadership indicators from resume
- [ ] Assess strategic thinking and vision
- [ ] Identify entrepreneurial/initiative signals
- [ ] Return structured leadership assessment
- [ ] Include specific examples from resume

#### 3. Implement CTO Agent

**Priority**: High | **Story Points**: 2  
**User Story**: As a technical lead, I want deep technical evaluation so I can assess candidates' technical capabilities.

**Acceptance Criteria**:

- [ ] Analyze technical depth and breadth
- [ ] Evaluate technology stack alignment
- [ ] Assess problem-solving indicators
- [ ] Identify technical growth trajectory
- [ ] Highlight specific technical achievements

#### 4. Implement HR Agent

**Priority**: High | **Story Points**: 2  
**User Story**: As an HR manager, I want soft skills and culture fit assessment so I can ensure team compatibility.

**Acceptance Criteria**:

- [ ] Evaluate communication skills evidence
- [ ] Assess teamwork and collaboration
- [ ] Analyze cultural fit indicators
- [ ] Review career stability and progression
- [ ] Identify red flags or concerns

#### 5. Build Multi-Agent Coordinator

**Priority**: High | **Story Points**: 2  
**User Story**: As a system, I want coordinated agent execution so I can efficiently generate comprehensive feedback.

**Acceptance Criteria**:

- [ ] Parallel execution of all three agents
- [ ] Shared context management
- [ ] Timeout handling (10s per agent max)
- [ ] Partial result handling if agent fails
- [ ] Performance monitoring

#### 6. Implement Consensus Mechanism

**Priority**: Medium | **Story Points**: 2  
**User Story**: As a recruiter, I want balanced feedback that reconciles different perspectives so I get a unified assessment.

**Acceptance Criteria**:

- [ ] Weight agent opinions based on relevance
- [ ] Identify and reconcile conflicts
- [ ] Generate unified recommendation
- [ ] Preserve dissenting opinions when significant
- [ ] Explain consensus reasoning

#### 7. Create Summarization API

**Priority**: High | **Story Points**: 1  
**User Story**: As a developer, I want a REST API for summarization so I can integrate it into the application pipeline.

**Acceptance Criteria**:

- [ ] POST endpoint at `/summarization/api`
- [ ] Accept evaluation scores and resume data
- [ ] Return structured feedback JSON
- [ ] Handle errors gracefully
- [ ] Support both standalone and pipeline modes

#### 8. Enhance Data Pipeline

**Priority**: High | **Story Points**: 1  
**User Story**: As a system, I want seamless data flow so summarization integrates smoothly with existing processes.

**Acceptance Criteria**:

- [ ] Extractor passes raw text through pipeline
- [ ] Evaluator includes raw text in output
- [ ] Summarizer receives all required data
- [ ] Backward compatibility maintained
- [ ] Optional summarization toggle

#### 9. Add Cost Tracking

**Priority**: Medium | **Story Points**: 1  
**User Story**: As a product owner, I want to track AI costs so I can monitor and optimize expenses.

**Acceptance Criteria**:

- [ ] Track tokens per agent
- [ ] Calculate cost per summarization
- [ ] Log cumulative costs
- [ ] Provide cost reports
- [ ] Set cost alerts/limits

#### 10. Implement Testing Suite

**Priority**: High | **Story Points**: 2  
**User Story**: As a developer, I want comprehensive tests so I can ensure system reliability.

**Acceptance Criteria**:

- [ ] Unit tests for each agent
- [ ] Integration tests for coordinator
- [ ] End-to-end pipeline tests
- [ ] Mock LLM responses for testing
- [ ] Performance benchmarks

#### 11. Create Feedback UI Components

**Priority**: Medium | **Story Points**: 2  
**User Story**: As a recruiter, I want to view AI feedback in the review interface so I can make informed decisions.

**Acceptance Criteria**:

- [ ] Display agent perspectives separately
- [ ] Show consensus recommendation
- [ ] Highlight key strengths/concerns
- [ ] Responsive design for mobile
- [ ] Export feedback as PDF/text

#### 12. Add Caching Layer

**Priority**: Low | **Story Points**: 1  
**User Story**: As a system, I want to cache summarizations so I can reduce costs and improve performance.

**Acceptance Criteria**:

- [ ] Cache by resume hash
- [ ] TTL configuration (24 hours default)
- [ ] Cache invalidation on score changes
- [ ] Memory-efficient storage
- [ ] Cache hit/miss metrics

## Appendix: Technical Specifications

### Agent Prompt Templates

#### CEO Agent Focus

- Vision and strategic thinking
- Leadership potential indicators
- Business acumen
- Growth mindset
- Impact and results orientation

#### CTO Agent Focus

- Technical depth and expertise
- Architecture and design skills
- Innovation and problem-solving
- Technology leadership
- Scalability mindset

#### HR Agent Focus

- Communication effectiveness
- Team collaboration
- Cultural alignment
- Professional development
- Work-life integration

### Output Format

```json
{
  "summary": {
    "overall_recommendation": "strong_hire|hire|maybe|reject",
    "confidence_level": 0.85,
    "key_strengths": ["..."],
    "key_concerns": ["..."],
    "consensus_reasoning": "..."
  },
  "agent_perspectives": {
    "ceo": {
      "assessment": "...",
      "score": 0.8,
      "highlights": ["..."],
      "concerns": ["..."]
    },
    "cto": {
      "assessment": "...",
      "score": 0.75,
      "highlights": ["..."],
      "concerns": ["..."]
    },
    "hr": {
      "assessment": "...",
      "score": 0.7,
      "highlights": ["..."],
      "concerns": ["..."]
    }
  },
  "recommendations": {
    "for_recruiter": ["..."],
    "for_candidate": ["..."],
    "interview_focus": ["..."]
  },
  "metadata": {
    "processing_time_ms": 8500,
    "tokens_used": 3500,
    "cost_usd": 0.07,
    "model_version": "gpt-4o",
    "timestamp": "2025-01-23T..."
  }
}
```

### Error Handling Strategy

1. **Agent Timeout**: Return partial results with note
2. **LLM Failure**: Retry with exponential backoff
3. **Invalid Input**: Return validation error
4. **Cost Limit**: Queue for batch processing
5. **Consensus Failure**: Return individual assessments

---

_Document Version: 1.0_  
_Last Updated: 2025-01-23_  
_Author: AI-Assisted PRD Generation_
