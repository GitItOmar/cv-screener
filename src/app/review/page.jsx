'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
// No adaptation needed - using raw data

function CandidateDisplay({ candidate, index, total }) {
  // Extract basic info from raw data
  const basicInfo = candidate.extractedData?.basicInformation || {};
  const workExp = candidate.extractedData?.workExperience || [];
  const education = candidate.extractedData?.educationBackground?.degrees || [];
  const skills = candidate.extractedData?.skillsAndSpecialties || {};

  // Use raw summarization data directly
  const displaySummarization = candidate.summarization;

  // Helper functions to simplify template
  const getEvaluationSection = () => {
    if (candidate.evaluationError) {
      return `EVALUATION FAILED: ${candidate.evaluationError}`;
    }

    if (!candidate.evaluation) {
      return 'No evaluation data available';
    }

    const overallScore = candidate.evaluation.overall?.finalPercentage || 0;
    let scoreLabel;
    if (overallScore >= 90) {
      scoreLabel = 'Excellent';
    } else if (overallScore >= 75) {
      scoreLabel = 'Good';
    } else {
      scoreLabel = 'Borderline';
    }

    return `OVERALL SCORE: ${overallScore}% (${scoreLabel})

RECOMMENDATION: ${candidate.evaluation.summary?.recommendation?.replace('_', ' ').toUpperCase() || 'Not available'}

CATEGORY BREAKDOWN:
${Object.entries(candidate.evaluation.categories || {})
  .map(
    ([category, data]) =>
      `  ${category.replace(/([A-Z])/g, ' $1').trim()}: ${data.score}/${data.maxScore} points (${data.percentage}%)
  Reasoning: ${data.reasoning || 'No reasoning provided'}`,
  )
  .join('\n\n')}

STRENGTHS:
  ${candidate.evaluation.summary?.strengths?.category || 'Not specified'}: ${candidate.evaluation.summary?.strengths?.score || 'N/A'}%

AREAS FOR IMPROVEMENT:
  ${candidate.evaluation.summary?.improvements?.category || 'Not specified'}: ${candidate.evaluation.summary?.improvements?.score || 'N/A'}%`;
  };

  const getSummarizationSection = () => {
    if (candidate.summarizationError) {
      return `SUMMARIZATION FAILED: ${candidate.summarizationError}`;
    }

    if (!displaySummarization) {
      return 'No summarization data available';
    }

    return `OVERALL AI RECOMMENDATION: ${displaySummarization.summary?.overall_recommendation?.replace('_', ' ').toUpperCase() || 'Not available'}
CONFIDENCE LEVEL: ${Math.round((displaySummarization.summary?.confidence_level || 0) * 100)}%

CONSENSUS REASONING:
${displaySummarization.summary?.consensus_reasoning || 'No reasoning provided'}

KEY STRENGTHS:
${displaySummarization.summary?.key_strengths?.map((strength) => `  • ${strength}`).join('\n') || '  No strengths identified'}

KEY CONCERNS:
${displaySummarization.summary?.key_concerns?.map((concern) => `  • ${concern}`).join('\n') || '  No concerns identified'}

CEO PERSPECTIVE (Leadership Assessment):
  Score: ${Math.round((displaySummarization.agent_perspectives?.ceo?.score || 0) * 100)}%
  Assessment: ${displaySummarization.agent_perspectives?.ceo?.assessment || 'Not available'}
  Highlights:
${displaySummarization.agent_perspectives?.ceo?.highlights?.map((highlight) => `    • ${highlight}`).join('\n') || '    None'}
  Concerns:
${displaySummarization.agent_perspectives?.ceo?.concerns?.map((concern) => `    • ${concern}`).join('\n') || '    None'}

CTO PERSPECTIVE (Technical Assessment):
  Score: ${Math.round((displaySummarization.agent_perspectives?.cto?.score || 0) * 100)}%
  Assessment: ${displaySummarization.agent_perspectives?.cto?.assessment || 'Not available'}
  Technical Highlights:
${displaySummarization.agent_perspectives?.cto?.highlights?.map((highlight) => `    • ${highlight}`).join('\n') || '    None'}
  Technical Concerns:
${displaySummarization.agent_perspectives?.cto?.concerns?.map((concern) => `    • ${concern}`).join('\n') || '    None'}

HR PERSPECTIVE (Culture & Soft Skills):
  Score: ${Math.round((displaySummarization.agent_perspectives?.hr?.score || 0) * 100)}%
  Assessment: ${displaySummarization.agent_perspectives?.hr?.assessment || 'Not available'}
  Cultural Fit:
${displaySummarization.agent_perspectives?.hr?.highlights?.map((highlight) => `    • ${highlight}`).join('\n') || '    None'}
  HR Concerns:
${displaySummarization.agent_perspectives?.hr?.concerns?.map((concern) => `    • ${concern}`).join('\n') || '    None'}

RECOMMENDATIONS:
  For Recruiter:
${displaySummarization.recommendations?.for_recruiter?.map((rec) => `    • ${rec}`).join('\n') || '    None'}

  For Candidate:
${displaySummarization.recommendations?.for_candidate?.map((rec) => `    • ${rec}`).join('\n') || '    None'}

  Interview Focus Areas:
${displaySummarization.recommendations?.interview_focus?.map((focus) => `    • ${focus}`).join('\n') || '    None'}

PROCESSING METADATA:
  Processing Time: ${displaySummarization?.metadata?.processing_time_ms || 0}ms
  Tokens Used: ${displaySummarization?.metadata?.tokens_used || 0}
  Cost: $${displaySummarization?.metadata?.cost_usd?.toFixed(4) || '0.0000'}
  Model: ${displaySummarization?.metadata?.model_version || 'Unknown'}`;
  };

  return (
    <div
      style={{
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        padding: '20px',
        lineHeight: '1.6',
      }}
    >
      {`================================ CANDIDATE ${index + 1} of ${total} ================================

NAME: ${basicInfo.name || candidate.fileInfo?.name?.replace(/\.(pdf|docx?)$/i, '') || 'Unknown Candidate'}
ROLE: ${workExp[0]?.position || workExp[0]?.title || 'Candidate'}
LOCATION: ${basicInfo.location || basicInfo.city || 'Not specified'}
EXPERIENCE: ${workExp.length > 0 ? `${workExp.length} positions` : 'Not specified'}
EMAIL: ${basicInfo.email || 'Not provided'}
PHONE: ${basicInfo.phone || 'Not provided'}
FILE: ${candidate.fileInfo?.name || 'Unknown'}

================================ RAW EXTRACTED DATA ================================

BASIC INFORMATION:
${JSON.stringify(basicInfo, null, 2)}

TECHNICAL SKILLS:
${skills.technical ? skills.technical.map((skill) => `  • ${skill}`).join('\n') : '  No technical skills found'}

PROGRAMMING LANGUAGES:
${skills.programmingLanguages ? skills.programmingLanguages.map((lang) => `  • ${lang}`).join('\n') : '  No programming languages found'}

FRAMEWORKS:
${skills.frameworks ? skills.frameworks.map((framework) => `  • ${framework}`).join('\n') : '  No frameworks found'}

TOOLS:
${skills.tools ? skills.tools.map((tool) => `  • ${tool}`).join('\n') : '  No tools found'}

LANGUAGES:
${skills.languages ? skills.languages.map((lang) => `  • ${lang.name || lang} ${lang.proficiency ? `(${lang.proficiency})` : ''}`).join('\n') : '  No languages found'}

WORK EXPERIENCE:
${
  workExp.length > 0
    ? workExp
        .map(
          (job, idx) =>
            `  ${idx + 1}. ${job.position || job.title || 'Position'} at ${job.company || 'Company'}
     Duration: ${job.duration || `${job.startDate || 'Unknown'} - ${job.endDate || 'Present'}`}
     Responsibilities:
${job.responsibilities ? job.responsibilities.map((resp) => `       - ${resp}`).join('\n') : '       - No responsibilities listed'}
     ${job.achievements ? `Achievements:\n${job.achievements.map((ach) => `       - ${ach}`).join('\n')}` : ''}`,
        )
        .join('\n\n')
    : '  No work experience data available'
}

EDUCATION:
${
  education.length > 0
    ? education
        .map(
          (edu, idx) =>
            `  ${idx + 1}. ${edu.type || 'Degree'} in ${edu.field || 'Field'} 
     Institution: ${edu.institution || 'Institution'}
     Year: ${edu.graduationYear || 'Year'}
     ${edu.gpa ? `GPA: ${edu.gpa}` : ''}`,
        )
        .join('\n\n')
    : '  No education data available'
}

RELEVANT COURSEWORK:
${
  candidate.extractedData?.educationBackground?.relevantCoursework?.length > 0
    ? candidate.extractedData.educationBackground.relevantCoursework
        .map((course) => `  • ${course}`)
        .join('\n')
    : '  No relevant coursework listed'
}

ACADEMIC PROJECTS:
${
  candidate.extractedData?.educationBackground?.projects?.length > 0
    ? candidate.extractedData.educationBackground.projects
        .map((project, idx) => `  ${idx + 1}. ${project}`)
        .join('\n')
    : '  No academic projects listed'
}

CERTIFICATIONS:
${
  candidate.extractedData?.certifications
    ? candidate.extractedData.certifications
        .map(
          (cert, idx) =>
            `  ${idx + 1}. ${cert.name || cert}
     ${cert.issuer ? `Issuer: ${cert.issuer}` : ''}
     ${cert.date ? `Date: ${cert.date}` : ''}`,
        )
        .join('\n\n')
    : '  No certifications found'
}

PROJECTS:
${
  candidate.extractedData?.projects
    ? candidate.extractedData.projects
        .map(
          (project, idx) =>
            `  ${idx + 1}. ${project.name || project.title || 'Project'}
     ${project.description ? `Description: ${project.description}` : ''}
     ${project.technologies ? `Technologies: ${Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies}` : ''}`,
        )
        .join('\n\n')
    : '  No projects found'
}

================================ EVALUATION RESULTS ================================

${getEvaluationSection()}

================================ AI SUMMARIZATION ================================

${getSummarizationSection()}

================================ COMPLETE RAW DATA STRUCTURE ================================

${JSON.stringify(candidate, null, 2)}

`}
    </div>
  );
}

export default function ReviewPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize candidates from sessionStorage
  useEffect(() => {
    const loadCandidates = () => {
      // Try to load processed candidates from sessionStorage
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

  if (loading) {
    return <div style={{ fontFamily: 'monospace', padding: '20px' }}>Loading candidates...</div>;
  }

  if (candidates.length === 0) {
    return (
      <div style={{ fontFamily: 'monospace', padding: '20px' }}>
        <h1>TalentScreen - Review Page</h1>
        <p>
          No candidates to review. <Link href='/upload'>Upload CVs</Link> to start the AI evaluation
          process.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '20px' }}>
      <h1>TalentScreen - Candidate Review</h1>
      <p>Total Candidates: {candidates.length}</p>
      <p>
        <Link href='/upload'>Upload More CVs</Link>
      </p>
      <hr style={{ margin: '20px 0' }} />

      {candidates.map((candidate, index) => (
        <CandidateDisplay
          key={candidate.id || index}
          candidate={candidate}
          index={index}
          total={candidates.length}
        />
      ))}
    </div>
  );
}
