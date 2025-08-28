'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Undo2,
  SkipForward,
  Upload,
  FileText,
  User,
  MapPin,
  Calendar,
  Star,
  Trophy,
  Briefcase,
  StickyNote,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { adaptCandidatesForUI } from './utils/candidateAdapter';

const getScoreBadge = (score) => {
  if (score >= 90) return { label: 'Excellent', variant: 'default', color: 'bg-green-500' };
  if (score >= 75) return { label: 'Good', variant: 'secondary', color: 'bg-blue-500' };
  return { label: 'Borderline', variant: 'outline', color: 'bg-yellow-500' };
};

function CandidateDetails({ candidate }) {
  const hasEvaluation = candidate?.evaluation?.categories;

  return (
    <Tabs defaultValue='overview' className='w-full'>
      <TabsList className={`grid w-full ${hasEvaluation ? 'grid-cols-5' : 'grid-cols-4'}`}>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='skills'>Skills</TabsTrigger>
        <TabsTrigger value='experience'>Experience</TabsTrigger>
        {hasEvaluation && <TabsTrigger value='evaluation'>Evaluation</TabsTrigger>}
        <TabsTrigger value='notes'>Notes</TabsTrigger>
      </TabsList>

      <TabsContent value='overview' className='space-y-4'>
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <User className='w-4 h-4 text-gray-500' />
            <span className='font-medium'>{candidate.name}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Briefcase className='w-4 h-4 text-gray-500' />
            <span>{candidate.role}</span>
          </div>
          <div className='flex items-center gap-2'>
            <MapPin className='w-4 h-4 text-gray-500' />
            <span>{candidate.location}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Calendar className='w-4 h-4 text-gray-500' />
            <span>{candidate.years} years experience</span>
          </div>
        </div>

        <div className='space-y-2'>
          <h4 className='font-medium'>AI Score</h4>
          <div className='flex items-center gap-3'>
            <Progress value={candidate.score} className='flex-1' />
            <Badge variant={getScoreBadge(candidate.score).variant}>
              {candidate.score}% {getScoreBadge(candidate.score).label}
            </Badge>
          </div>
        </div>
      </TabsContent>

      <TabsContent value='skills' className='space-y-4'>
        <div>
          <h4 className='font-medium mb-2'>Matched Skills</h4>
          <div className='flex flex-wrap gap-2'>
            {candidate.matchedSkills.map((skill) => (
              <Badge key={skill} variant='default'>
                {skill}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className='font-medium mb-2'>Other Skills</h4>
          <div className='flex flex-wrap gap-2'>
            {candidate.otherSkills.map((skill) => (
              <Badge key={skill} variant='outline'>
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value='experience' className='space-y-4'>
        <div>
          <h4 className='font-medium mb-3 flex items-center gap-2'>
            <Trophy className='w-4 h-4' />
            Key Achievements
          </h4>
          <ul className='space-y-2'>
            {candidate.achievements.map((achievement) => (
              <li key={achievement} className='flex items-start gap-2'>
                <Star className='w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0' />
                <span className='text-sm'>{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>

      {hasEvaluation && (
        <TabsContent value='evaluation' className='space-y-4'>
          {candidate.evaluationError ? (
            <div className='text-center py-8'>
              <AlertCircle className='w-8 h-8 mx-auto mb-2 text-amber-500' />
              <p className='text-gray-600 mb-2'>Evaluation Failed</p>
              <p className='text-sm text-gray-500'>{candidate.evaluationError}</p>
              <p className='text-xs text-gray-400 mt-4'>
                You can still review this candidate based on their CV content
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Overall Score */}
              <div className='space-y-2'>
                <h4 className='font-medium'>Overall Score</h4>
                <div className='flex items-center gap-3'>
                  <Progress value={candidate.score} className='flex-1' />
                  <Badge variant={getScoreBadge(candidate.score).variant}>{candidate.score}%</Badge>
                </div>
                {candidate.evaluation.summary?.recommendation && (
                  <p className='text-sm text-gray-600'>
                    Recommendation:{' '}
                    <span className='font-medium capitalize'>
                      {candidate.evaluation.summary.recommendation.replace('_', ' ')}
                    </span>
                  </p>
                )}
              </div>

              {/* Category Scores */}
              <div className='space-y-3'>
                <h4 className='font-medium'>Category Breakdown</h4>
                {Object.entries(candidate.evaluation.categories).map(([category, categoryData]) => (
                  <div key={category} className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium capitalize'>
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className='text-sm text-gray-600'>
                        {categoryData.score}/{categoryData.maxScore} points
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Progress value={categoryData.percentage} className='flex-1' />
                      <Badge variant='outline' className='min-w-[50px] text-center'>
                        {categoryData.percentage}%
                      </Badge>
                    </div>
                    {categoryData.reasoning && (
                      <p className='text-xs text-gray-600 italic'>{categoryData.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Strengths and Improvements */}
              {candidate.evaluation.summary && (
                <div className='grid grid-cols-2 gap-4'>
                  {candidate.evaluation.summary.strengths && (
                    <div className='space-y-2'>
                      <h5 className='text-sm font-medium text-green-700'>Strongest Area</h5>
                      <p className='text-xs text-gray-600'>
                        {candidate.evaluation.summary.strengths.category}:{' '}
                        {candidate.evaluation.summary.strengths.score}%
                      </p>
                    </div>
                  )}
                  {candidate.evaluation.summary.improvements && (
                    <div className='space-y-2'>
                      <h5 className='text-sm font-medium text-amber-700'>Needs Improvement</h5>
                      <p className='text-xs text-gray-600'>
                        {candidate.evaluation.summary.improvements.category}:{' '}
                        {candidate.evaluation.summary.improvements.score}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      )}

      <TabsContent value='notes' className='space-y-4'>
        <div className='text-center text-gray-500 py-8'>
          <StickyNote className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p>No notes yet</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function ReviewPage() {
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shortlisted, setShortlisted] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [seniorityFilter, setSeniorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [minScore, setMinScore] = useState([0]);
  const [developerOnly, setDeveloperOnly] = useState(false);

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initialize candidates from sessionStorage
  useEffect(() => {
    const loadCandidates = () => {
      // Try to load processed candidates from sessionStorage
      if (typeof window !== 'undefined') {
        const storedCandidates = window.sessionStorage.getItem('processedCandidates');

        if (storedCandidates) {
          try {
            const processedCandidates = JSON.parse(storedCandidates);
            const adaptedCandidates = adaptCandidatesForUI(processedCandidates);

            if (adaptedCandidates.length > 0) {
              setCandidates(adaptedCandidates);
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

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    if (roleFilter !== 'all' && !candidate.role.toLowerCase().includes(roleFilter.toLowerCase()))
      return false;
    if (seniorityFilter !== 'all') {
      const isSenior = candidate.years >= 5;
      if (seniorityFilter === 'senior' && !isSenior) return false;
      if (seniorityFilter === 'junior' && isSenior) return false;
    }
    if (locationFilter && !candidate.location.toLowerCase().includes(locationFilter.toLowerCase()))
      return false;
    if (candidate.score < minScore[0]) return false;
    if (developerOnly && !candidate.role.toLowerCase().includes('developer')) return false;
    return true;
  });

  const currentCandidate = filteredCandidates[currentIndex];
  const totalCandidates = filteredCandidates.length;
  const reviewedCount = shortlisted.length + rejected.length;

  const { toast } = useToast();

  const handleReject = useCallback(() => {
    if (!currentCandidate) return;

    setRejected((prev) => [...prev, currentCandidate]);
    setHistory((prev) => [
      ...prev,
      { action: 'reject', candidate: currentCandidate, index: currentIndex },
    ]);

    if (currentIndex < filteredCandidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowConfetti(true);
    }

    toast({ description: `${currentCandidate.name} rejected` });
  }, [currentCandidate, currentIndex, filteredCandidates.length, toast]);

  const handleShortlist = useCallback(() => {
    if (!currentCandidate) return;

    setShortlisted((prev) => [...prev, currentCandidate]);
    setHistory((prev) => [
      ...prev,
      { action: 'shortlist', candidate: currentCandidate, index: currentIndex },
    ]);

    if (currentIndex < filteredCandidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowConfetti(true);
    }

    toast({ description: `${currentCandidate.name} shortlisted` });
  }, [currentCandidate, currentIndex, filteredCandidates.length, toast]);

  const handleSkip = useCallback(() => {
    if (!currentCandidate) return;

    if (currentIndex < filteredCandidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }

    toast({ description: `Skipped ${currentCandidate.name}` });
  }, [currentCandidate, currentIndex, filteredCandidates.length, toast]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    if (lastAction.action === 'reject') {
      setRejected((prev) => prev.filter((c) => c.id !== lastAction.candidate.id));
    } else if (lastAction.action === 'shortlist') {
      setShortlisted((prev) => prev.filter((c) => c.id !== lastAction.candidate.id));
    }

    setCurrentIndex(lastAction.index);
    setShowConfetti(false);

    toast({ description: `Undid action for ${lastAction.candidate.name}` });
  }, [history, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
          handleReject();
          break;
        case 'ArrowRight':
          handleShortlist();
          break;
        case 'u':
        case 'U':
          handleUndo();
          break;
        case 's':
        case 'S':
          handleSkip();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCandidate, handleReject, handleShortlist, handleUndo, handleSkip]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          <div className='flex items-center justify-between mb-8'>
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-10 w-32' />
          </div>
          <div className='flex gap-4 mb-8'>
            {['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4', 'skeleton-5'].map(
              (skeletonId) => (
                <Skeleton key={skeletonId} className='h-10 w-32' />
              ),
            )}
          </div>
          <div className='flex gap-8'>
            <div className='flex-1'>
              <Skeleton className='h-96 w-full' />
            </div>
            <div className='w-80 hidden lg:block'>
              <Skeleton className='h-96 w-full' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showConfetti || (!currentCandidate && totalCandidates > 0)) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center space-y-6'>
          <div className='text-6xl'>🎉</div>
          <h1 className='text-3xl font-bold'>All Done!</h1>
          <p className='text-gray-600'>You&apos;ve reviewed all {totalCandidates} candidates</p>
          <div className='flex gap-4 justify-center'>
            <Button size='lg'>Export Shortlist ({shortlisted.length})</Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='/upload'>Back to Upload</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (totalCandidates === 0 && !loading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center gap-4'>
              <h1 className='text-2xl font-bold'>TalentScreen</h1>
              <Badge variant='secondary'>AI Evaluation</Badge>
              <span className='text-gray-600'>0 candidates</span>
            </div>
            <Button variant='outline' asChild>
              <Link href='/upload'>
                <Upload className='w-4 h-4 mr-2' />
                Upload CVs
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className='flex flex-wrap gap-4 mb-8'>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All Roles' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Roles</SelectItem>
                <SelectItem value='frontend'>Frontend Developer</SelectItem>
                <SelectItem value='backend'>Backend Developer</SelectItem>
                <SelectItem value='fullstack'>Full Stack Developer</SelectItem>
                <SelectItem value='mobile'>Mobile Developer</SelectItem>
                <SelectItem value='devops'>DevOps Engineer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All Levels' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Levels</SelectItem>
                <SelectItem value='junior'>Junior (0-4 years)</SelectItem>
                <SelectItem value='senior'>Senior (5+ years)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder='Location...'
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className='w-48'
            />

            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>Min Score:</span>
              <Slider
                value={minScore}
                onValueChange={setMinScore}
                max={100}
                step={5}
                className='w-32'
              />
              <span className='text-sm font-medium w-8'>{minScore[0]}</span>
            </div>

            <Button
              variant={developerOnly ? 'default' : 'outline'}
              onClick={() => setDeveloperOnly(!developerOnly)}
            >
              Developer Only
            </Button>
          </div>

          {/* Empty State */}
          <div className='flex items-center justify-center h-96'>
            <div className='text-center space-y-4'>
              <div className='text-4xl text-gray-300'>📋</div>
              <h2 className='text-xl font-semibold text-gray-600'>No candidates to review</h2>
              <p className='text-gray-500'>Upload CVs to start the AI evaluation process</p>
              <Button asChild>
                <Link href='/upload'>
                  <Upload className='w-4 h-4 mr-2' />
                  Upload CVs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center gap-4'>
              <h1 className='text-2xl font-bold'>TalentScreen</h1>
              <Badge variant='secondary'>
                {currentCandidate?.evaluation ? 'AI Evaluated' : 'AI Pre-Screened'}
              </Badge>
              <span className='text-gray-600'>{totalCandidates} candidates</span>
            </div>
            <Button variant='outline' asChild>
              <Link href='/upload'>
                <Upload className='w-4 h-4 mr-2' />
                Upload More
              </Link>
            </Button>
          </div>

          {/* Progress */}
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-gray-600'>Progress</span>
              <span className='text-sm font-medium'>
                {reviewedCount} / {totalCandidates}
              </span>
            </div>
            <Progress value={(reviewedCount / totalCandidates) * 100} />
          </div>

          {/* Filters */}
          <div className='flex flex-wrap gap-4 mb-8'>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All Roles' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Roles</SelectItem>
                <SelectItem value='frontend'>Frontend Developer</SelectItem>
                <SelectItem value='backend'>Backend Developer</SelectItem>
                <SelectItem value='fullstack'>Full Stack Developer</SelectItem>
                <SelectItem value='mobile'>Mobile Developer</SelectItem>
                <SelectItem value='devops'>DevOps Engineer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All Levels' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Levels</SelectItem>
                <SelectItem value='junior'>Junior (0-4 years)</SelectItem>
                <SelectItem value='senior'>Senior (5+ years)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder='Location...'
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className='w-48'
            />

            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>Min Score:</span>
              <Slider
                value={minScore}
                onValueChange={setMinScore}
                max={100}
                step={5}
                className='w-32'
              />
              <span className='text-sm font-medium w-8'>{minScore[0]}</span>
            </div>

            <Button
              variant={developerOnly ? 'default' : 'outline'}
              onClick={() => setDeveloperOnly(!developerOnly)}
            >
              Developer Only
            </Button>
          </div>

          {/* Main Content */}
          <div className='flex gap-8'>
            {/* Candidate Card */}
            <div className='flex-1'>
              <Card className='max-w-2xl mx-auto'>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div>
                      <h2 className='text-2xl font-bold'>{currentCandidate.name}</h2>
                      <p className='text-gray-600'>{currentCandidate.role}</p>
                      <div className='flex items-center gap-4 mt-2 text-sm text-gray-500'>
                        <span className='flex items-center gap-1'>
                          <MapPin className='w-4 h-4' />
                          {currentCandidate.location}
                        </span>
                        <span className='flex items-center gap-1'>
                          <Calendar className='w-4 h-4' />
                          {currentCandidate.years} years
                        </span>
                      </div>
                    </div>
                    <div className='text-right'>
                      {(() => {
                        if (currentCandidate.evaluation && !currentCandidate.evaluationError) {
                          return (
                            <>
                              <div className='flex items-center gap-2 mb-2'>
                                <Progress value={currentCandidate.score} className='w-20' />
                                <Badge variant={getScoreBadge(currentCandidate.score).variant}>
                                  {currentCandidate.score}%
                                </Badge>
                              </div>
                              <Badge variant={getScoreBadge(currentCandidate.score).variant}>
                                {getScoreBadge(currentCandidate.score).label}
                              </Badge>
                            </>
                          );
                        }
                        if (currentCandidate.evaluationError) {
                          return (
                            <Badge variant='outline' className='text-amber-600'>
                              Evaluation Failed
                            </Badge>
                          );
                        }
                        return <Badge variant='outline'>Not Evaluated</Badge>;
                      })()}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-6'>
                  {/* Skills */}
                  <div>
                    <h3 className='font-medium mb-3'>Skills</h3>
                    <div className='flex flex-wrap gap-2'>
                      {currentCandidate.matchedSkills.map((skill) => (
                        <Badge key={skill} variant='default'>
                          {skill}
                        </Badge>
                      ))}
                      {currentCandidate.otherSkills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant='outline'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div>
                    <h3 className='font-medium mb-3'>Key Achievements</h3>
                    <ul className='space-y-2'>
                      {currentCandidate.achievements.map((achievement) => (
                        <li key={`mobile-${achievement}`} className='flex items-start gap-2'>
                          <Star className='w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0' />
                          <span className='text-sm'>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className='flex gap-4 pt-4'>
                    <Button variant='outline' className='flex-1 bg-transparent'>
                      <FileText className='w-4 h-4 mr-2' />
                      View CV (PDF)
                    </Button>
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                      <DrawerTrigger asChild>
                        <Button variant='outline' className='flex-1 lg:hidden bg-transparent'>
                          <User className='w-4 h-4 mr-2' />
                          Full Profile
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>{currentCandidate.name}</DrawerTitle>
                        </DrawerHeader>
                        <div className='px-4 pb-4'>
                          <CandidateDetails candidate={currentCandidate} />
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop Details Panel */}
            <div className='w-80 hidden lg:block'>
              <Card>
                <CardHeader>
                  <h3 className='font-semibold'>Candidate Details</h3>
                </CardHeader>
                <CardContent>
                  <CandidateDetails candidate={currentCandidate} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer Actions */}
          <div className='fixed bottom-0 left-0 right-0 bg-white border-t p-4'>
            <div className='max-w-7xl mx-auto flex items-center justify-between'>
              <div className='flex gap-2'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='destructive'
                      size='lg'
                      onClick={handleReject}
                      aria-label='Reject candidate'
                    >
                      <ArrowLeft className='w-4 h-4 mr-2' />
                      Reject
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Press ← to reject</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='default'
                      size='lg'
                      onClick={handleShortlist}
                      aria-label='Shortlist candidate'
                    >
                      <ArrowRight className='w-4 h-4 mr-2' />
                      Shortlist
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Press → to shortlist</TooltipContent>
                </Tooltip>
              </div>

              <div className='flex gap-2'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      onClick={handleUndo}
                      disabled={history.length === 0}
                      aria-label='Undo last action'
                    >
                      <Undo2 className='w-4 h-4 mr-2' />
                      Undo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Press U to undo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='outline' onClick={handleSkip} aria-label='Skip candidate'>
                      <SkipForward className='w-4 h-4 mr-2' />
                      Skip
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Press S to skip</TooltipContent>
                </Tooltip>
              </div>

              <div className='text-sm text-gray-500'>Use ← → U S keys</div>
            </div>
          </div>

          {/* Spacer for fixed footer */}
          <div className='h-20' />
        </div>

        {/* Screen reader announcements */}
        <div aria-live='polite' className='sr-only'>
          {currentCandidate && `Reviewing ${currentCandidate.name}, ${currentCandidate.role}`}
        </div>
      </div>
    </TooltipProvider>
  );
}
