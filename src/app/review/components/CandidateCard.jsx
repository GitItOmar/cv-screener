'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { MapPin, Briefcase, Award, AlertCircle, TrendingUp, Target, Code } from 'lucide-react';
import {
  getRoleTypeDisplayName,
  getDomainFocusDisplayName,
} from '@/app/review/utils/jobContextUtils';

/**
 * Extracts key highlights from candidate data with relevance filtering
 * @param {Object} candidate - Candidate data object
 * @returns {Array} Array of highlight objects
 */
function extractKeyHighlights(candidate) {
  const highlights = [];

  // Use relevance-filtered insights from consensus if available
  if (candidate.summarization?.summary) {
    const summary = candidate.summarization.summary;

    // Use mixed insights sorted by relevance if available
    if (summary.mixed_insights && summary.mixed_insights.length > 0) {
      summary.mixed_insights.forEach((insightText) => {
        // Determine type based on whether it appears in strengths or concerns
        const isStrength = summary.key_strengths?.includes(insightText);
        const isConcern = summary.key_concerns?.includes(insightText);

        let type = 'neutral';
        let icon = Award;

        if (isStrength) {
          type = 'strength';
          icon = TrendingUp;
        } else if (isConcern) {
          type = 'concern';
          icon = AlertCircle;
        }

        highlights.push({
          type,
          text: insightText,
          icon,
        });
      });
    } else {
      // Fallback to separate strengths and concerns
      if (summary.key_strengths) {
        summary.key_strengths.forEach((strength) => {
          highlights.push({
            type: 'strength',
            text: strength,
            icon: TrendingUp,
          });
        });
      }

      if (summary.key_concerns) {
        summary.key_concerns.forEach((concern) => {
          highlights.push({
            type: 'concern',
            text: concern,
            icon: AlertCircle,
          });
        });
      }
    }
  }

  // Fallback to skills if no summarization (backwards compatibility)
  if (highlights.length === 0 && candidate.extractedData?.skillsAndSpecialties?.technical) {
    const topSkills = candidate.extractedData.skillsAndSpecialties.technical.slice(0, 3);
    topSkills.forEach((skill) => {
      highlights.push({
        type: 'skill',
        text: `Strong in ${skill}`,
        icon: Award,
      });
    });
  }

  // Dynamic display: 2-6 insights based on relevance
  const minInsights = 2;
  const maxInsights = 6;

  // Ensure at least minInsights, but no more than maxInsights
  if (highlights.length < minInsights && candidate.extractedData?.skillsAndSpecialties?.technical) {
    // Pad with additional skills if needed
    const additionalSkills = candidate.extractedData.skillsAndSpecialties.technical
      .slice(highlights.length)
      .slice(0, minInsights - highlights.length);

    additionalSkills.forEach((skill) => {
      highlights.push({
        type: 'skill',
        text: `Proficient in ${skill}`,
        icon: Award,
      });
    });
  }

  return highlights.slice(0, maxInsights);
}

/**
 * Calculates years of experience from work history
 * @param {Array} workExperience - Array of work experience objects
 * @returns {number} Total years of experience
 */
function calculateYearsOfExperience(workExperience) {
  if (!workExperience || workExperience.length === 0) return 0;

  let totalMonths = 0;
  workExperience.forEach((job) => {
    if (job.duration) {
      // Parse duration like "2 years 3 months"
      const years = job.duration.match(/(\d+)\s*year/i);
      const months = job.duration.match(/(\d+)\s*month/i);
      if (years) totalMonths += parseInt(years[1]) * 12;
      if (months) totalMonths += parseInt(months[1]);
    }
  });

  return Math.round(totalMonths / 12);
}

/**
 * Gets score badge variant based on score value
 * @param {number} score - Score percentage
 * @returns {string} Badge variant
 */
function getScoreBadgeVariant(score) {
  if (score >= 80) return 'default'; // Green
  if (score >= 60) return 'secondary'; // Yellow
  return 'destructive'; // Red
}

/**
 * Gets recommendation badge text and variant
 * @param {Object} candidate - Candidate data
 * @returns {Object} Badge configuration
 */
function getRecommendationBadge(candidate) {
  const recommendation =
    candidate.summarization?.summary?.overall_recommendation ||
    candidate.evaluation?.summary?.recommendation;

  if (!recommendation) return null;

  const formatted = recommendation.replace(/_/g, ' ').toLowerCase();

  switch (formatted) {
    case 'strongly recommend':
      return {
        text: 'Strongly Recommend',
        variant: 'default',
        className: 'bg-green-500 hover:bg-green-600',
      };
    case 'recommend':
      return {
        text: 'Recommend',
        variant: 'default',
        className: 'bg-emerald-500 hover:bg-emerald-600',
      };
    case 'consider':
      return { text: 'Consider', variant: 'secondary' };
    case 'not recommended':
      return { text: 'Not Recommended', variant: 'destructive' };
    default:
      return { text: formatted, variant: 'outline' };
  }
}

