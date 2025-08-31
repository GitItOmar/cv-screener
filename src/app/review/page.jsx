'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, Undo2 } from 'lucide-react';
import CandidateCard from './components/CandidateCard';
import CandidateCardSkeleton from './components/CandidateCardSkeleton';
import SwipeContainer from './components/SwipeContainer';
import KeyboardHints from './components/KeyboardHints';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import toast from 'react-hot-toast';

export default function ReviewPage() {
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [decisionHistory, setDecisionHistory] = useState([]);
  const [showBulkUndo, setShowBulkUndo] = useState(false);

  // Close bulk undo dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBulkUndo && !event.target.closest('.bulk-undo-container')) {
        setShowBulkUndo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBulkUndo]);

  // Initialize candidates from sessionStorage
  useEffect(() => {
    const loadCandidates = () => {
      if (typeof window !== 'undefined') {
        const storedCandidates = window.sessionStorage.getItem('processedCandidates');

        if (storedCandidates) {
          try {
            const processedCandidates = JSON.parse(storedCandidates);

            if (processedCandidates.length > 0) {
              setCandidates(processedCandidates);
              setLoading(false);
              return;
            }
          } catch {
            // Silent error - will show no candidates message
          }
        }
      }

      // No candidates available
      setLoading(false);
    };

    loadCandidates();
  }, []);

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Current candidate
  const currentCandidate = candidates[currentIndex];

  // Enhanced decision tracking with full metadata
  const recordDecision = (decision, candidateIndex, method = 'unknown') => {
    const candidate = candidates[candidateIndex];
    const newDecision = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      decision,
      candidateIndex,
      candidateId: candidate?.id || candidateIndex,
      candidateName: candidate?.extractedData?.basicInformation?.fullName || 'Unknown',
      previousIndex: currentIndex,
      timestamp: Date.now(),
      method, // 'swipe', 'keyboard', 'button'
      metadata: {
        score: candidate?.evaluation?.overall?.finalPercentage || 0,
        recommendation: candidate?.summarization?.summary?.overall_recommendation,
      },
    };
    setDecisionHistory((prev) => [...prev.slice(-49), newDecision]); // Keep last 50
  };

  // Enhanced navigation with decision tracking
  const handleAccept = (method = 'button') => {
    recordDecision('accept', currentIndex, method);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Accepted candidate:',
        currentCandidate?.extractedData?.basicInformation?.fullName,
      );
    }
    goToNext();
  };

  const handleReject = (method = 'button') => {
    recordDecision('reject', currentIndex, method);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Rejected candidate:',
        currentCandidate?.extractedData?.basicInformation?.fullName,
      );
    }
    goToNext();
  };

  // Swipe gesture handlers
  const handleSwipeLeft = () => {
    if (!isPaused) {
      handleReject('swipe');
    }
  };

  const handleSwipeRight = () => {
    if (!isPaused) {
      handleAccept('swipe');
    }
  };

  const handleSwipeUp = () => {
    // Show details
    setShowDetails(true);
  };

  // Enhanced undo functionality with toast notification
  const handleUndo = () => {
    if (decisionHistory.length === 0) {
      toast.error('No actions to undo');
      return;
    }

    const lastDecision = decisionHistory[decisionHistory.length - 1];
    setDecisionHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(lastDecision.candidateIndex);

    // Show toast notification with action details
    const actionText =
      lastDecision.decision.charAt(0).toUpperCase() + lastDecision.decision.slice(1);
    toast.success(`Undid ${actionText} for ${lastDecision.candidateName}`, {
      duration: 3000,
      icon: '↶',
      style: {
        background: '#10b981',
        color: 'white',
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Undid decision:', lastDecision);
    }
  };

  // Bulk undo functionality
  const handleBulkUndo = (count = 1) => {
    if (decisionHistory.length === 0) {
      toast.error('No actions to undo');
      return;
    }

    const undoCount = Math.min(count, decisionHistory.length);
    const undoDecisions = decisionHistory.slice(-undoCount);
    const firstDecision = undoDecisions[0];

    setDecisionHistory((prev) => prev.slice(0, -undoCount));
    setCurrentIndex(firstDecision.candidateIndex);

    // Show bulk undo notification
    toast.success(`Undid last ${undoCount} action${undoCount > 1 ? 's' : ''}`, {
      duration: 4000,
      icon: '↶',
      style: {
        background: '#10b981',
        color: 'white',
      },
    });
  };

  // Skip functionality
  const handleSkip = (method = 'keyboard') => {
    recordDecision('skip', currentIndex, method);
    goToNext();
  };

  // Pause/Resume functionality
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAccept: (method) => !isPaused && handleAccept(method),
    onReject: (method) => !isPaused && handleReject(method),
    onDetails: () => setShowDetails(!showDetails),
    onSkip: (method) => !isPaused && handleSkip(method),
    onUndo: handleUndo,
    onPause: handlePauseResume,
    enabled: !loading && candidates.length > 0,
    detailsOpen: showDetails,
  });

  // Loading state
  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
        <div className='container mx-auto px-4 py-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Candidate Review</h1>
            <p className='text-gray-600 dark:text-gray-300 mt-2'>Loading candidates...</p>
          </div>
          <CandidateCardSkeleton />
        </div>
      </div>
    );
  }

  // No candidates state
  if (candidates.length === 0) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
        <div className='container mx-auto px-4 py-8'>
          <div className='text-center py-12'>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-4'>
              No Candidates to Review
            </h1>
            <p className='text-gray-600 dark:text-gray-300 mb-8'>
              Upload CVs to start the AI evaluation process
            </p>
            <Link href='/upload'>
              <Button size='lg'>Upload CVs</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main review interface
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Candidate Review</h1>
              <p className='text-gray-600 dark:text-gray-300 mt-2'>
                Review and make decisions on candidates
              </p>
            </div>
            <Link href='/upload'>
              <Button variant='outline'>Upload More CVs</Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className='max-w-4xl mx-auto'>
          {/* Card Display */}
          <div className='mb-8'>
            <SwipeContainer
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              disabled={candidates.length <= 1 || isPaused}
              threshold={50}
              className='h-auto'
            >
              <CandidateCard
                candidate={currentCandidate}
                index={currentIndex}
                total={candidates.length}
              />
            </SwipeContainer>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-center items-center space-x-4 mb-8'>
            <Button
              variant='outline'
              size='lg'
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className='w-32'
            >
              <ChevronLeft className='mr-2 h-4 w-4' />
              Previous
            </Button>

            {/* Prominent Undo Button with Bulk Options */}
            <div className='relative bulk-undo-container'>
              <div className='flex'>
                <Button
                  variant='secondary'
                  size='lg'
                  onClick={handleUndo}
                  disabled={decisionHistory.length === 0}
                  className={`rounded-r-none w-28 transition-all ${
                    decisionHistory.length > 0
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300'
                      : ''
                  }`}
                >
                  <Undo2 className='mr-2 h-4 w-4' />
                  Undo
                </Button>
                <Button
                  variant='secondary'
                  size='lg'
                  onClick={() => setShowBulkUndo(!showBulkUndo)}
                  disabled={decisionHistory.length === 0}
                  className={`rounded-l-none w-4 border-l-0 transition-all ${
                    decisionHistory.length > 0
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300'
                      : ''
                  }`}
                >
                  ▼
                </Button>
              </div>

              {/* Bulk Undo Dropdown */}
              {showBulkUndo && decisionHistory.length > 0 && (
                <div className='absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48'>
                  <button
                    type='button'
                    onClick={() => {
                      handleBulkUndo(3);
                      setShowBulkUndo(false);
                    }}
                    disabled={decisionHistory.length < 3}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Undo last 3 actions
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      handleBulkUndo(5);
                      setShowBulkUndo(false);
                    }}
                    disabled={decisionHistory.length < 5}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Undo last 5 actions
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      handleBulkUndo(10);
                      setShowBulkUndo(false);
                    }}
                    disabled={decisionHistory.length < 10}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Undo last 10 actions
                  </button>
                  <div className='border-t border-gray-200 my-1' />
                  <button
                    type='button'
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to undo all ${decisionHistory.length} actions?`,
                        )
                      ) {
                        handleBulkUndo(decisionHistory.length);
                        setShowBulkUndo(false);
                      }
                    }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-600'
                  >
                    Undo all {decisionHistory.length} actions
                  </button>
                </div>
              )}
            </div>

            <Button variant='default' size='lg' onClick={toggleDetails} className='w-32'>
              <Eye className='mr-2 h-4 w-4' />
              Details
            </Button>

            <Button
              variant='outline'
              size='lg'
              onClick={goToNext}
              disabled={currentIndex === candidates.length - 1}
              className='w-32'
            >
              Next
              <ChevronRight className='ml-2 h-4 w-4' />
            </Button>
          </div>

          {/* Status and Controls */}
          <div className='text-center text-sm text-gray-500 dark:text-gray-400 space-y-2'>
            {isPaused && (
              <div className='text-orange-600 font-medium'>
                Review Paused - Press Space to Resume
              </div>
            )}
            {decisionHistory.length > 0 && (
              <div className='text-blue-600 space-x-4'>
                <span>Press U or Cmd+Z to undo last action</span>
                <span className='text-xs'>({decisionHistory.length} actions in history)</span>
              </div>
            )}

            {/* Decision Summary */}
            {decisionHistory.length > 0 && (
              <div className='flex justify-center space-x-4 text-xs'>
                <span className='text-green-600'>
                  Accepted: {decisionHistory.filter((d) => d.decision === 'accept').length}
                </span>
                <span className='text-red-600'>
                  Rejected: {decisionHistory.filter((d) => d.decision === 'reject').length}
                </span>
                <span className='text-yellow-600'>
                  Skipped: {decisionHistory.filter((d) => d.decision === 'skip').length}
                </span>
              </div>
            )}

            <p>Use arrow keys: ← Reject • → Accept • ↑ Details • ↓ Skip</p>
          </div>

          {/* Temporary Details View */}
          {showDetails && currentCandidate && (
            <div className='mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              <h2 className='text-2xl font-bold mb-4'>Detailed Information</h2>
              <div className='space-y-4'>
                <div>
                  <h3 className='font-semibold text-lg mb-2'>Work Experience</h3>
                  <div className='space-y-2'>
                    {currentCandidate.extractedData?.workExperience?.map((job, idx) => (
                      <div key={`job-${idx}`} className='p-3 bg-gray-50 dark:bg-gray-700 rounded'>
                        <p className='font-medium'>
                          {job.position} at {job.company}
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          {job.duration || `${job.startDate} - ${job.endDate}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className='font-semibold text-lg mb-2'>Education</h3>
                  <div className='space-y-2'>
                    {currentCandidate.extractedData?.educationBackground?.degrees?.map(
                      (edu, idx) => (
                        <div key={`edu-${idx}`} className='p-3 bg-gray-50 dark:bg-gray-700 rounded'>
                          <p className='font-medium'>
                            {edu.type} in {edu.field}
                          </p>
                          <p className='text-sm text-gray-600 dark:text-gray-300'>
                            {edu.institution} - {edu.graduationYear}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <h3 className='font-semibold text-lg mb-2'>All Skills</h3>
                  <div className='space-y-2'>
                    {currentCandidate.extractedData?.skillsAndSpecialties?.technical && (
                      <div>
                        <p className='font-medium text-sm'>Technical Skills:</p>
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          {currentCandidate.extractedData.skillsAndSpecialties.technical.join(', ')}
                        </p>
                      </div>
                    )}
                    {currentCandidate.extractedData?.skillsAndSpecialties?.frameworks && (
                      <div>
                        <p className='font-medium text-sm'>Frameworks:</p>
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          {currentCandidate.extractedData.skillsAndSpecialties.frameworks.join(
                            ', ',
                          )}
                        </p>
                      </div>
                    )}
                    {currentCandidate.extractedData?.skillsAndSpecialties?.tools && (
                      <div>
                        <p className='font-medium text-sm'>Tools:</p>
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          {currentCandidate.extractedData.skillsAndSpecialties.tools.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Analysis */}
                {currentCandidate.summarization?.summary && (
                  <div>
                    <h3 className='font-semibold text-lg mb-2'>AI Analysis</h3>
                    <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded space-y-2'>
                      <p className='text-sm'>
                        <span className='font-medium'>Consensus:</span>{' '}
                        {currentCandidate.summarization.summary.consensus_reasoning}
                      </p>
                      {currentCandidate.summarization.recommendations?.interview_focus && (
                        <div>
                          <p className='font-medium text-sm'>Interview Focus Areas:</p>
                          <ul className='list-disc list-inside text-sm text-gray-600 dark:text-gray-300'>
                            {currentCandidate.summarization.recommendations.interview_focus.map(
                              (focus, idx) => (
                                <li key={`focus-${idx}`}>{focus}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={toggleDetails} className='mt-4'>
                Close Details
              </Button>
            </div>
          )}
        </div>

        {/* Keyboard Hints for Desktop */}
        <KeyboardHints
          show={!loading && candidates.length > 0}
          canUndo={decisionHistory.length > 0}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
}
