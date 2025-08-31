# Product Requirements Document (PRD)

# Candidate Review Interface - TalentScreen

**Version**: 1.0  
**Date**: December 2024  
**Author**: Product Team  
**Status**: Active

---

## 1. Executive Summary

### Problem Statement

The current candidate review interface displays all candidate information in a monospace, text-heavy format that overwhelms recruiters with raw data. Users need to review 50-200 candidates per session, leading to decision fatigue and inefficient workflows. The lack of mobile support and keyboard shortcuts makes the review process slow and cumbersome.

### Proposed Solution

A modern, card-based swipe interface that presents candidate information in a digestible, decision-focused format. The solution features:

- **Mobile-first design** with swipe gestures for quick decisions
- **Keyboard navigation** for desktop power users
- **Progressive disclosure** of information to prevent cognitive overload
- **Real-time decision tracking** with undo capabilities
- **Smart summarization** highlighting only critical decision factors

### Key Benefits

- **80% reduction** in time-per-decision (from 3-5 minutes to 30-60 seconds)
- **Improved accuracy** through focused information presentation
- **Cross-platform consistency** between mobile and desktop
- **Reduced cognitive load** via progressive information disclosure
- **Better decision tracking** with built-in analytics

### Key Risks

- **Learning curve** for users accustomed to traditional list views
- **Gesture conflicts** on mobile devices with existing browser behaviors
- **Performance concerns** with large candidate pools (>500)
- **Accessibility challenges** for keyboard-only navigation

---

## 2. Technical Analysis

### Current Architecture Assessment

#### Existing Implementation

```
src/app/review/page.jsx
├── Static data display (no interactivity)
├── SessionStorage for candidate data
├── Monospace text formatting
└── No state management for decisions
```

**Current Limitations:**

- No touch event handling
- No keyboard event listeners
- No decision persistence
- No undo/redo functionality
- Poor mobile responsiveness
- No animation or transitions

#### Available Resources

- **UI Components**: Full shadcn/ui component library (cards, drawers, badges, buttons)
- **Styling**: Tailwind CSS 4 with custom design system
- **State Management**: React 19 hooks with session storage
- **Data Structure**: Rich candidate objects with extraction, evaluation, and summarization data

### Proposed Architecture Changes

#### Component Structure

```
src/app/review/
├── page.jsx                      # Main review page
├── components/
│   ├── CandidateCard.jsx        # Card display component
│   ├── SwipeContainer.jsx       # Touch/swipe handler
│   ├── DecisionTracker.jsx      # Decision state manager
│   ├── KeyboardNavigator.jsx    # Keyboard shortcut handler
│   ├── CandidateDetails.jsx     # Detailed view drawer
│   └── ReviewStats.jsx          # Progress and analytics
├── hooks/
│   ├── useSwipeGestures.js      # Touch gesture detection
│   ├── useKeyboardShortcuts.js  # Keyboard event handling
│   ├── useDecisionState.js      # Decision management
│   └── useCandidateQueue.js     # Queue management
└── utils/
    ├── gestureDetection.js      # Swipe threshold calculations
    ├── candidateScoring.js      # Score interpretation
    └── storageManager.js        # Decision persistence
```

### Dependency Mapping

#### New Dependencies Required

```json
{
  "framer-motion": "^10.x", // Animation and gestures
  "react-use-gesture": "^9.x", // Touch gesture detection
  "react-hotkeys-hook": "^4.x", // Keyboard shortcut management
  "react-intersection-observer": "^9.x" // Lazy loading
}
```

#### Existing Dependencies to Leverage

- React 19 (concurrent features for smooth animations)
- Tailwind CSS (responsive utilities)
- shadcn/ui components (cards, drawers, badges)
- Lucide React icons (visual indicators)

### Performance Considerations

#### Optimization Strategies

1. **Virtual scrolling** for candidate queue (only render visible cards)
2. **Lazy loading** of detailed information (load on-demand)
3. **Optimistic UI updates** for instant feedback
4. **Debounced decision persistence** to reduce storage writes
5. **Memoized components** to prevent unnecessary re-renders

