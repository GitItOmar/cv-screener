# Product Requirements Document (PRD)

# Intelligent Insight Relevance System - TalentScreen

**Version**: 1.0  
**Date**: December 2024  
**Author**: Product Team  
**Status**: Active  
**Priority**: High

---

## 1. Executive Summary

### Problem Statement

The current candidate review interface displays strengths and concerns in a static, first-come-first-served manner without considering job relevance. Recruiters see generic insights like "Strong in Python" even when hiring for a leadership role, or "Needs improvement in communication" for technical positions where it's less critical. This leads to:

- **Misaligned Decision Making**: 60% of key job-relevant insights are buried below irrelevant ones
- **Cognitive Overload**: Recruiters spend 40% more time filtering through irrelevant information
- **Missed Quality Candidates**: High-potential candidates rejected due to prominent but irrelevant concerns
- **Inconsistent Evaluation**: Same candidate evaluated differently based on random insight ordering

### Proposed Solution

An **Intelligent Insight Relevance System** that dynamically scores and ranks insights based on:

1. **Job Context Matching**: Relevance to position title, level, and required skills
2. **Agent Expertise Weighting**: CEO insights for leadership roles, CTO for technical positions
3. **Impact Scoring**: Severity and importance of each strength/concern
4. **Dynamic Display Logic**: Show 2-6 insights based on relevance scores, not fixed numbers
5. **Transparency**: Clear indicators showing why each insight is relevant

### Key Benefits

- **90% Relevance Accuracy**: Show only job-critical insights above relevance threshold
- **50% Faster Decisions**: Reduce time spent parsing irrelevant information
- **25% Fewer False Rejects**: Prevent rejection based on irrelevant concerns
- **Consistent Evaluation**: Same insights prioritized for similar roles across candidates
- **Scalable Intelligence**: System learns and improves with usage patterns

### Key Risks

- **Algorithm Bias**: Over-weighting certain types of insights or job characteristics
- **Complexity Overhead**: Performance impact from real-time relevance calculations
- **User Trust**: Recruiters may distrust "hidden" insights not shown on cards
- **Edge Cases**: Difficulty handling unique or multi-disciplinary roles

---

## 2. Technical Analysis

### Current Architecture Assessment

#### Existing Implementation

```javascript
// Current: Simple, static extraction
function extractKeyHighlights(candidate) {
  // Take first 3 strengths + first concern
  const highlights = candidate.summarization.summary.key_strengths.slice(0, 3);
  highlights.push(candidate.summarization.summary.key_concerns[0]);
  return highlights.slice(0, 5); // Hard cap at 5
}
```

**Current Limitations:**

- No job context consideration
- Ignores agent expertise areas (CEO vs CTO vs HR)
- Fixed insight count regardless of relevance
- No scoring or ranking mechanism
- Misses high-impact insights from non-primary sources

#### Available Data Sources

```javascript
// Rich data available for relevance scoring
{
  // Job Context
  positionAppliedFor: {
    title: "Senior Software Engineer",
    level: "senior",
    keywords: ["React", "TypeScript", "Team Lead"]
  },

  // Multi-perspective insights
  agent_perspectives: {
    ceo: { score: 0.8, highlights: [...], concerns: [...] },
    cto: { score: 0.9, highlights: [...], concerns: [...] },
    hr:  { score: 0.7, highlights: [...], concerns: [...] }
  },

  // Consensus insights
  summary: {
    key_strengths: [...],
    key_concerns: [...],
    confidence_level: 0.85
  }
}
```

### Proposed Architecture Changes

#### Core Components

```
src/app/review/
├── components/
│   ├── CandidateCard.jsx           # Updated to use relevance system
│   └── InsightRelevanceIndicator.jsx # Shows why insights are relevant
├── services/
│   ├── InsightRelevanceEngine.js   # Core scoring algorithm
│   ├── JobContextAnalyzer.js       # Extracts job requirements
│   ├── AgentWeightCalculator.js    # Weights by agent expertise
│   └── InsightRanker.js            # Ranks and filters insights
├── utils/
│   ├── relevanceScoring.js         # Scoring algorithms
│   ├── keywordMatching.js          # Job keyword matching
│   └── insightClassification.js   # Categorizes insight types
└── config/
    └── relevanceConfig.js          # Scoring weights and thresholds
```

