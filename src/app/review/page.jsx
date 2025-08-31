'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import CandidateCard from './components/CandidateCard';
import CandidateCardSkeleton from './components/CandidateCardSkeleton';
import SwipeContainer from './components/SwipeContainer';

export default function ReviewPage() {
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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

  // Swipe gesture handlers
  const handleSwipeLeft = () => {
    // Reject candidate (move to next)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Rejected candidate:',
        currentCandidate?.extractedData?.basicInformation?.fullName,
      );
    }
    goToNext();
  };

  const handleSwipeRight = () => {
    // Accept candidate (move to next)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Accepted candidate:',
        currentCandidate?.extractedData?.basicInformation?.fullName,
      );
    }
    goToNext();
  };

  const handleSwipeUp = () => {
    // Show details
    setShowDetails(true);
  };

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
              disabled={candidates.length <= 1}
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

          {/* Keyboard Shortcuts Hint */}
          <div className='text-center text-sm text-gray-500 dark:text-gray-400'>
            <p>Use arrow keys to navigate • Press D for details</p>
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
      </div>
    </div>
  );
}
