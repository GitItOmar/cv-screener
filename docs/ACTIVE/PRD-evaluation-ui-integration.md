# Product Requirements Document: Evaluation-UI Integration

## Executive Summary

### Problem Statement

The CV screening application currently uses mock data in the review interface. The evaluation system exists and can score candidates based on multiple criteria, but it's not connected to the user interface. Users cannot see actual AI-generated scores and reasoning for each candidate.

### Proposed Solution

Integrate the existing evaluation system with the review interface to display real-time AI scores, category breakdowns, and evaluation reasoning for each candidate. This MVP implementation will replace mock data with actual evaluation results while keeping the interface simple and focused.

### Key Benefits

- Real AI-powered scoring instead of mock data
- Transparent scoring with category breakdowns
- Clear reasoning for each evaluation decision
- Improved decision-making for recruiters
- Foundation for future enhancements

### Risks

- **Performance Risk**: API calls may slow down the review process
- **Data Consistency Risk**: Mismatch between extracted and displayed data
- **User Experience Risk**: Too much information may overwhelm users
- **Integration Risk**: Potential issues with data flow between systems

## Technical Analysis

### Current Architecture Assessment

#### Review Interface (`/src/app/review/page.jsx`)

- Uses mock candidate data with hardcoded scores
- Component-based architecture with React hooks
- Swipe-based review system with keyboard shortcuts
- Tabs for different information views
- Mobile-responsive with drawer for details

#### Evaluation System (`/src/app/evaluation/`)

- Comprehensive scoring across 5 categories:
  - Self Evaluation (0-1 point)
  - Skills & Specialties (0-2 points)
  - Work Experience (0-4 points)
  - Basic Information (0-1 point)
  - Education Background (0-2 points)
- LLM-powered evaluation using GPT-4o
- Returns detailed scores, reasoning, and signals
- Critical gates for requirements (e.g., Shopify experience)

#### Data Flow

1. Files uploaded via `/upload` interface
2. Extraction API processes files (`/extraction/api`)
3. Evaluation API scores candidates (`/evaluation/api`)
4. Review interface displays candidates

### Proposed Changes

#### Data Structure Integration

Replace mock data with evaluation results:

```javascript
// Current mock structure
{
  id: '1',
  name: 'Sarah Chen',
  role: 'Senior Frontend Developer',
  score: 92,
  // ... mock fields
}

// New integrated structure
{
  id: 'candidate-uuid',
  extractedData: {
    basicInformation: { name, email, phone, location },
    workExperience: [...],
    skillsAndSpecialties: {...},
    // ... other extracted data
  },
  evaluation: {
    overall: {
      finalPercentage: 85,
      totalScore: 8.5,
      maxTotalScore: 10
    },
    categories: {
      selfEvaluation: { score: 0.8, maxScore: 1, percentage: 80, reasoning: "..." },
      skillsSpecialties: { score: 1.6, maxScore: 2, percentage: 80, reasoning: "..." },
      workExperience: { score: 3.2, maxScore: 4, percentage: 80, reasoning: "..." },
      basicInformation: { score: 0.9, maxScore: 1, percentage: 90, reasoning: "..." },
      educationBackground: { score: 1.5, maxScore: 2, percentage: 75, reasoning: "..." }
    },
    summary: {
      recommendation: 'hire',
      strengths: { category: 'basicInformation', score: 90, details: "..." },
      improvements: { category: 'educationBackground', score: 75, details: "..." }
    }
  }
}
```

### Performance Considerations

- **Batch Processing**: Process multiple CVs in upload phase
- **Caching**: Store evaluation results to avoid re-processing
- **Progressive Loading**: Load and evaluate files as needed
- **Background Processing**: Use async evaluation during upload

## Implementation Plan

### Phase 1: Backend Integration (Story Points: 5)

**User Story**: As a system, I want to connect extraction and evaluation during upload so that all candidates have scores ready for review

**Acceptance Criteria**:

- [ ] Modify upload flow to trigger extraction for each file
- [ ] Chain evaluation API call after successful extraction
- [ ] Store combined results in session/state management
- [ ] Handle errors gracefully with fallback to partial data
- [ ] Add loading states during processing

**Dependencies**: None

### Phase 2: Data Pipeline (Story Points: 3)

**User Story**: As a developer, I want a unified data structure so that evaluation results flow seamlessly to the UI

**Acceptance Criteria**:

- [ ] Create adapter function to transform evaluation data for UI
- [ ] Map extracted fields to display fields
- [ ] Handle missing or incomplete data gracefully
- [ ] Maintain backward compatibility with filter/search features

**Dependencies**: Phase 1