#### Relevance Scoring Algorithm

```javascript
class InsightRelevanceEngine {
  scoreInsight(insight, candidate, jobContext) {
    const scores = {
      jobMatch: this.calculateJobMatchScore(insight, jobContext), // 0-40 points
      agentWeight: this.calculateAgentWeight(insight.source, jobContext), // 0-25 points
      impactSeverity: this.calculateImpactScore(insight), // 0-20 points
      confidenceLevel: this.calculateConfidenceScore(insight), // 0-10 points
      uniqueness: this.calculateUniquenessScore(insight, candidate), // 0-5 points
    };

    return Object.values(scores).reduce((sum, score) => sum + score, 0); // 0-100 scale
  }
}
```

### Performance Considerations

#### Optimization Strategies

1. **Caching**: Cache relevance scores for identical job context + insight combinations
2. **Lazy Scoring**: Only score insights when card is rendered, not during data load
3. **Batch Processing**: Score all insights in a single operation per candidate
4. **Memoization**: Cache expensive keyword matching operations
5. **Threshold Early Exit**: Stop processing once minimum relevance threshold is met

#### Performance Targets

- Relevance calculation: < 50ms per candidate
- Cache hit rate: > 80% for common job contexts
- Memory overhead: < 2MB additional per session
- UI responsiveness: No perceptible delay in card rendering

---

## 3. Detailed Feature Design

### 3.1 Job Context Analysis

#### Job Context Extraction

```javascript
class JobContextAnalyzer {
  analyzeJobContext(positionAppliedFor) {
    return {
      role_type: this.classifyRoleType(positionAppliedFor.title), // 'technical', 'leadership', 'hybrid'
      seniority_level: positionAppliedFor.level, // 'junior', 'mid', 'senior', 'leadership'
      key_skills: this.extractKeySkills(positionAppliedFor.keywords),
      domain_focus: this.identifyDomain(positionAppliedFor.keywords), // 'frontend', 'backend', 'fullstack'
      soft_skills_weight: this.calculateSoftSkillsWeight(positionAppliedFor.level),
    };
  }
}
```

#### Role Classification Rules

| Role Type                        | Primary Focus                  | Secondary Focus                | Agent Priority |
| -------------------------------- | ------------------------------ | ------------------------------ | -------------- |
| Technical Individual Contributor | Technical skills, code quality | Problem solving, learning      | CTO > HR > CEO |
| Technical Lead                   | Technical skills, leadership   | Team building, communication   | CTO > CEO > HR |
| Engineering Manager              | Leadership, people mgmt        | Technical background, strategy | CEO > HR > CTO |
| Senior Leadership                | Strategy, vision, culture      | Technical depth, execution     | CEO > HR > CTO |

### 3.2 Agent Expertise Weighting

#### Agent Weight Calculation

```javascript
class AgentWeightCalculator {
  calculateAgentWeight(agentType, jobContext) {
    const baseWeights = {
      technical_ic: { cto: 1.0, hr: 0.6, ceo: 0.4 },
      tech_lead: { cto: 0.9, ceo: 0.8, hr: 0.7 },
      eng_manager: { ceo: 1.0, hr: 0.9, cto: 0.6 },
      exec_leader: { ceo: 1.0, hr: 0.8, cto: 0.3 },
    };

    return baseWeights[jobContext.role_type][agentType];
  }
}
```

#### Multi-Agent Consensus Scoring

- **High Agreement** (2-3 agents mention): +15 relevance points
- **Medium Agreement** (2 agents mention): +8 relevance points
- **Single Source**: +0 points (base score only)
- **Conflicting Views**: -5 points (flag for human review)

### 3.3 Insight Classification & Scoring

#### Insight Categories