#### Performance Targets

- Initial load: < 500ms
- Card transition: < 100ms
- Decision action: < 50ms
- Undo operation: < 100ms
- Mobile touch response: < 16ms (60fps)

---

## 3. Implementation Plan

### Phase 1: Foundation (Week 1)

**Objective**: Core infrastructure and basic card display

**Tasks**:

1. Set up gesture detection system
2. Implement keyboard navigation hooks
3. Create base CandidateCard component
4. Build decision state management
5. Add session storage integration

**Deliverables**:

- Working card display with sample data
- Basic keyboard navigation (arrow keys)
- Decision state tracking in memory

### Phase 2: Mobile Experience (Week 2)

**Objective**: Complete mobile swipe interface

**Tasks**:

1. Implement touch gesture recognition
2. Add swipe animations with spring physics
3. Create mobile-optimized card layout
4. Add haptic feedback triggers
5. Implement gesture tutorials

**Deliverables**:

- Fully functional swipe interface
- Smooth animations and transitions
- Mobile gesture onboarding

### Phase 3: Desktop Enhancement (Week 3)

**Objective**: Power user features for desktop

**Tasks**:

1. Extended keyboard shortcuts (U-undo, S-skip, D-details)
2. Bulk action capabilities
3. Advanced filtering options
4. Multi-column view for comparison
5. Export functionality

**Deliverables**:

- Complete keyboard navigation
- Bulk selection and actions
- CSV export of decisions

### Phase 4: Polish & Optimization (Week 4)

**Objective**: Performance optimization and polish

**Tasks**:

1. Performance profiling and optimization
2. Accessibility audit and fixes
3. Cross-browser testing
4. Animation refinement
5. Error handling and edge cases

**Deliverables**:

- Production-ready interface
- Performance benchmarks met
- Full accessibility compliance

---

## 4. Risk Assessment

### Technical Risks

| Risk                              | Impact | Probability | Mitigation                                              |
| --------------------------------- | ------ | ----------- | ------------------------------------------------------- |
| Browser gesture conflicts         | High   | Medium      | Implement gesture zones, use preventDefault selectively |
| Performance with large datasets   | High   | Low         | Virtual scrolling, pagination fallback                  |
| Touch detection accuracy          | Medium | Medium      | Adjustable sensitivity settings                         |
| State synchronization issues      | Medium | Low         | Single source of truth, optimistic updates              |
| Animation jank on low-end devices | Low    | Medium      | Reduced motion mode, CSS-only fallbacks                 |

### Timeline Risks

| Risk                            | Impact       | Mitigation                            |
| ------------------------------- | ------------ | ------------------------------------- |
| Gesture library incompatibility | 1 week delay | Pre-tested library alternatives ready |
| Complex animation requirements  | 3 day delay  | Simplified animation fallbacks        |
| Accessibility compliance        | 1 week delay | Early and continuous testing          |

### Mitigation Strategies

1. **Progressive Enhancement**: Core functionality works without JavaScript
2. **Feature Flags**: Gradual rollout with ability to revert
3. **A/B Testing**: Compare with existing interface performance
4. **User Feedback Loop**: Weekly user testing sessions
5. **Performance Budget**: Strict limits on bundle size and render time

---

## 5. Task List

### User Story 1: Card-Based Candidate Display

**Priority**: High  
**Story Points**: 5  
**User Story**: As a recruiter, I want to see one candidate at a time in a card format so that I can focus on making a decision without distraction  
**Acceptance Criteria**:

- [ ] Display candidate name, role, and photo/avatar prominently
- [ ] Show overall score with visual indicator (color-coded badge)
- [ ] Display 3-5 key highlights in bullet format
- [ ] Include years of experience and location
- [ ] Responsive layout that works on all screen sizes
- [ ] Loading skeleton while data fetches
- [ ] Error state for missing data

**Technical Implementation**:

```jsx
<CandidateCard>
  <CardHeader>
    <Avatar />
    <Name />
    <Role />
    <Score />
  </CardHeader>
  <CardBody>
    <KeyHighlights />
    <QuickStats />
  </CardBody>
  <CardFooter>
    <ActionButtons />
  </CardFooter>
</CandidateCard>
```

### User Story 2: Mobile Swipe Gestures

**Priority**: High  
**Story Points**: 8  
**User Story**: As a mobile user, I want to swipe left to reject and right to accept candidates so that I can quickly review on my phone  
**Acceptance Criteria**:

- [ ] Detect horizontal swipe gestures with 50px threshold
- [ ] Visual feedback during swipe (card rotation, color change)
- [ ] Smooth spring animation on release
- [ ] Swipe velocity detection for quick flicks
- [ ] Prevent accidental swipes with vertical scroll lock
- [ ] Visual indicators for swipe direction (icons/colors)
- [ ] Haptic feedback on decision (where supported)

**Technical Implementation**:

```javascript
const swipeHandlers = useGesture({
  onDrag: ({ movement: [mx], velocity, direction }) => {
    // Update card position and rotation
    // Show accept/reject indicators
  },
  onDragEnd: ({ movement: [mx], velocity }) => {
    if (Math.abs(mx) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // Trigger accept/reject action
    }
  },
});
```

### User Story 3: Keyboard Navigation

**Priority**: High  
**Story Points**: 3  
**User Story**: As a desktop user, I want to use arrow keys to accept/reject candidates so that I can review quickly without using the mouse  
**Acceptance Criteria**:

- [ ] Left arrow → Reject candidate
- [ ] Right arrow → Accept candidate
- [ ] Up arrow → View details
- [ ] Down arrow → Skip candidate
- [ ] U key → Undo last action
- [ ] Space → Pause/Resume
- [ ] Visual keyboard hints on desktop
- [ ] Customizable shortcuts in settings

### User Story 4: Decision Tracking & Undo

**Priority**: High  
**Story Points**: 5  
**User Story**: As a recruiter, I want to undo my last decision in case I make a mistake  
**Acceptance Criteria**:

- [ ] Maintain decision history stack (last 50 actions)
- [ ] Undo button prominently displayed
- [ ] Keyboard shortcut (Cmd/Ctrl+Z)
- [ ] Toast notification on undo
- [ ] Restore candidate to queue in correct position
- [ ] Clear visual feedback on undo action
- [ ] Bulk undo for last N actions

### User Story 5: Detailed View Drawer

**Priority**: Medium  
**Story Points**: 5  
**User Story**: As a recruiter, I want to see detailed candidate information when needed without leaving the review flow  
**Acceptance Criteria**:

- [ ] Slide-up drawer on mobile (50% to 90% height)
- [ ] Side panel on desktop (40% width)
- [ ] All sections: Work experience, Education, Skills, Projects
- [ ] Expandable/collapsible sections
- [ ] Sticky header with quick actions
- [ ] Smooth open/close animations
- [ ] Swipe down to close on mobile
- [ ] ESC key to close on desktop

### User Story 6: Progress Tracking

**Priority**: Medium  
**Story Points**: 3  
**User Story**: As a recruiter, I want to see my review progress so I know how many candidates are left  
**Acceptance Criteria**:

- [ ] Progress bar showing X of Y reviewed
- [ ] Time elapsed counter
- [ ] Average time per decision
- [ ] Accepted/Rejected/Skipped counts
- [ ] Estimated time remaining
- [ ] Session statistics
- [ ] Exportable metrics

### User Story 7: Smart Summarization Display

**Priority**: Medium  
**Story Points**: 5  
**User Story**: As a recruiter, I want to see AI-generated insights prominently so I can make informed decisions quickly  
**Acceptance Criteria**:

- [ ] Display overall AI recommendation (traffic light system)
- [ ] Show confidence level as percentage
- [ ] Display consensus from multiple AI perspectives
- [ ] Expandable detailed analysis
- [ ] Visual differentiation of AI vs extracted data

### User Story 8: Batch Operations