### Phase 3: UI Score Display (Story Points: 5)

**User Story**: As a recruiter, I want to see AI evaluation scores so that I can make informed decisions about candidates

**Acceptance Criteria**:

- [ ] Replace mock score with actual overall percentage
- [ ] Display score badge with appropriate color coding
- [ ] Show "AI Evaluated" indicator when real scores are present
- [ ] Gracefully handle candidates without evaluation scores
- [ ] Maintain existing UI layout and responsiveness

**Dependencies**: Phase 2

### Phase 4: Category Breakdown View (Story Points: 8)

**User Story**: As a recruiter, I want to see detailed scoring breakdowns so that I understand why candidates received their scores

**Acceptance Criteria**:

- [ ] Add new "Evaluation" tab to candidate details
- [ ] Display all 5 category scores with progress bars
- [ ] Show reasoning for each category score
- [ ] Highlight strongest and weakest categories
- [ ] Include recommendation (strong_hire/hire/maybe/reject)
- [ ] Display any penalties or gates applied

**Dependencies**: Phase 3

### Phase 5: Enhanced Skills Display (Story Points: 3)

**User Story**: As a recruiter, I want to see which skills matched requirements so that I can assess technical fit

**Acceptance Criteria**:

- [ ] Differentiate matched vs other skills visually
- [ ] Show keyword detection results (e.g., Shopify experience)
- [ ] Display skill relevance to job requirements
- [ ] Maintain existing skill badge styling

**Dependencies**: Phase 3

### Phase 6: Error Handling & Fallbacks (Story Points: 3)

**User Story**: As a user, I want the system to handle evaluation failures gracefully so that I can still review candidates

**Acceptance Criteria**:

- [ ] Display appropriate message when evaluation fails
- [ ] Fall back to extracted data without scores
- [ ] Allow manual review without AI scores
- [ ] Log errors for debugging
- [ ] Provide retry mechanism for failed evaluations

**Dependencies**: Phases 1-5

## Risk Assessment

### Technical Risks

1. **API Performance**: Evaluation API calls may timeout or be slow
   - Mitigation: Implement timeout handling, background processing
2. **Data Inconsistency**: Extraction and evaluation data may not align
   - Mitigation: Add validation layer, consistent data models

3. **LLM Costs**: GPT-4o API calls for every candidate may be expensive
   - Mitigation: Cache results, batch processing, cost monitoring

### Timeline Risks

1. **Scope Creep**: Additional features requested during development
   - Mitigation: Strict MVP scope, defer enhancements to v2

2. **Integration Complexity**: Unexpected issues connecting systems
   - Mitigation: Incremental integration, comprehensive testing

### Mitigation Strategies

- Implement feature flags for gradual rollout
- Add comprehensive error logging
- Create fallback UI for evaluation failures
- Monitor API costs and performance metrics
- Regular testing during development

## Task List

### Immediate Tasks (MVP - Total: 27 Story Points)

1. **Backend Integration**
   - Connect upload → extraction → evaluation pipeline
   - Implement error handling and retries
   - Add progress tracking for bulk uploads

2. **Data Management**
   - Create state management for evaluation results
   - Build data adapter for UI consumption
   - Implement caching strategy

3. **Core UI Updates**
   - Replace mock scores with real evaluation data
   - Add evaluation tab to candidate details
   - Display category scores and reasoning

4. **Visual Enhancements**
   - Update score badges and indicators
   - Add loading states during evaluation
   - Implement error states and messages

5. **Testing & Validation**
   - Test with various CV formats
   - Validate score calculations
   - Ensure UI responsiveness

### Future Enhancements (Post-MVP)

- Bulk re-evaluation capabilities
- Score adjustment and override features
- Detailed signal breakdown display
- Export evaluation reports
- Historical scoring trends
- Customizable scoring weights
- Comparison view between candidates

## Success Metrics

- All uploaded CVs have evaluation scores
- < 2 second load time for candidate review
- < 5% evaluation failure rate
- Clear reasoning displayed for all scores
- No regression in existing functionality

## MVP Scope Boundaries

**In Scope**:

- Display overall evaluation score
- Show 5 category scores with percentages
- Display reasoning for each category
- Integration with existing upload/review flow
- Error handling and fallbacks

**Out of Scope**:

- Score editing or overrides
- Bulk re-evaluation
- Custom scoring weights
- Detailed signal analysis
- Export functionality
- Comparison features

## Conclusion

This integration will transform the CV screening application from a mock interface to a fully functional AI-powered evaluation system. The MVP focuses on displaying essential scoring information while maintaining the existing user experience. The phased approach ensures incremental value delivery with minimal risk.
