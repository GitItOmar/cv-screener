/**
 * Adapter to transform evaluation data for the review UI
 */

/**
 * Transform a processed candidate with evaluation data into the review UI format
 * @param {Object} processedCandidate - Candidate with extraction and evaluation data
 * @returns {Object} - Formatted candidate for review UI
 */
function adaptCandidateForUI(processedCandidate) {
  const { extractedData, evaluation, evaluationError, fileInfo } = processedCandidate;
  const basicInfo = extractedData?.basicInformation || {};
  const workExp = extractedData?.workExperience || [];
  const skills = extractedData?.skillsAndSpecialties || {};

  // Extract name
  const name =
    basicInfo.name || fileInfo?.name?.replace(/\.(pdf|docx?)$/i, '') || 'Unknown Candidate';

  // Extract role from most recent work experience
  const role = workExp[0]?.position || workExp[0]?.title || 'Candidate';

  // Extract location
  const location = basicInfo.location || basicInfo.city || 'Not specified';

  // Calculate years of experience from work history
  const years = calculateYearsOfExperience(workExp);

  // Get overall score
  const score = evaluation?.overall?.finalPercentage || 0;

  // Extract skills
  const allSkills = extractSkills(skills);
  const matchedSkills = allSkills
    .filter(
      (skill) => skills.matchedRequirements?.includes(skill) || skills.relevant?.includes(skill),
    )
    .slice(0, 5);
  const otherSkills = allSkills.filter((skill) => !matchedSkills.includes(skill)).slice(0, 8);

  // Extract achievements from work experience
  const achievements = extractAchievements(workExp);

  // Get evaluation details
  const evaluationDetails = evaluation
    ? {
        categories: evaluation.categories,
        summary: evaluation.summary,
        metadata: evaluation.metadata,
      }
    : null;

  return {
    id: processedCandidate.id,
    name,
    role,
    location,
    years,
    score,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : ['No matched skills'],
    otherSkills: otherSkills.length > 0 ? otherSkills : [],
    achievements: achievements.length > 0 ? achievements : ['No achievements found'],
    resumeUrl: fileInfo?.name || null,
    // Additional fields for evaluation
    email: basicInfo.email,
    phone: basicInfo.phone,
    evaluation: evaluationDetails,
    evaluationError,
    extractedData, // Keep original data for reference
  };
}

/**
 * Calculate years of experience from work history
 * @param {Array} workExperience - Array of work experience entries
 * @returns {number} - Estimated years of experience
 */
function calculateYearsOfExperience(workExperience) {
  if (!workExperience || workExperience.length === 0) return 0;

  // Try to calculate from dates
  let totalMonths = 0;

  for (const job of workExperience) {
    if (job.startDate && job.endDate) {
      const start = new Date(job.startDate);
      const end = job.endDate === 'Present' ? new Date() : new Date(job.endDate);

      if (!isNaN(start) && !isNaN(end)) {
        const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
        totalMonths += months;
      }
    } else if (job.duration) {
      // Try to parse duration string (e.g., "2 years", "6 months")
      const yearMatch = job.duration.match(/(\d+)\s*year/i);
      const monthMatch = job.duration.match(/(\d+)\s*month/i);

      if (yearMatch) totalMonths += parseInt(yearMatch[1]) * 12;
      if (monthMatch) totalMonths += parseInt(monthMatch[1]);
    }
  }

  // If we couldn't calculate from dates, estimate based on number of positions
  if (totalMonths === 0 && workExperience.length > 0) {
    // Rough estimate: 2 years per position
    return workExperience.length * 2;
  }

  return Math.round(totalMonths / 12);
}

/**
 * Extract skills from skills and specialties section
 * @param {Object} skillsData - Skills and specialties data
 * @returns {Array} - Array of skill strings
 */
function extractSkills(skillsData) {
  const skills = [];

  // Add technical skills
  if (skillsData.technical && Array.isArray(skillsData.technical)) {
    skills.push(...skillsData.technical);
  }

  // Add programming languages
  if (skillsData.programmingLanguages && Array.isArray(skillsData.programmingLanguages)) {
    skills.push(...skillsData.programmingLanguages);
  }

  // Add frameworks
  if (skillsData.frameworks && Array.isArray(skillsData.frameworks)) {
    skills.push(...skillsData.frameworks);
  }

  // Add tools
  if (skillsData.tools && Array.isArray(skillsData.tools)) {
    skills.push(...skillsData.tools);
  }

  // Add any other skills mentioned
  if (skillsData.other && Array.isArray(skillsData.other)) {
    skills.push(...skillsData.other);
  }

  // Remove duplicates and return
  return [...new Set(skills)];
}

/**
 * Extract achievements from work experience
 * @param {Array} workExperience - Array of work experience entries
 * @returns {Array} - Array of achievement strings
 */
function extractAchievements(workExperience) {
  const achievements = [];

  for (const job of workExperience) {
    // Check for achievements or accomplishments field
    if (job.achievements && Array.isArray(job.achievements)) {
      achievements.push(...job.achievements);
    }

    if (job.accomplishments && Array.isArray(job.accomplishments)) {
      achievements.push(...job.accomplishments);
    }

    // Check responsibilities that sound like achievements
    if (job.responsibilities && Array.isArray(job.responsibilities)) {
      const achievementKeywords = [
        'led',
        'improved',
        'reduced',
        'increased',
        'built',
        'designed',
        'implemented',
        'launched',
        'achieved',
      ];

      for (const resp of job.responsibilities) {
        if (achievementKeywords.some((keyword) => resp.toLowerCase().includes(keyword))) {
          achievements.push(resp);
        }
      }
    }
  }

  // Return top 3 achievements
  return achievements.slice(0, 3);
}

/**
 * Transform multiple processed candidates for the review UI
 * @param {Array} processedCandidates - Array of candidates with evaluation data
 * @returns {Array} - Array of formatted candidates for review UI
 */
export function adaptCandidatesForUI(processedCandidates) {
  if (!processedCandidates || !Array.isArray(processedCandidates)) {
    return [];
  }

  return processedCandidates.map(adaptCandidateForUI);
}
