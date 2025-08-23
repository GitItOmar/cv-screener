# Unified LLM Client Package - Product Requirements Document

## Executive Summary

### Problem Statement

The current AI screening application has fragmented LLM integration across multiple modules, creating maintenance overhead and limiting scalability. Key issues include:

- **Tight Coupling**: `resumeAgent.js` is hardcoded to OpenAI with extraction-specific logic
- **Workaround Implementations**: Evaluation module hacks around existing APIs (`scorer.js` overrides methods)
- **No Provider Diversity**: Only supports OpenAI, limiting cost optimization and resilience
- **Duplicated Logic**: Cost tracking, rate limiting, and error handling repeated across modules
- **Inflexible Prompt Management**: Prompts are embedded in business logic, hard to maintain
- **Scaling Challenges**: Adding new agents requires recreating LLM infrastructure each time

### Proposed Solution

Create a unified `@screening/llm-client` package that provides:

- **Provider-Agnostic Interface**: Support for OpenAI (GPT-4o) and DeepSeek (v3) with identical APIs
- **Flexible Architecture**: Clean separation between LLM operations and business logic
- **Advanced Prompt System**: Template-based prompts with variable substitution and validation
- **Unified Utilities**: Centralized cost tracking, rate limiting, retry logic, and error handling
- **Extensible Design**: Easy to add new providers, models, and capabilities

### Key Benefits

- **Cost Optimization**: Switch between providers based on cost/performance requirements
- **Improved Maintainability**: Single source of truth for all LLM operations
- **Enhanced Reliability**: Built-in retry logic, rate limiting, and error handling
- **Developer Productivity**: Clean APIs reduce boilerplate code for new agents
- **Operational Visibility**: Unified monitoring and cost tracking across all AI operations
- **Future-Proof**: Easy integration of new providers and models

### Risks

- **Migration Complexity**: Existing modules require significant refactoring
- **Provider API Differences**: DeepSeek and OpenAI may have different capabilities/limitations
- **Performance Impact**: Additional abstraction layer may introduce latency
- **Dependency Management**: Multiple provider SDKs increase bundle size

## Technical Analysis

### Current Architecture Assessment

**Existing LLM Integration Points:**

1. **Resume Extraction** (`src/lib/agents/resumeAgent.js`):
   - Direct OpenAI integration with cost tracking
   - Hardcoded prompts for resume parsing
   - Custom retry and rate limiting logic

2. **Resume Evaluation** (`src/app/evaluation/domain/scorer.js`):
   - Hacks around resumeAgent by overriding methods
   - Custom prompt building for scoring
   - No proper cost tracking for evaluation calls

3. **Prompt Management** (`src/lib/agents/promptTemplates.js`):
   - Static template class with hardcoded prompts
   - No variable substitution or dynamic generation
   - Tightly coupled to extraction use case

### Current Limitations

- **No Provider Switching**: Cannot easily test different models or optimize costs
- **Code Duplication**: Error handling, retry logic repeated in multiple places
- **Tight Coupling**: Business logic mixed with LLM client logic
- **Poor Testability**: Hard to mock or test LLM interactions
- **Scaling Issues**: Each new agent needs to reimplement LLM infrastructure

### Proposed Architecture

```
lib/llm-client/
├── src/
│   ├── index.js                 # Main exports and factory functions
│   ├── LLMClient.js             # Core client orchestrator
│   ├── providers/
│   │   ├── BaseProvider.js      # Abstract provider interface
│   │   ├── OpenAIProvider.js    # GPT-4o, GPT-3.5-turbo implementation
│   │   └── DeepSeekProvider.js  # DeepSeek v3 implementation
│   ├── prompts/
│   │   ├── PromptBuilder.js     # Template-based prompt construction
│   │   ├── ResponseParser.js    # Structured response parsing
│   │   └── ValidationSchema.js  # Response validation schemas
│   ├── utils/
│   │   ├── CostCalculator.js    # Multi-provider cost tracking
│   │   ├── RateLimiter.js       # Token bucket rate limiting
│   │   ├── RetryHandler.js      # Exponential backoff retry logic
│   │   └── ConfigValidator.js   # Configuration validation
│   └── types/
│       └── index.js             # TypeScript-style type definitions
├── package.json
├── README.md
└── CHANGELOG.md
```

### API Design Philosophy

**Provider-Agnostic Interface:**