```javascript
const INSIGHT_CATEGORIES = {
  // Technical competencies
  TECHNICAL_SKILLS: {
    base_weight: 1.0,
    keywords: ['programming', 'coding', 'technical', 'framework'],
  },
  ARCHITECTURE: { base_weight: 0.9, keywords: ['design', 'architecture', 'system', 'scalability'] },
  CODE_QUALITY: {
    base_weight: 0.8,
    keywords: ['code quality', 'testing', 'documentation', 'best practices'],
  },

  // Leadership competencies
  PEOPLE_MANAGEMENT: {
    base_weight: 1.0,
    keywords: ['team', 'management', 'leadership', 'mentoring'],
  },
  COMMUNICATION: { base_weight: 0.9, keywords: ['communication', 'presentation', 'stakeholder'] },
  STRATEGIC_THINKING: { base_weight: 0.8, keywords: ['strategy', 'vision', 'planning', 'roadmap'] },

  // Core competencies
  PROBLEM_SOLVING: {
    base_weight: 0.9,
    keywords: ['problem solving', 'analytical', 'troubleshooting'],
  },
  LEARNING: { base_weight: 0.7, keywords: ['learning', 'adaptability', 'growth', 'curiosity'] },
  EXECUTION: { base_weight: 0.8, keywords: ['delivery', 'execution', 'results', 'achievement'] },
};
```

#### Relevance Scoring Formula

```javascript
relevanceScore =
  (jobMatchScore * 0.4 + // How well insight matches job requirements
    agentWeight * 0.25 + // Weight of agent who provided insight
    impactSeverity * 0.2 + // How impactful this insight is
    confidenceLevel * 0.1 + // AI confidence in this insight
    uniquenessScore * 0.05) * // How unique/differentiating this insight is
  consensusMultiplier; // Boost if multiple agents agree
```

### 3.4 Dynamic Display Logic

#### Insight Filtering Rules

```javascript
class InsightRanker {
  selectInsightsToDisplay(scoredInsights, jobContext) {
    const sorted = scoredInsights.sort((a, b) => b.score - a.score);

    // Dynamic thresholds based on job complexity
    const minThreshold = jobContext.role_type === 'leadership' ? 65 : 55;
    const maxInsights = jobContext.role_type === 'leadership' ? 6 : 4;

    // Always show top insight if above minimum threshold
    const selected = sorted
      .filter((insight) => insight.score >= minThreshold)
      .slice(0, maxInsights);

    // Ensure balance: at least 1 strength and 1 concern if available
    return this.ensureInsightBalance(selected);
  }
}
```

#### Display Prioritization

1. **Critical Insights** (Score 80-100): Always show, red/green highlighting
2. **High Relevance** (Score 65-79): Show if space available, normal highlighting
3. **Medium Relevance** (Score 50-64): Show only if <3 higher insights available
4. **Low Relevance** (Score <50): Never show on card, available in details view

---

## 4. Implementation Plan

### Phase 1: Foundation & Algorithm (Week 1-2)

**Objective**: Build core relevance scoring engine

**User Stories**:

#### Story 1.1: Job Context Analysis

**Story Points**: 5  
**User Story**: As a system, I need to analyze job context from position data so that insights can be scored for relevance  
**Acceptance Criteria**:

- [ ] Parse positionAppliedFor data into structured job context
- [ ] Classify role types: technical_ic, tech_lead, eng_manager, exec_leader
- [ ] Extract key skills and domain focus from keywords
- [ ] Calculate soft skills importance weight based on seniority level
- [ ] Handle edge cases: missing data, ambiguous role titles

#### Story 1.2: Basic Relevance Scoring Engine

**Story Points**: 8  
**User Story**: As a system, I need to score insights based on job relevance so that most important insights are prioritized  
**Acceptance Criteria**:

- [ ] Implement job match scoring algorithm (keyword overlap, role alignment)
- [ ] Add agent expertise weighting (CEO for leadership, CTO for technical)
- [ ] Calculate impact severity based on insight phrasing and context
- [ ] Include confidence level from AI summarization
- [ ] Score uniqueness to avoid redundant insights

#### Story 1.3: Insight Classification System

**Story Points**: 3  
**User Story**: As a system, I need to categorize insights by type so that appropriate weights can be applied  
**Acceptance Criteria**:

- [ ] Define insight categories (technical, leadership, core competencies)
- [ ] Implement keyword-based classification with fallbacks
- [ ] Handle multi-category insights (e.g., "technical leadership")
- [ ] Add category-specific scoring adjustments

### Phase 2: Integration & Dynamic Display (Week 3)

**Objective**: Integrate relevance engine with UI and implement dynamic display

#### Story 2.1: CandidateCard Integration

**Story Points**: 5  
**User Story**: As a recruiter, I want to see the most job-relevant insights on candidate cards so that I can make better-informed decisions  
**Acceptance Criteria**:

- [ ] Replace static extractKeyHighlights with relevance-based selection
- [ ] Show 2-6 insights dynamically based on relevance scores
- [ ] Maintain performance: <100ms additional rendering time
- [ ] Graceful degradation when relevance scoring fails
- [ ] A/B test shows 20%+ improvement in recruiter satisfaction

#### Story 2.2: Relevance Transparency

**Story Points**: 3  
**User Story**: As a recruiter, I want to understand why certain insights are shown so that I can trust the system's recommendations  
**Acceptance Criteria**:

- [ ] Add subtle relevance indicators (stars, priority badges)
- [ ] Tooltip/hover shows relevance reasoning ("Highly relevant for Senior roles")
- [ ] Color coding: green (strength), orange (concern), blue (unique insight)
- [ ] "Show all insights" option to reveal filtered insights
- [ ] Help documentation explaining the relevance system

#### Story 2.3: Performance Optimization

**Story Points**: 3  
**User Story**: As a system, I need to calculate relevance scores efficiently so that user experience remains smooth  
**Acceptance Criteria**:

- [ ] Implement relevance score caching (Redis or in-memory)
- [ ] Add lazy scoring for off-screen candidates
- [ ] Batch process insights to minimize computation overhead
- [ ] Monitor performance metrics: <50ms average scoring time
- [ ] Memory usage increase <10% from baseline

### Phase 3: Advanced Features & Tuning (Week 4)

**Objective**: Add sophisticated features and tune algorithm based on usage

#### Story 3.1: Multi-Agent Consensus Scoring

**Story Points**: 5  
**User Story**: As a system, I need to weight insights based on agent agreement so that high-consensus insights are prioritized  
**Acceptance Criteria**:

- [ ] Detect when multiple agents mention similar insights
- [ ] Boost relevance scores for high-agreement insights (+15 points)
- [ ] Handle conflicting agent opinions (flag for human review)
- [ ] Weight agent credibility by their historical accuracy
- [ ] Validate consensus detection accuracy >80%

#### Story 3.2: Adaptive Learning System

**Story Points**: 8  
**User Story**: As a system, I need to learn from recruiter decisions so that relevance scoring improves over time  
**Acceptance Criteria**:

- [ ] Track which insights recruiters engage with (details clicks, time spent)
- [ ] Record hiring outcomes and correlate with insights shown
- [ ] Adjust scoring weights based on recruiter feedback patterns
- [ ] A/B test different scoring algorithms on subset of users
- [ ] Implement feedback loop: weekly model retraining
- [ ] Show 15%+ improvement in relevance accuracy after 30 days

#### Story 3.3: Advanced Filtering & Customization

**Story Points**: 5  
**User Story**: As a recruiter, I want to customize insight priorities so that the system adapts to my specific needs  
**Acceptance Criteria**:

- [ ] User preferences: emphasize technical vs leadership vs cultural fit
- [ ] Role-specific presets: "Technical IC", "Engineering Manager", "Executive"
- [ ] Team-level customization: different weights for different hiring teams
- [ ] "Learning mode": gradually adapt to individual recruiter patterns
- [ ] Export/import preferences for consistency across team

### Phase 4: Analytics & Optimization (Week 5)

**Objective**: Comprehensive analytics and system optimization

#### Story 4.1: Relevance Analytics Dashboard

**Story Points**: 3  
**User Story**: As a hiring manager, I want to see analytics on insight relevance so that I can optimize our hiring process  
**Acceptance Criteria**:

- [ ] Dashboard showing insight engagement rates by role type
- [ ] Correlation analysis: insights shown vs hiring outcomes
- [ ] Recruiter performance metrics: decision speed, accuracy
- [ ] A/B test results and scoring algorithm performance
- [ ] Export analytics data for deeper analysis

#### Story 4.2: Edge Case Handling

**Story Points**: 5  
**User Story**: As a system, I need to handle unusual cases so that the relevance system works for all job types  
**Acceptance Criteria**:

- [ ] Multi-disciplinary roles (e.g., "Technical Product Manager")
- [ ] Very senior roles with limited keyword data
- [ ] Contract/consulting positions with different evaluation criteria
- [ ] International candidates with different background patterns
- [ ] Graceful fallbacks when job context is ambiguous
- [ ] Manual override capability for edge cases