**Priority**: Low  
**Story Points**: 8  
**User Story**: As a power user, I want to select multiple candidates for bulk actions  
**Acceptance Criteria**:

- [ ] Multi-select mode toggle
- [ ] Checkbox on each card in batch mode
- [ ] Select all/none/inverse options
- [ ] Bulk accept/reject/export
- [ ] Confirmation dialog for destructive actions
- [ ] Maintain selection across navigation
- [ ] Visual count of selected items

### User Story 9: Filter & Sort

**Priority**: Low  
**Story Points**: 5  
**User Story**: As a recruiter, I want to filter candidates by criteria to focus on specific profiles  
**Acceptance Criteria**:

- [ ] Filter by score range
- [ ] Filter by years of experience
- [ ] Filter by skills/keywords
- [ ] Filter by education level
- [ ] Sort by score/date/name
- [ ] Save filter presets
- [ ] Quick filter pills/tags
- [ ] Clear all filters button

### User Story 10: Export & Reporting

**Priority**: Low  
**Story Points**: 3  
**User Story**: As a hiring manager, I want to export accepted candidates to share with my team  
**Acceptance Criteria**:

- [ ] Export to CSV format
- [ ] Export to PDF report
- [ ] Include selected fields only
- [ ] Email integration option
- [ ] Shareable link generation
- [ ] Audit trail of decisions
- [ ] Timestamp all exports

---

## 6. Success Metrics

### Key Performance Indicators (KPIs)

| Metric                | Current | Target    | Measurement       |
| --------------------- | ------- | --------- | ----------------- |
| Time per decision     | 3-5 min | 30-60 sec | Session analytics |
| Decisions per session | 10-20   | 50-100    | User tracking     |
| Mobile usage          | 0%      | 40%       | Device analytics  |
| Undo usage rate       | N/A     | <5%       | Feature tracking  |
| User satisfaction     | N/A     | 4.5/5     | Survey            |
| Completion rate       | 60%     | 90%       | Session tracking  |

### User Testing Criteria

1. **Usability Testing**
   - 10 recruiters, 5 mobile, 5 desktop
   - Task: Review 20 candidates
   - Measure: Time, errors, satisfaction

2. **A/B Testing**
   - 50/50 split old vs new interface
   - Duration: 2 weeks
   - Measure: Speed, accuracy, retention

3. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard-only navigation
   - Color contrast compliance
   - Motion sensitivity options

---

## 7. Technical Specifications

### Data Flow Architecture

```
SessionStorage → CandidateQueue → ReviewInterface → DecisionState → ResultsExport
                      ↓                  ↓               ↓
                 CandidateCard    SwipeHandler    StorageManager
                      ↓                  ↓               ↓
                 DetailDrawer     AnimationEngine  Analytics
```

### State Management Structure

```javascript
{
  queue: {
    candidates: [],      // Unreviewed candidates
    currentIndex: 0,     // Current position
    totalCount: 0        // Total candidates
  },
  decisions: {
    accepted: [],        // Accepted candidate IDs
    rejected: [],        // Rejected candidate IDs
    skipped: [],         // Skipped candidate IDs
    history: []          // Decision history for undo
  },
  ui: {
    detailsOpen: false,  // Drawer state
    batchMode: false,    // Multi-select mode
    filters: {},         // Active filters
    settings: {}         // User preferences
  },
  metrics: {
    startTime: null,     // Session start
    decisionsCount: 0,   // Total decisions
    averageTime: 0       // Avg time per decision
  }
}
```

### API Integration Points

```javascript
// Decision persistence
POST /api/review/decisions
{
  candidateId: string,
  decision: 'accept' | 'reject' | 'skip',
  timestamp: ISO8601,
  metadata: {}
}

// Batch operations
POST /api/review/batch
{
  candidateIds: string[],
  action: 'accept' | 'reject' | 'export',
  format: 'csv' | 'pdf' | 'json'
}

// Analytics tracking
POST /api/analytics/track
{
  event: string,
  properties: {},
  timestamp: ISO8601
}
```

