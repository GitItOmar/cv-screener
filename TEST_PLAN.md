# CV Screening Application - Test Plan

## Overview
This comprehensive test plan covers all critical scenarios to verify the CV screening application works correctly after removing debug logs. The application is built with Next.js 15 and allows bulk CV upload, AI-powered pre-screening, and swipe-based candidate review.

## Table of Contents
1. [Test Environment Setup](#test-environment-setup)
2. [Pre-Test Checklist](#pre-test-checklist)
3. [Functional Test Scenarios](#functional-test-scenarios)
4. [API Testing](#api-testing)
5. [Performance Testing](#performance-testing)
6. [Error Handling Tests](#error-handling-tests)
7. [UI/UX Testing](#ui-ux-testing)
8. [Regression Testing](#regression-testing)
9. [Test Execution Guide](#test-execution-guide)

## Test Environment Setup

### Prerequisites
- Node.js (v18+) and npm installed
- Git repository cloned locally
- Chrome/Firefox/Safari browser with DevTools
- Sample test files prepared:
  - Valid: PDF, DOC, DOCX, CSV, ZIP files (< 10MB)
  - Invalid: Large files (> 10MB), unsupported formats (.txt, .png)
  - Edge cases: Empty files, corrupted files

### Configuration
1. Copy `.env.example` to `.env`
2. Add OpenAI API key: `OPENAI_API_KEY=your_key_here`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Access application at: `http://localhost:3000`

## Pre-Test Checklist

- [ ] Run linting: `npm run lint`
- [ ] Check formatting: `npm run format:check`
- [ ] Build production: `npm run build`
- [ ] Clear browser cache and cookies
- [ ] Open browser DevTools Console (no errors should appear)
- [ ] Verify no console.log statements remain in codebase

## Functional Test Scenarios

### 1. Homepage Navigation

#### Test Case 1.1: Landing Page
**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify page loads without errors

**Expected Results:**
- Landing page displays with CVScreener branding
- Two main action buttons visible: "Upload CVs" and "Review Candidates"
- Navigation links functional
- No console errors in DevTools

### 2. Upload Module (`/upload`)

#### Test Case 2.1: Upload Page UI
**Steps:**
1. Click "Upload CVs" or navigate to `/upload`
2. Inspect page layout

**Expected Results:**
- Left panel shows 3-step process guide
- Right panel displays drag-drop zone
- GDPR consent checkbox present
- Upload button initially disabled

#### Test Case 2.2: GDPR Consent
**Steps:**
1. Try clicking upload without consent
2. Check GDPR consent checkbox
3. Verify upload button state

**Expected Results:**
- Upload disabled without consent
- Upload enabled after consent
- Checkbox state persists during session

#### Test Case 2.3: Single File Upload
**Steps:**
1. Check GDPR consent
2. Click "Add files" button
3. Select a valid PDF resume
4. Click "Start upload"

**Expected Results:**
- File appears in queue with "queued" status
- Progress bar shows during upload
- Status changes: queued → uploading → done
- Success toast notification appears

#### Test Case 2.4: Bulk File Upload
**Steps:**
1. Select 10-20 files at once
2. Monitor upload queue
3. Check final statistics

**Expected Results:**
- All files queued simultaneously
- Parallel uploads (observe multiple "uploading" states)
- Statistics show X succeeded, Y failed
- Individual progress bars for each file

#### Test Case 2.5: Drag and Drop
**Steps:**
1. Drag files over drop zone
2. Release files in zone
3. Drag files outside and release

**Expected Results:**
- Drop zone highlights on drag enter
- Border color changes (blue when hovering)
- Files accepted when dropped in zone
- No action when dropped outside

#### Test Case 2.6: File Type Validation
**Steps:**
1. Try uploading each file type:
   - Valid: .pdf, .doc, .docx, .csv, .zip
   - Invalid: .txt, .png, .jpg, .exe

**Expected Results:**
- Valid types: Added to queue
- Invalid types: Error message "Unsupported file type"
- Clear indication of supported formats

#### Test Case 2.7: File Size Validation
**Steps:**
1. Upload file exactly 10MB
2. Upload file 10.1MB
3. Upload multiple files totaling > 10MB

**Expected Results:**
- 10MB file: Accepted
- 10.1MB file: Rejected with "File too large" message
- Multiple files: Each validated individually

#### Test Case 2.8: Duplicate File Detection
**Steps:**
1. Upload a file
2. Try uploading the same file again

**Expected Results:**
- Warning about duplicate file
- Option to proceed or cancel
- Both files process if user proceeds

### 3. File Processing & AI Extraction

#### Test Case 3.1: PDF Processing
**Steps:**
1. Upload a PDF resume
2. Monitor network tab for API calls
3. Check response structure

**Expected Results:**
- File converts to text successfully
- API call to `/api/upload` returns 200
- Response contains extracted data:
  ```json
  {
    "success": true,
    "fileInfo": {...},
    "extractedData": {
      "positionAppliedFor": {...},
      "selfEvaluation": {...},
      "skillsAndSpecialties": {...},
      "workExperience": [...],
      "basicInformation": {...},
      "educationBackground": {...}
    }
  }
  ```

#### Test Case 3.2: DOCX Processing
**Steps:**
1. Upload a DOCX resume
2. Verify extraction quality

**Expected Results:**
- Formatting preserved in extraction
- Tables and lists parsed correctly
- Special characters handled properly

#### Test Case 3.3: CSV Batch Processing
**Steps:**
1. Upload CSV with multiple candidates
2. Check parsing results

**Expected Results:**
- Each row processed as separate candidate
- Column headers mapped correctly
- Delimiter detection works (comma, tab, semicolon)

#### Test Case 3.4: ZIP Archive Processing
**Steps:**
1. Upload ZIP containing multiple resumes
2. Monitor extraction progress

**Expected Results:**
- ZIP extracted successfully
- Each file inside processed individually
- Nested folders handled if present
- Non-resume files skipped

### 4. Review Module (`/review`)

#### Test Case 4.1: Review Interface
**Steps:**
1. Navigate to `/review`
2. Verify interface elements

**Expected Results:**
- Candidate card displayed centrally
- Accept/Reject buttons visible
- Keyboard shortcuts legend shown
- Progress counter (1/N candidates)

#### Test Case 4.2: Swipe Actions (Mouse)
**Steps:**
1. Click "Reject" button
2. Click "Accept" button
3. Use swipe gestures on mobile

**Expected Results:**
- Card animates left on reject
- Card animates right on accept
- Next candidate loads automatically
- Counter updates

#### Test Case 4.3: Keyboard Navigation
**Steps:**
1. Press Left Arrow (←)
2. Press Right Arrow (→)
3. Press 'S' key
4. Press 'U' key

**Expected Results:**
- ← : Rejects candidate
- → : Accepts candidate
- S : Skips to next candidate
- U : Undoes last action

#### Test Case 4.4: Undo Functionality
**Steps:**
1. Accept/reject 5 candidates
2. Press 'U' multiple times
3. Verify history restoration

**Expected Results:**
- Each undo restores previous candidate
- Maximum 10 undos in history
- Cannot undo beyond first candidate

#### Test Case 4.5: Candidate Details View
**Steps:**
1. Click on candidate card
2. Review expanded information
3. Close details view

**Expected Results:**
- Modal/drawer shows full resume details
- All extracted fields displayed
- Skills highlighted
- Close button returns to swipe view

#### Test Case 4.6: Filtering & Sorting
**Steps:**
1. Apply skill filter (e.g., "Python")
2. Set experience level filter
3. Change sort order

**Expected Results:**
- Only matching candidates shown
- Filter counts update
- Sort applies immediately
- Filters persist during session

### 5. API Testing

#### Test Case 5.1: Upload Endpoint
**Endpoint:** `POST /api/upload`

**Test with cURL:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-resume.pdf" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "fileInfo": {
    "name": "test-resume.pdf",
    "size": 102400,
    "type": "application/pdf",
    "extension": "pdf"
  },
  "processing": {
    "success": true,
    "processingTime": 2341
  },
  "extractedData": {...}
}
```

#### Test Case 5.2: Error Responses
**Scenarios:**
1. No file provided
2. Invalid file type
3. File too large
4. Corrupted file

**Expected Status Codes:**
- No file: 400 Bad Request
- Invalid type: 400 Bad Request
- Too large: 400 Bad Request
- Corrupted: 200 with processing.success: false

### 6. Performance Testing

#### Test Case 6.1: Large Batch Upload
**Steps:**
1. Select 50+ files
2. Start upload
3. Monitor performance

**Metrics to Track:**
- Time to queue all files
- Memory usage in browser
- Network throughput
- UI responsiveness

**Expected Results:**
- UI remains responsive
- Memory usage < 500MB
- No browser freezing
- Progress updates smoothly

#### Test Case 6.2: Concurrent Operations
**Steps:**
1. Start uploading 20 files
2. Navigate to review page
3. Return to upload page

**Expected Results:**
- Uploads continue in background
- Progress maintained on return
- No duplicate uploads triggered

#### Test Case 6.3: Text Extraction Performance
**Test Different File Sizes:**
- Small (< 100KB): < 1 second
- Medium (100KB-1MB): < 3 seconds
- Large (1MB-10MB): < 10 seconds

### 7. Error Handling Tests

#### Test Case 7.1: Network Interruption
**Steps:**
1. Start upload
2. Disable network (DevTools)
3. Re-enable network

**Expected Results:**
- Failed uploads marked with error
- Clear error message displayed
- Option to retry failed uploads
- Successful uploads unaffected

#### Test Case 7.2: Invalid API Key
**Steps:**
1. Set invalid OpenAI API key
2. Upload a file
3. Check error handling

**Expected Results:**
- Upload succeeds
- Processing fails gracefully
- User-friendly error message
- Partial data still saved

#### Test Case 7.3: Corrupted Files
**Steps:**
1. Upload corrupted PDF
2. Upload empty file
3. Upload password-protected file

**Expected Results:**
- Corrupted: "File corrupted" error
- Empty: "No content found" error
- Protected: "Password-protected" error
- Other files continue processing

#### Test Case 7.4: Rate Limiting
**Steps:**
1. Upload 100+ files rapidly
2. Monitor API responses

**Expected Results:**
- Rate limiting applied (60 req/min)
- Queued appropriately
- Retry logic activates
- No data loss

### 8. UI/UX Testing

#### Test Case 8.1: Responsive Design
**Test Breakpoints:**
1. Mobile (< 640px)
2. Tablet (640px - 1024px)
3. Desktop (> 1024px)

**Expected Results:**
- Mobile: Stack layout, drawer for details
- Tablet: Adjusted spacing, readable text
- Desktop: Side-by-side panels
- All functions accessible at all sizes

#### Test Case 8.2: Toast Notifications
**Trigger Scenarios:**
1. Successful upload
2. Failed upload
3. Validation error
4. Network error

**Expected Results:**
- Appropriate toast type (success/error/warning)
- Auto-dismiss after 5 seconds
- Manual dismiss available
- Multiple toasts stack properly

#### Test Case 8.3: Loading States
**Test Components:**
1. File upload progress
2. AI processing indicator
3. Page transitions

**Expected Results:**
- Progress bars accurate
- Spinners during processing
- Skeleton screens where appropriate
- No layout shift

#### Test Case 8.4: Accessibility
**Test Requirements:**
1. Keyboard navigation
2. Screen reader compatibility
3. Color contrast
4. Focus indicators

**Expected Results:**
- All interactive elements keyboard accessible
- ARIA labels present
- WCAG AA contrast ratios
- Visible focus indicators

## Regression Testing

### Post Debug Log Removal Checklist
- [ ] No console.log statements in browser console
- [ ] No console.debug statements in browser console
- [ ] No console.warn statements (except legitimate warnings)
- [ ] No console.error statements (except actual errors)
- [ ] All async operations complete successfully
- [ ] Error messages still display to users
- [ ] File processing pipeline works end-to-end
- [ ] API responses return expected data
- [ ] UI updates reflect state changes
- [ ] No undefined or null reference errors

## Test Execution Guide

### Setup
1. Clear all browser data
2. Reset database/storage if applicable
3. Ensure clean git working directory
4. Start with fresh `npm install`

### Execution Order
1. **Smoke Tests**: Basic navigation and page loads
2. **Functional Tests**: Feature by feature validation
3. **Integration Tests**: End-to-end workflows
4. **Performance Tests**: Load and stress testing
5. **Regression Tests**: Debug log verification

### Test Recording
For each test:
- Test ID
- Date/Time
- Tester name
- Pass/Fail status
- Screenshots of failures
- Console errors (if any)
- Performance metrics

### Issue Reporting Template
```markdown
**Test Case ID:** [e.g., 2.3]
**Description:** [Brief description]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected Result:** [What should happen]
**Actual Result:** [What actually happened]
**Screenshot:** [Attach if applicable]
**Console Output:** [Any errors]
**Environment:** [Browser, OS]
**Severity:** [Critical/Major/Minor]
```

## Success Criteria

### All Tests Pass When:
- ✅ 100% of smoke tests pass
- ✅ 95%+ of functional tests pass
- ✅ No critical bugs found
- ✅ No console debug statements appear
- ✅ Performance benchmarks met
- ✅ Build and lint succeed without errors
- ✅ All user-facing features functional

### Performance Benchmarks:
- Page load: < 3 seconds
- File upload start: < 1 second
- AI processing: < 10 seconds per file
- UI interactions: < 100ms response
- Memory usage: < 500MB

## Test Automation Recommendations

### Future Improvements:
1. Add Jest unit tests for utility functions
2. Implement Cypress E2E tests for critical paths
3. Add Playwright for cross-browser testing
4. Set up CI/CD pipeline with automated tests
5. Implement performance monitoring

### Priority Test Cases for Automation:
1. File upload and validation
2. API endpoint responses
3. Keyboard navigation
4. Error handling scenarios
5. Responsive design breakpoints

---

## Appendix

### Sample Test Files
Create these files for testing:
- `valid-resume.pdf` - Standard PDF resume
- `valid-resume.docx` - Word document resume
- `batch-candidates.csv` - CSV with 10+ rows
- `multiple-resumes.zip` - ZIP with 5 PDFs
- `large-file.pdf` - 11MB file
- `corrupted.pdf` - Intentionally corrupted
- `empty.pdf` - Valid PDF, no content
- `protected.pdf` - Password-protected PDF

### Browser DevTools Commands
```javascript
// Check for console statements
console.log = console.debug = console.warn = console.error = function() {
  alert('Console statement detected!');
};

// Monitor network requests
window.addEventListener('fetch', (e) => console.log('Fetch:', e.request.url));

// Check memory usage
console.log('Memory:', performance.memory.usedJSHeapSize / 1048576, 'MB');
```

### Useful Testing URLs
- Development: `http://localhost:3000`
- Upload: `http://localhost:3000/upload`
- Review: `http://localhost:3000/review`
- API: `http://localhost:3000/api/upload`

---

**Document Version:** 1.0
**Last Updated:** 2025-08-20
**Next Review:** After first test cycle completion