---

## 5. Risk Assessment

### Technical Risks

| Risk                                         | Impact | Probability | Mitigation Strategy                              |
| -------------------------------------------- | ------ | ----------- | ------------------------------------------------ |
| Algorithm bias toward specific insight types | High   | Medium      | Regular bias audits, diverse test datasets       |
| Performance degradation with complex scoring | Medium | Medium      | Caching, lazy evaluation, performance monitoring |
| Relevance scores lack accuracy               | High   | Low         | Extensive validation, A/B testing, user feedback |
| Edge cases break scoring algorithm           | Medium | Medium      | Comprehensive test suite, graceful fallbacks     |
| Cache invalidation complexity                | Low    | Medium      | Simple cache keys, TTL-based expiration          |

### Business Risks

| Risk                                     | Impact | Probability | Mitigation Strategy                         |
| ---------------------------------------- | ------ | ----------- | ------------------------------------------- |
| Recruiters distrust automated relevance  | High   | Medium      | Transparency features, gradual rollout      |
| Over-optimization for specific job types | Medium | Medium      | Balanced test datasets, multiple role types |
| Reduced insight diversity                | Medium | Low         | Minimum insight requirements, randomization |
| Increased complexity overwhelming users  | Low    | Low         | Simple UI, progressive disclosure           |

### Mitigation Strategies

1. **Gradual Rollout**: Deploy to 10% of users initially, expand based on feedback
2. **A/B Testing**: Run parallel tests comparing old vs new insight selection
3. **Fallback Systems**: Always show basic insights if relevance scoring fails
4. **User Control**: "Show all insights" option and preference controls
5. **Monitoring**: Real-time performance and accuracy metrics
6. **Regular Audits**: Weekly review of scoring accuracy and bias

---

## 6. Success Metrics & Validation

### Key Performance Indicators (KPIs)

| Metric                     | Current | Target  | Measurement Method                  |
| -------------------------- | ------- | ------- | ----------------------------------- |
| Insight Relevance Accuracy | ~40%    | 90%     | Manual evaluation by hiring experts |
| Time per Decision          | 3-5 min | 2-3 min | Session analytics, A/B testing      |
| Recruiter Satisfaction     | 3.2/5   | 4.5/5   | Weekly surveys, NPS tracking        |
| False Reject Rate          | 15%     | 10%     | Hiring outcome correlation          |
| Insight Engagement Rate    | N/A     | 70%     | Click-through on detail views       |
| System Performance Impact  | N/A     | <10%    | Rendering time, memory usage        |

### Validation Framework

#### 1. Algorithm Validation

- **Test Dataset**: 500 candidates across 20 different job types
- **Expert Review**: 3 senior recruiters manually score insight relevance
- **Accuracy Threshold**: 85% agreement with expert scores
- **Bias Testing**: Equal performance across demographic groups

#### 2. User Acceptance Testing

- **Participants**: 15 recruiters across different experience levels
- **Scenarios**: Review 50 candidates each with old vs new system
- **Metrics**: Decision time, confidence ratings, hiring recommendations
- **Success Criteria**: 70% prefer new system, 20% faster decisions

#### 3. A/B Testing Framework

- **Duration**: 4 weeks
- **Population**: 50% control (old system), 50% treatment (new system)
- **Sample Size**: 1000+ candidate reviews per group
- **Primary Metric**: Time per decision
- **Secondary Metrics**: Hiring outcomes at 3-month follow-up

### Feedback Collection

#### 1. Implicit Feedback

```javascript
// Track user interactions
const feedbackData = {
  insight_clicks: ['strength_1', 'concern_2'], // Which insights are clicked
  time_on_card: 45000, // Milliseconds spent reviewing
  detail_expansions: 2, // How often details are opened
  decision_outcome: 'accept', // Final decision
  decision_confidence: 8, // 1-10 self-reported confidence
};
```

#### 2. Explicit Feedback

- **Quick Feedback**: Thumbs up/down on individual insights
- **Relevance Rating**: 1-5 stars on overall insight quality
- **Open Text**: "What insights would help you most?"
- **Preference Updates**: Adjust technical vs leadership focus

---

## 7. Technical Specifications

### Data Structures

#### Scored Insight Object