### Component Props Interface

```typescript
interface CandidateCardProps {
  candidate: Candidate;
  onAccept: () => void;
  onReject: () => void;
  onSkip: () => void;
  onDetails: () => void;
  isActive: boolean;
  position: number;
}

interface SwipeContainerProps {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
  velocity?: number;
}

interface DecisionTrackerProps {
  decisions: DecisionState;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: string) => void;
}
```

---

## 8. Documentation Requirements

### User Documentation

1. **Quick Start Guide** - Single page visual guide
2. **Keyboard Shortcuts Reference** - Printable cheatsheet
3. **Mobile Gestures Tutorial** - Interactive onboarding
4. **FAQ** - Common questions and troubleshooting
5. **Video Tutorials** - 2-3 minute feature walkthroughs

### Technical Documentation

1. **Component API Reference** - Props, methods, events
2. **State Management Guide** - Data flow and updates
3. **Customization Guide** - Theming and configuration
4. **Performance Guide** - Optimization techniques
5. **Testing Guide** - Unit and integration tests

### Developer Onboarding

```markdown
## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Open http://localhost:3000/review

## Key Files

- `/app/review/page.jsx` - Main review interface
- `/app/review/components/*` - UI components
- `/app/review/hooks/*` - Custom React hooks
- `/app/review/utils/*` - Helper functions

## Testing

- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- Accessibility: `npm run test:a11y`
```

---

## 9. Appendices

### Appendix A: Competitive Analysis

| Feature                | TalentScreen | Workday | Greenhouse | Lever   |
| ---------------------- | ------------ | ------- | ---------- | ------- |
| Mobile swipe interface | ✅ Planned   | ❌      | ❌         | ❌      |
| Keyboard shortcuts     | ✅ Full      | Partial | Partial    | ✅      |
| AI summarization       | ✅           | ❌      | ❌         | Partial |
| Undo functionality     | ✅           | ❌      | ✅         | ✅      |
| Batch operations       | ✅           | ✅      | ✅         | ✅      |
| Real-time sync         | Planned      | ✅      | ✅         | ✅      |

### Appendix B: Gesture Reference

| Gesture     | Action  | Mobile  | Desktop     |
| ----------- | ------- | ------- | ----------- |
| Swipe Right | Accept  | ✅      | Mouse drag  |
| Swipe Left  | Reject  | ✅      | Mouse drag  |
| Swipe Up    | Details | ✅      | N/A         |
| Swipe Down  | Skip    | ✅      | N/A         |
| Tap         | Details | ✅      | Click       |
| Long Press  | Options | ✅      | Right-click |
| Pinch       | Zoom    | Planned | Ctrl+Scroll |

### Appendix C: Accessibility Checklist

- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation for all features
- [ ] Screen reader announcements
- [ ] Focus management
- [ ] Color contrast ratios (4.5:1 minimum)
- [ ] Reduced motion options
- [ ] Text scaling support
- [ ] High contrast mode
- [ ] Focus indicators
- [ ] Error messaging
- [ ] Alternative text for images
- [ ] Semantic HTML structure

### Appendix D: Performance Budget

| Metric        | Budget | Current | Target |
| ------------- | ------ | ------- | ------ |
| Bundle size   | 200KB  | N/A     | 150KB  |
| First Paint   | 1s     | N/A     | 0.8s   |
| Interactive   | 2s     | N/A     | 1.5s   |
| Animation FPS | 60     | N/A     | 60     |
| Memory usage  | 50MB   | N/A     | 40MB   |
| API response  | 200ms  | N/A     | 150ms  |

---

## Document History

| Version | Date     | Author       | Changes     |
| ------- | -------- | ------------ | ----------- |
| 1.0     | Dec 2024 | Product Team | Initial PRD |

---

**Next Steps**:

1. Review and approve PRD with stakeholders
2. Technical design review with engineering
3. Create detailed mockups and prototypes
4. Begin Phase 1 implementation
5. Set up user testing pipeline