export default function CandidateCard({ candidate, index, total }) {
  // Extract data
  const basicInfo = candidate.extractedData?.basicInformation || {};
  const workExp = candidate.extractedData?.workExperience || [];
  const skills = candidate.extractedData?.skillsAndSpecialties || {};
  const positionAppliedFor = candidate.extractedData?.positionAppliedFor || {};

  // Calculate metrics
  const yearsOfExperience = calculateYearsOfExperience(workExp);
  const overallScore =
    candidate.evaluation?.overall?.finalPercentage ||
    Math.round((candidate.summarization?.summary?.confidence_level || 0) * 100);
  const highlights = extractKeyHighlights(candidate);
  const recommendationBadge = getRecommendationBadge(candidate);

  // Get candidate info
  const candidateName =
    basicInfo.fullName ||
    basicInfo.name ||
    candidate.fileInfo?.name?.replace(/\.(pdf|docx?)$/i, '') ||
    'Unknown Candidate';
  const currentRole = workExp[0]?.position || workExp[0]?.title || 'Candidate';
  const currentCompany = workExp[0]?.company || '';
  const location = basicInfo.location || basicInfo.city || 'Location not specified';

  // Enhanced position information
  const targetRole = positionAppliedFor.title || currentRole;
  const roleType = positionAppliedFor.roleType
    ? getRoleTypeDisplayName(positionAppliedFor.roleType)
    : null;
  const domainFocus = positionAppliedFor.domainFocus
    ? getDomainFocusDisplayName(positionAppliedFor.domainFocus)
    : null;
  const seniorityLevel = positionAppliedFor.level || 'mid-level';

  // Generate initials for avatar
  const initials = candidateName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className='w-full max-w-2xl mx-auto shadow-lg'>
      {/* Card Header */}
      <CardHeader className='pb-4'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-4'>
            {/* Avatar */}
            <Avatar className='h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600'>
              <div className='flex items-center justify-center w-full h-full text-white font-semibold text-xl'>
                {initials}
              </div>
            </Avatar>

            {/* Name and Role */}
            <div>
              <CardTitle className='text-2xl font-bold'>{candidateName}</CardTitle>
              <CardDescription className='text-base mt-1'>
                {targetRole}
                {currentCompany && ` at ${currentCompany}`}
              </CardDescription>
              {(roleType || domainFocus) && (
                <div className='flex gap-2 mt-2'>
                  {roleType && (
                    <Badge variant='outline' className='text-xs'>
                      <Target className='h-3 w-3 mr-1' />
                      {roleType}
                    </Badge>
                  )}
                  {domainFocus && (
                    <Badge variant='outline' className='text-xs'>
                      <Code className='h-3 w-3 mr-1' />
                      {domainFocus}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Score Badge */}
          <div className='flex flex-col items-end space-y-2'>
            <Badge variant={getScoreBadgeVariant(overallScore)} className='text-lg px-3 py-1'>
              {overallScore}%
            </Badge>
            {recommendationBadge && (
              <Badge
                variant={recommendationBadge.variant}
                className={recommendationBadge.className}
              >
                {recommendationBadge.text}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className='mt-4 text-sm text-gray-500'>
          Candidate {index + 1} of {total}
        </div>
      </CardHeader>

      {/* Card Body */}
      <CardContent className='space-y-4'>
        {/* Quick Stats */}
        <div className='flex flex-wrap gap-4 text-sm'>
          <div className='flex items-center space-x-2 text-gray-600'>
            <Briefcase className='h-4 w-4' />
            <span>
              {yearsOfExperience} years experience ({seniorityLevel})
            </span>
          </div>
          <div className='flex items-center space-x-2 text-gray-600'>
            <MapPin className='h-4 w-4' />
            <span>{location}</span>
          </div>
          {skills.technical && skills.technical.length > 0 && (
            <div className='flex items-center space-x-2 text-gray-600'>
              <Award className='h-4 w-4' />
              <span>{skills.technical.length} technical skills</span>
            </div>
          )}
        </div>

        {/* Key Highlights */}
        {highlights.length > 0 && (
          <div className='space-y-2'>
            <h3 className='font-semibold text-sm text-gray-700 uppercase tracking-wide'>
              Key Highlights
            </h3>
            <ul className='space-y-2'>
              {highlights.map((highlight, idx) => {
                const Icon = highlight.icon;
                const highlightKey = `${highlight.type}-${idx}`;
                let colorClass = 'text-gray-700';
                if (highlight.type === 'concern') colorClass = 'text-orange-700';
                if (highlight.type === 'strength') colorClass = 'text-green-700';

                return (
                  <li
                    key={highlightKey}
                    className={`flex items-start space-x-2 text-sm ${colorClass}`}
                  >
                    <Icon className='h-4 w-4 mt-0.5 flex-shrink-0' />
                    <span>{highlight.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Top Skills */}
        {skills.technical && skills.technical.length > 0 && (
          <div className='space-y-2'>
            <h3 className='font-semibold text-sm text-gray-700 uppercase tracking-wide'>
              Top Skills
            </h3>
            <div className='flex flex-wrap gap-2'>
              {skills.technical.slice(0, 6).map((skill) => (
                <Badge key={skill} variant='outline' className='text-xs'>
                  {skill}
                </Badge>
              ))}
              {skills.technical.length > 6 && (
                <Badge variant='outline' className='text-xs'>
                  +{skills.technical.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* AI Confidence */}
        {candidate.summarization?.summary?.confidence_level && (
          <div className='pt-2 border-t'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-gray-600'>AI Confidence</span>
              <div className='flex items-center space-x-2'>
                <div className='w-32 bg-gray-200 rounded-full h-2'>
                  <div
                    className='bg-blue-500 h-2 rounded-full transition-all duration-300'
                    style={{
                      width: `${Math.round(candidate.summarization.summary.confidence_level * 100)}%`,
                    }}
                  />
                </div>
                <span className='text-gray-700 font-medium'>
                  {Math.round(candidate.summarization.summary.confidence_level * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