```typescript
interface ScoredInsight {
  id: string;
  text: string;
  type: 'strength' | 'concern' | 'neutral';
  category: InsightCategory;
  source: 'ceo' | 'cto' | 'hr' | 'consensus';
  relevanceScore: number; // 0-100
  scoreBreakdown: {
    jobMatch: number; // 0-40
    agentWeight: number; // 0-25
    impactSeverity: number; // 0-20
    confidenceLevel: number; // 0-10
    uniqueness: number; // 0-5
  };
  reasoning: string; // "Highly relevant for Senior Technical roles"
  metadata: {
    keywords: string[];
    consensus_level: number; // How many agents mentioned this
    confidence: number; // AI confidence in insight
  };
}
```

#### Job Context Object

```typescript
interface JobContext {
  role_type: 'technical_ic' | 'tech_lead' | 'eng_manager' | 'exec_leader';
  seniority_level: 'junior' | 'mid' | 'senior' | 'leadership';
  key_skills: string[];
  domain_focus: 'frontend' | 'backend' | 'fullstack' | 'infrastructure' | 'other';
  soft_skills_weight: number; // 0-1, higher for leadership roles
  industry_context?: string; // Optional: fintech, healthcare, etc.
}
```

### API Endpoints

#### Relevance Scoring Service

```javascript
// Calculate relevance scores for candidate insights
POST /api/insights/score
{
  candidateId: string,
  jobContext: JobContext,
  cacheKey?: string  // Optional: for caching optimization
}

Response: {
  insights: ScoredInsight[],
  processingTime: number,
  cacheHit: boolean
}

// Update scoring weights based on feedback
POST /api/insights/feedback
{
  candidateId: string,
  insightId: string,
  feedbackType: 'helpful' | 'not_helpful' | 'irrelevant',
  userFeedback?: string
}

// Get relevance analytics
GET /api/insights/analytics?timeRange=30d&roleType=tech_lead
Response: {
  averageAccuracy: number,
  engagementRates: object,
  topPerformingInsights: string[]
}
```

### Configuration Management

#### Scoring Weights Configuration

```javascript
// config/relevanceConfig.js
export const RELEVANCE_WEIGHTS = {
  // Base scoring weights (sum to 1.0)
  JOB_MATCH: 0.4,
  AGENT_WEIGHT: 0.25,
  IMPACT_SEVERITY: 0.2,
  CONFIDENCE_LEVEL: 0.1,
  UNIQUENESS: 0.05,

  // Agent expertise by role type
  AGENT_EXPERTISE: {
    technical_ic: { cto: 1.0, hr: 0.6, ceo: 0.4 },
    tech_lead: { cto: 0.9, ceo: 0.8, hr: 0.7 },
    eng_manager: { ceo: 1.0, hr: 0.9, cto: 0.6 },
    exec_leader: { ceo: 1.0, hr: 0.8, cto: 0.3 },
  },

  // Display thresholds
  DISPLAY_THRESHOLDS: {
    MIN_RELEVANCE: 50, // Never show insights below this
    HIGH_RELEVANCE: 75, // Always show if above this
    MAX_INSIGHTS: 6, // Maximum insights per card
    MIN_INSIGHTS: 2, // Minimum insights per card
  },

  // Consensus bonuses
  CONSENSUS_MULTIPLIERS: {
    THREE_AGENTS: 1.2, // 20% bonus if all agents agree
    TWO_AGENTS: 1.1, // 10% bonus if two agents agree
    CONFLICTING: 0.9, // 10% penalty if agents disagree
  },
};
```

---

## 8. Future Enhancements

### Phase 2 Features (Q2 2025)

#### 8.1 Machine Learning Enhancement

- **Insight Embedding Models**: Use transformer models to understand semantic similarity between job requirements and insights
- **Personalized Scoring**: Individual recruiter preference learning
- **Hiring Outcome Prediction**: Correlate insights with actual hire success

#### 8.2 Advanced Job Context

- **Job Description Integration**: Parse full job descriptions, not just keywords
- **Company Culture Matching**: Factor in company values and culture fit
- **Team Dynamics**: Consider existing team composition and gaps

#### 8.3 Multi-Language Support

- **Insight Translation**: Support insights in multiple languages
- **Cultural Context**: Adjust relevance scoring for different cultural contexts
- **Localized Job Classifications**: Different role hierarchies by region