```javascript
const client = new LLMClient({
  provider: 'openai', // or 'deepseek'
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Flexible Prompt System:**

```javascript
const prompt = new PromptBuilder()
  .setRole('resume_evaluator')
  .addTemplate('evaluate_skills', {
    skills: candidate.skills,
    requirements: jobReqs.skills,
  })
  .withResponseFormat('json_object')
  .build();
```

**Unified Response Handling:**

```javascript
const result = await client.complete(prompt, {
  temperature: 0,
  maxTokens: 1000,
  retries: 3,
});
```

### Integration Points

**Extraction Module Integration:**

- Replace `resumeAgent.js` direct OpenAI calls
- Migrate `promptTemplates.js` to new PromptBuilder system
- Maintain existing extraction API compatibility

**Evaluation Module Integration:**

- Remove scorer.js method overriding hacks
- Use proper prompt templates for scoring
- Implement clean separation of concerns

**Future Agent Integration:**

- Standardized interface for all new agents
- Shared utilities for common LLM operations
- Consistent error handling and monitoring

## Implementation Plan

### Phase 1: Foundation (Days 1-3)

**Objective:** Core infrastructure and interfaces

1. **Package Structure Setup**
   - Initialize npm package with proper exports
   - Set up development tooling (linting, testing)
   - Create basic documentation framework

2. **Base Provider Interface**
   - Define abstract BaseProvider class
   - Specify required methods and response formats
   - Create provider factory pattern

3. **Core LLM Client**
   - Implement main client orchestrator
   - Add provider initialization and management
   - Create basic API methods (chat, complete)

### Phase 2: Provider Implementation (Days 4-6)

**Objective:** Multi-provider support with feature parity

1. **OpenAI Provider**
   - Full GPT-4o and GPT-3.5-turbo support
   - Response format handling (JSON, text)
   - OpenAI-specific parameter mapping

2. **DeepSeek Provider**
   - DeepSeek v3 API integration
   - Cost calculation and tracking
   - Error handling and response parsing

3. **Provider Testing**
   - Unit tests for each provider
   - Integration tests with live APIs
   - Mock providers for testing

### Phase 3: Advanced Features (Days 7-9)

**Objective:** Production-ready utilities and monitoring

1. **Prompt System**
   - Template-based prompt builder
   - Variable substitution and validation
   - Response parsing with schema validation

2. **Operational Features**
   - Cost tracking across all providers
   - Rate limiting with token bucket algorithm
   - Retry logic with exponential backoff

3. **Observability**
   - Structured logging for all operations
   - Performance metrics collection
   - Error rate monitoring

### Phase 4: Migration (Days 10-12)

**Objective:** Migrate existing modules to new client

1. **Extraction Module Migration**
   - Refactor resumeAgent.js to use new client
   - Migrate promptTemplates.js to PromptBuilder
   - Update extraction pipeline integration

2. **Evaluation Module Migration**
   - Replace scorer.js LLM hacks with clean API calls
   - Implement proper prompt templates for evaluation
   - Test end-to-end evaluation pipeline

3. **Validation and Testing**
   - Comprehensive integration testing
   - Performance benchmarking
   - Cost analysis and optimization

## Detailed Task List

### 1. Initialize LLM Client Package (2 story points)

**User Story:** As a developer, I want a properly structured package so I can easily maintain and extend the LLM client
**Acceptance Criteria:**

- [x] Create `lib/llm-client` directory with proper structure
- [x] Initialize `package.json` with dependencies (OpenAI SDK)
- [x] Set up exports in `index.js` with factory functions
- [ ] Create README with installation and basic usage
- [ ] Add development scripts (test, lint, build)

### 2. Define Base Provider Interface (3 story points)

**User Story:** As a developer, I want a consistent provider interface so I can swap LLM providers without changing application code
**Acceptance Criteria:**

- [ ] Create abstract `BaseProvider` class with required methods
- [ ] Define standard request/response formats for all operations
- [ ] Specify provider capability requirements (chat, completion, streaming)
- [ ] Add provider validation and registration system
- [ ] Include comprehensive JSDoc documentation

### 3. Implement Core LLM Client (5 story points)

**User Story:** As a developer, I want a unified client that abstracts provider details so I can focus on business logic
**Acceptance Criteria:**

- [ ] Create `LLMClient` class with provider factory pattern
- [ ] Implement configuration management and validation
- [ ] Add main API methods: `chat()`, `complete()`, `stream()`
- [ ] Include request/response logging and debugging
- [ ] Handle provider initialization and connection testing
- [ ] Support runtime provider switching

### 4. Build OpenAI Provider (3 story points)

**User Story:** As a developer, I want to use OpenAI models through the unified interface so I can leverage GPT capabilities
**Acceptance Criteria:**

- [ ] Implement `OpenAIProvider` extending `BaseProvider`
- [ ] Support GPT-4o, GPT-3.5-turbo, and GPT-4-turbo models
- [ ] Handle OpenAI-specific parameters (temperature, top_p, etc.)
- [ ] Implement response format handling (JSON object, text)
- [ ] Add OpenAI error handling and status code mapping
- [ ] Support streaming responses for long completions

### 5. Build DeepSeek Provider (3 story points)

**User Story:** As a developer, I want to use DeepSeek models as a cost-effective alternative so I can optimize AI expenses
**Acceptance Criteria:**

- [ ] Implement `DeepSeekProvider` extending `BaseProvider`
- [ ] Support DeepSeek v3 model configuration and parameters
- [ ] Handle DeepSeek API authentication and headers
- [ ] Map DeepSeek request/response formats to standard interface
- [ ] Implement DeepSeek-specific error handling
- [ ] Add cost calculation based on DeepSeek pricing

### 6. Create Advanced Prompt System (3 story points)

**User Story:** As a developer, I want a flexible prompt builder so I can construct complex prompts programmatically
**Acceptance Criteria:**

- [ ] Build `PromptBuilder` with method chaining API
- [ ] Support template variables with type validation
- [ ] Add conditional prompt sections and logic
- [ ] Include role-based prompt templates (extractor, evaluator, etc.)
- [ ] Implement prompt validation and sanitization
- [ ] Support multi-turn conversation building

### 7. Implement Response Parser (2 story points)

**User Story:** As a developer, I want consistent response parsing so I can extract structured data regardless of provider
**Acceptance Criteria:**

- [ ] Create `ResponseParser` with format detection
- [ ] Support JSON response parsing with schema validation
- [ ] Handle streaming response aggregation
- [ ] Add error response parsing and classification
- [ ] Implement response metadata extraction (tokens, timing)
- [ ] Support custom parsing rules per use case

### 8. Add Cost Tracking System (2 story points)

**User Story:** As a project manager, I want detailed cost tracking so I can monitor and control AI expenses
**Acceptance Criteria:**

- [ ] Implement `CostCalculator` with multi-provider pricing
- [ ] Track token usage per request and provider
- [ ] Calculate costs based on current pricing models
- [ ] Aggregate costs by time period, provider, and use case
- [ ] Export cost reports in multiple formats (JSON, CSV)
- [ ] Add cost alerting and budget tracking

### 9. Build Rate Limiting System (2 story points)

**User Story:** As a developer, I want automatic rate limiting so I don't exceed provider API quotas
**Acceptance Criteria:**

- [ ] Implement token bucket algorithm for rate limiting
- [ ] Support per-provider rate limit configuration
- [ ] Queue requests when rate limits are reached
- [ ] Add graceful degradation and backpressure handling
- [ ] Include rate limit monitoring and alerting
- [ ] Support burst allowances for peak usage

### 10. Implement Retry Logic (2 story points)

**User Story:** As a developer, I want automatic retries so temporary failures don't break my application
**Acceptance Criteria:**

- [ ] Build `RetryHandler` with exponential backoff
- [ ] Configure max retry attempts per error type
- [ ] Handle different error categories (rate limit, timeout, server error)
- [ ] Add jitter to prevent thundering herd problems
- [ ] Log retry attempts with detailed error context
- [ ] Support custom retry strategies per use case

### 11. Add Configuration Management (2 story points)

**User Story:** As a developer, I want centralized configuration so I can manage LLM settings consistently
**Acceptance Criteria:**

- [ ] Support environment variable configuration
- [ ] Allow runtime configuration updates
- [ ] Validate all configuration options
- [ ] Support multiple environment profiles (dev, staging, prod)
- [ ] Include configuration documentation and examples
- [ ] Add configuration change detection and reloading

### 12. Implement Observability Features (3 story points)

**User Story:** As a developer, I want comprehensive logging and metrics so I can monitor system performance
**Acceptance Criteria:**

- [ ] Add structured logging for all LLM operations
- [ ] Track request latency, token usage, and success rates
- [ ] Monitor error rates by provider and error type
- [ ] Export metrics in standard formats (Prometheus, JSON)
- [ ] Include request tracing for debugging
- [ ] Add performance profiling and bottleneck detection

### 13. Migrate Extraction Module (4 story points)

**User Story:** As a developer, I want the extraction module to use the new LLM client so it benefits from all new features
**Acceptance Criteria:**

- [ ] Refactor `resumeAgent.js` to use `LLMClient`
- [ ] Migrate prompt templates to `PromptBuilder` system
- [ ] Replace custom cost tracking with unified system
- [ ] Update error handling to use new client patterns
- [ ] Maintain backward compatibility for existing APIs
- [ ] Add comprehensive migration testing

### 14. Migrate Evaluation Module (3 story points)

**User Story:** As a developer, I want the evaluation module to use clean APIs so it's maintainable and testable
**Acceptance Criteria:**

- [ ] Replace `scorer.js` method overriding with proper client calls
- [ ] Implement evaluation-specific prompt templates
- [ ] Use unified cost tracking for evaluation operations
- [ ] Maintain existing scoring logic and accuracy
- [ ] Add proper error handling for evaluation failures
- [ ] Test evaluation pipeline with both providers

### 15. Create Comprehensive Testing (3 story points)

**User Story:** As a developer, I want thorough tests so I can refactor and extend the client with confidence
**Acceptance Criteria:**

- [ ] Unit tests for all client components (>90% coverage)
- [ ] Integration tests with real provider APIs
- [ ] Mock provider implementations for fast testing
- [ ] Performance benchmarks for response times and costs
- [ ] Error scenario testing (network failures, API errors)
- [ ] Load testing for concurrent usage patterns

### 16. Write Documentation (2 story points)

**User Story:** As a developer, I want clear documentation so I can quickly integrate and use the LLM client
**Acceptance Criteria:**

- [ ] API reference documentation with examples
- [ ] Getting started guide with common use cases
- [ ] Provider comparison and selection guide
- [ ] Migration guide from existing implementations
- [ ] Best practices and performance optimization tips
- [ ] Troubleshooting guide for common issues

**Total Story Points: 44**

## Risk Assessment

### Technical Risks

**Provider API Inconsistencies**

- **Risk**: OpenAI and DeepSeek APIs may have different capabilities or response formats
- **Probability**: Medium
- **Mitigation**: Abstract differences in provider layer, comprehensive testing

**Performance Degradation**

- **Risk**: Additional abstraction layer may add latency to LLM calls
- **Probability**: Low
- **Mitigation**: Benchmarking, optimize critical paths, minimal overhead design

**Complex Migration**

- **Risk**: Existing tight coupling makes migration difficult
- **Probability**: Medium
- **Mitigation**: Incremental migration, maintain backward compatibility

### Timeline Risks

**DeepSeek API Documentation**

- **Risk**: Limited documentation may slow DeepSeek provider development
- **Probability**: Medium
- **Mitigation**: Start with OpenAI provider, add DeepSeek iteratively

**Scope Creep**

- **Risk**: Additional features requested during development
- **Probability**: High
- **Mitigation**: Clear MVP definition, feature freeze after design approval

### Operational Risks

**Cost Overruns**

- **Risk**: Multiple provider testing increases API costs
- **Probability**: Low
- **Mitigation**: Use smaller models for testing, implement spend limits

**Provider Reliability**

- **Risk**: DeepSeek may have different uptime/reliability characteristics
- **Probability**: Medium
- **Mitigation**: Built-in fallback logic, comprehensive monitoring

## Success Metrics

### Technical Metrics

- [ ] 100% of existing LLM calls migrated to new client
- [ ] <5ms additional latency from abstraction layer
- [ ] > 95% test coverage for all client components
- [ ] Support for both OpenAI and DeepSeek providers
- [ ] Zero provider-specific code in application modules

### Operational Metrics

- [ ] Cost tracking accuracy within 5% of actual bills
- [ ] <0.1% error rate increase during migration
- [ ] 50% reduction in LLM-related code duplication
- [ ] <2 hours to add a new LLM provider
- [ ] 100% of new agents use unified client

### Developer Experience Metrics

- [ ] <10 lines of code to integrate LLM in new agent
- [ ] Complete API documentation with examples
- [ ] Migration guide with step-by-step instructions
- [ ] <1 day onboarding time for new developers

## Next Steps

1. **Stakeholder Review**: Get approval for PRD and technical approach
2. **Resource Allocation**: Assign development resources and timeline
3. **Environment Setup**: Prepare development environment with API keys
4. **Implementation Start**: Begin with Phase 1 foundation work
5. **Regular Check-ins**: Weekly progress reviews and risk assessment

This unified LLM client will serve as the foundation for all AI operations in the screening application, providing the flexibility, reliability, and maintainability needed for long-term success.
