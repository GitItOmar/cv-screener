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

// Mock candidate data
const mockCandidates = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Senior Frontend Developer',
    location: 'San Francisco, CA',
    years: 5,
    score: 92,
    matchedSkills: ['React', 'TypeScript', 'Next.js'],
    otherSkills: ['Vue.js', 'Node.js', 'GraphQL', 'AWS'],
    achievements: [
      'Led frontend architecture for 50M+ user platform',
      'Reduced bundle size by 40% through optimization',
      'Mentored 8 junior developers across 2 teams',
    ],
    resumeUrl: '/cv/sarah-chen.pdf',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Full Stack Developer',
    location: 'Austin, TX',
    years: 3,
    score: 78,
    matchedSkills: ['JavaScript', 'React', 'Node.js'],
    otherSkills: ['Python', 'MongoDB', 'Docker', 'Kubernetes'],
    achievements: [
      'Built microservices handling 1M+ daily requests',
      'Implemented CI/CD pipeline reducing deployment time by 60%',
      'Contributed to 3 open-source projects with 500+ stars',
    ],
    resumeUrl: '/cv/marcus-johnson.pdf',
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    role: 'Backend Developer',
    location: 'Remote',
    years: 7,
    score: 88,
    matchedSkills: ['Python', 'Django', 'PostgreSQL'],
    otherSkills: ['Redis', 'Elasticsearch', 'Kafka', 'Terraform'],
    achievements: [
      'Designed scalable API serving 10M+ requests/day',
      'Reduced database query time by 70% through optimization',
      'Led migration of legacy system to cloud architecture',
    ],
    resumeUrl: '/cv/elena-rodriguez.pdf',
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'DevOps Engineer',
    location: 'Seattle, WA',
    years: 4,
    score: 85,
    matchedSkills: ['AWS', 'Docker', 'Kubernetes'],
    otherSkills: ['Terraform', 'Jenkins', 'Prometheus', 'Grafana'],
    achievements: [
      'Automated deployment pipeline for 20+ microservices',
      'Achieved 99.9% uptime across production environments',
      'Reduced infrastructure costs by 35% through optimization',
    ],
    resumeUrl: '/cv/david-kim.pdf',
  },
  {
    id: '5',
    name: 'Priya Patel',
    role: 'Mobile Developer',
    location: 'New York, NY',
    years: 6,
    score: 90,
    matchedSkills: ['React Native', 'iOS', 'Android'],
    otherSkills: ['Swift', 'Kotlin', 'Firebase', 'Redux'],
    achievements: [
      'Published 5 apps with 2M+ combined downloads',
      'Improved app performance by 50% through native optimization',
      'Led cross-platform development team of 6 engineers',
    ],
    resumeUrl: '/cv/priya-patel.pdf',
  },
  {
    id: '6',
    name: 'Alex Thompson',
    role: 'Frontend Developer',
    location: 'London, UK',
    years: 2,
    score: 72,
    matchedSkills: ['React', 'CSS', 'JavaScript'],
    otherSkills: ['Sass', 'Webpack', 'Jest', 'Cypress'],
    achievements: [
      'Redesigned user interface increasing conversion by 25%',
      'Implemented accessibility features meeting WCAG 2.1 AA',
      'Built component library used across 4 product teams',
    ],
    resumeUrl: '/cv/alex-thompson.pdf',
  },
  {
    id: '7',
    name: 'Maria Santos',
    role: 'Data Engineer',
    location: 'Toronto, CA',
    years: 5,
    score: 83,
    matchedSkills: ['Python', 'Apache Spark', 'SQL'],
    otherSkills: ['Airflow', 'Snowflake', 'dbt', 'Kafka'],
    achievements: [
      'Built data pipeline processing 100TB+ daily',
      'Reduced data processing time from hours to minutes',
      'Designed real-time analytics dashboard for C-suite',
    ],
    resumeUrl: '/cv/maria-santos.pdf',
  },
  {
    id: '8',
    name: 'James Wilson',
    role: 'Senior Backend Developer',
    location: 'Chicago, IL',
    years: 8,
    score: 94,
    matchedSkills: ['Java', 'Spring Boot', 'Microservices'],
    otherSkills: ['Redis', 'RabbitMQ', 'MySQL', 'Jenkins'],
    achievements: [
      'Architected distributed system handling 50M+ transactions',
      'Led technical migration affecting 100+ services',
      'Mentored 12 developers and established coding standards',
    ],
    resumeUrl: '/cv/james-wilson.pdf',
  },
];

const getScoreBadge = (score) => {
  if (score >= 90) return { label: 'Excellent', variant: 'default', color: 'bg-green-500' };
  if (score >= 75) return { label: 'Good', variant: 'secondary', color: 'bg-blue-500' };
  return { label: 'Borderline', variant: 'outline', color: 'bg-yellow-500' };
};

function CandidateDetails({ candidate }) {
  return (
    <Tabs defaultValue='overview' className='w-full'>
      <TabsList className='grid w-full grid-cols-4'>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='skills'>Skills</TabsTrigger>
        <TabsTrigger value='experience'>Experience</TabsTrigger>
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

  // Initialize candidates
  useEffect(() => {
    setTimeout(() => {
      setCandidates(mockCandidates);
      setLoading(false);
    }, 1000);
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

  const resetFilters = () => {
    setRoleFilter('all');
    setSeniorityFilter('all');
    setLocationFilter('');
    setMinScore([0]);
    setDeveloperOnly(false);
    setCurrentIndex(0);
  };

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

  if (totalCandidates === 0) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center gap-4'>
              <h1 className='text-2xl font-bold'>TalentScreen</h1>
              <Badge variant='secondary'>AI Pre-Screened</Badge>
              <span className='text-gray-600'>0 candidates</span>
            </div>
            <Button variant='outline' asChild>
              <Link href='/upload'>
                <Upload className='w-4 h-4 mr-2' />
                Upload More
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
              <h2 className='text-xl font-semibold text-gray-600'>
                No candidates match your filters
              </h2>
              <Button onClick={resetFilters}>Reset Filters</Button>
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
              <Badge variant='secondary'>AI Pre-Screened</Badge>
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
                      <div className='flex items-center gap-2 mb-2'>
                        <Progress value={currentCandidate.score} className='w-20' />
                        <Badge variant={getScoreBadge(currentCandidate.score).variant}>
                          {currentCandidate.score}%
                        </Badge>
                      </div>
                      <Badge variant={getScoreBadge(currentCandidate.score).variant}>
                        {getScoreBadge(currentCandidate.score).label}
                      </Badge>
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