### Long-term Vision (2025-2026)

#### 8.4 Predictive Analytics

- **Success Prediction**: Predict candidate success probability based on insights
- **Skill Gap Analysis**: Identify missing skills in candidate pool
- **Market Intelligence**: Benchmark insights against industry standards

#### 8.5 Integration Ecosystem

- **ATS Integration**: Pull job requirements from existing ATS systems
- **Interview Platform**: Sync insights with interview question recommendations
- **Onboarding**: Use insights to personalize new hire onboarding plans

---

## 9. Appendices

### Appendix A: Insight Classification Examples

| Category             | Example Insights                                                | Job Type Priority              |
| -------------------- | --------------------------------------------------------------- | ------------------------------ |
| **Technical Skills** | "Expert in React and TypeScript", "Strong algorithmic thinking" | High for IC, Medium for Leads  |
| **Leadership**       | "Excellent team mentoring skills", "Strategic vision"           | Low for IC, High for Managers  |
| **Communication**    | "Clear technical communication", "Stakeholder management"       | Medium for all, High for Leads |
| **Problem Solving**  | "Creative problem-solving approach", "Systematic debugging"     | High for all technical roles   |
| **Culture**          | "Collaborative team player", "Values-driven decision making"    | Medium-High for all roles      |

### Appendix B: Relevance Scoring Examples

#### Example 1: Senior Software Engineer Role

```javascript
jobContext = {
  role_type: 'technical_ic',
  seniority_level: 'senior',
  key_skills: ['React', 'Node.js', 'System Design'],
  domain_focus: 'fullstack',
};

insights = [
  {
    text: 'Expert in React with 5+ years experience',
    scores: { jobMatch: 38, agentWeight: 25, impact: 18 },
    finalScore: 85, // High relevance - always show
    reasoning: 'Perfect match for React requirement',
  },
  {
    text: 'Needs improvement in public speaking',
    scores: { jobMatch: 8, agentWeight: 15, impact: 12 },
    finalScore: 42, // Low relevance - don't show on card
    reasoning: 'Public speaking not critical for IC role',
  },
];
```

#### Example 2: Engineering Manager Role

```javascript
jobContext = {
  role_type: 'eng_manager',
  seniority_level: 'senior',
  key_skills: ['Leadership', 'Team Building', 'Strategy'],
  domain_focus: 'management',
};

insights = [
  {
    text: 'Needs improvement in public speaking',
    scores: { jobMatch: 32, agentWeight: 22, impact: 16 },
    finalScore: 78, // High relevance - show on card
    reasoning: 'Communication critical for management roles',
  },
];
```

### Appendix C: Performance Benchmarks

| Operation              | Target Time | Current Baseline | Optimization Strategy       |
| ---------------------- | ----------- | ---------------- | --------------------------- |
| Job context analysis   | <10ms       | N/A              | Simple classification rules |
| Single insight scoring | <5ms        | N/A              | Optimized keyword matching  |
| Full candidate scoring | <50ms       | N/A              | Batch processing, caching   |
| Cache lookup           | <1ms        | N/A              | In-memory Redis cache       |
| UI rendering impact    | <20ms       | 15ms             | Lazy evaluation             |

### Appendix D: A/B Testing Plan

#### Test Design

- **Hypothesis**: Relevance-based insight selection improves decision quality and speed
- **Primary Metric**: Average decision time per candidate
- **Secondary Metrics**: Hiring outcome correlation, user satisfaction
- **Sample Size**: 2000 candidate reviews (1000 per group)
- **Duration**: 4 weeks
- **Significance Level**: 95% confidence interval

#### Test Segments

1. **Control Group**: Current system (first N insights)
2. **Treatment Group**: Relevance-based system
3. **Randomization**: By recruiter ID to avoid cross-contamination
4. **Exclusions**: New recruiters (<30 days experience)

---

## Document History

| Version | Date     | Author       | Changes                                  |
| ------- | -------- | ------------ | ---------------------------------------- |
| 1.0     | Dec 2024 | Product Team | Initial PRD for insight relevance system |

---

**Next Steps**:

1. Technical architecture review with engineering team
2. Create detailed mockups showing relevance indicators
3. Set up A/B testing infrastructure
4. Begin Phase 1 implementation: Job context analysis
5. Recruit beta test group of 10 experienced recruiters
