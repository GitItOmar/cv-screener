/**
 * Evaluation-specific prompt templates for resume scoring
 * Prompts are parameterized to support any job description
 */
class EvaluationPrompts {
  /**
   * Build self-evaluation LLM prompt
   * @param {Object} selfEvaluation - Self-evaluation data from resume
   * @param {Object} jobRequirements - Job requirements for dynamic prompts
   * @param {number} maxScore - Maximum score for this category (dynamic based on job requirements)
   */
  static buildSelfEvaluationPrompt(selfEvaluation, jobRequirements, maxScore = 1) {
    const roleTitle = jobRequirements?.positionAppliedFor?.title || 'the position';

    // Scale point allocations based on maxScore
    const summaryPoints = (0.4 * maxScore).toFixed(2);
    const goalsPoints = (0.3 * maxScore).toFixed(2);
    const passionPoints = (0.2 * maxScore).toFixed(2);
    const commPoints = (0.1 * maxScore).toFixed(2);

    return [
      {
        role: 'system',
        content: `You are evaluating a candidate's self-evaluation for ${roleTitle}.

Score 0-${maxScore} points considering:
- Summary quality and clarity (${summaryPoints} points)
- Career goals alignment with role (${goalsPoints} points)
- PASSION signal: Personal projects, side projects, learning initiatives (${passionPoints} points)
- COMMUNICATION signal: Clear, well-structured presentation (${commPoints} points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "passion": boolean,
    "communication": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this self-evaluation data:
${JSON.stringify(selfEvaluation, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build skills LLM prompt
   * @param {Object} skillsSpecialties - Skills data from resume
   * @param {Object} jobRequirements - Job requirements for dynamic prompts
   * @param {Object} fullResumeData - Full resume data for context
   */
  /**
   * Format language requirements for prompt display
   * @param {Array} requirements - Array of {language, level} objects
   * @returns {string} Formatted language requirements string
   */
  static formatLanguageRequirements(requirements) {
    if (!requirements || requirements.length === 0) {
      return 'No specific language requirements';
    }
    return requirements
      .filter((r) => r.language?.trim())
      .map((r) => `${r.language} (${r.level})`)
      .join(', ');
  }

  static buildSkillsPrompt(
    skillsSpecialties,
    jobRequirements,
    fullResumeData = null,
    maxScore = 2,
  ) {
    const roleTitle = jobRequirements?.positionAppliedFor?.title || 'the position';
    const requiredSkills = jobRequirements?.skills?.required?.join(', ') || 'relevant skills';
    const preferredSkills = jobRequirements?.skills?.preferred?.join(', ') || 'additional skills';

    // Scale point allocations based on maxScore
    const requiredPoints = (0.45 * maxScore).toFixed(2);
    const preferredPoints = (0.2 * maxScore).toFixed(2);
    const langPoints = (0.15 * maxScore).toFixed(2);
    const brainsPoints = (0.1 * maxScore).toFixed(2);
    const selectivityPoints = (0.1 * maxScore).toFixed(2);

    // New per-language requirements structure
    const langRequirements = jobRequirements?.languages?.required?.requirements || [];
    const formattedLangs = this.formatLanguageRequirements(langRequirements);
    const hasLangRequirements = langRequirements.length > 0;

    // Build per-language evaluation instructions
    let langEvalInstructions = '';
    if (hasLangRequirements) {
      const langList = langRequirements
        .filter((r) => r.language?.trim())
        .map((r) => `- ${r.language}: Minimum ${r.level} proficiency required`)
        .join('\n');
      langEvalInstructions = `
REQUIRED LANGUAGES (evaluate each separately):
${langList}

For EACH required language, evaluate the candidate's proficiency.
Score distribution: ${langPoints} points total for language requirements, divided equally among required languages.`;
    } else {
      langEvalInstructions = `
No specific language requirements defined. Skip language evaluation and award ${langPoints} points by default.`;
    }

    const systemPrompt = `You are evaluating a candidate's skills for ${roleTitle}.

Required skills: ${requiredSkills}
Preferred skills: ${preferredSkills}
Language requirements: ${formattedLangs}

Score 0-${maxScore} points considering:
- Required skills match (up to ${requiredPoints} points)
- Preferred skills match (up to ${preferredPoints} points)
- Language proficiency evidence (${langPoints} points)
- BRAINS signal: Deep technical understanding, complex problem-solving (${brainsPoints} points)
- SELECTIVITY signal: Certifications, continuous learning, competitions (${selectivityPoints} points)
${langEvalInstructions}

LANGUAGE PROFICIENCY EVALUATION:
Look for explicit evidence in the languages field first:
- Native or fluent proficiency = C2 level
- Advanced proficiency = C1 level
- Professional proficiency = B2-C1 level
- Intermediate proficiency = B2 level
- Basic proficiency = A1-B1 level

Level comparison for scoring:
- Candidate level >= Required level: Full points for that language
- Candidate level one step below: Half points
- Candidate level two or more steps below: No points

If no explicit language data is provided, apply inference from full resume context:

Native Language Indicators (can infer native proficiency if 2+ indicators present):
- Name patterns consistent with language region
- High school diploma from relevant country
- All education in relevant country/region
- All/majority work experience in relevant companies
- Lives in relevant country/region
- Consistent presence in relevant region throughout career

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "language_evidence": "description of language proficiency evidence found for each required language",
  "signals_found": {
    "brains": boolean,
    "selectivity": boolean
  }
}`;

    const userData = fullResumeData
      ? `Evaluate these skills with full resume context:

SKILLS AND SPECIALTIES:
${JSON.stringify(skillsSpecialties, null, 2)}

EDUCATION BACKGROUND (for language inference if needed):
${JSON.stringify(fullResumeData.educationBackground, null, 2)}

WORK EXPERIENCE (for language inference if needed):
${JSON.stringify(fullResumeData.workExperience, null, 2)}

BASIC INFORMATION (for language inference if needed):
${JSON.stringify(fullResumeData.basicInformation, null, 2)}

Provide score and reasoning.`
      : `Evaluate these skills:
${JSON.stringify(skillsSpecialties, null, 2)}

Provide score and reasoning.`;

    return [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userData,
      },
    ];
  }

  /**
   * Build experience LLM prompt
   * @param {Object} workExperience - Work experience data from resume
   * @param {Object} jobRequirements - Job requirements for dynamic prompts
   * @param {number} maxScore - Maximum score for this category (dynamic based on job requirements)
   */
  static buildExperiencePrompt(workExperience, jobRequirements, maxScore = 4) {
    const roleTitle = jobRequirements?.positionAppliedFor?.title || 'the position';
    const mandatoryExp = jobRequirements?.experience?.mandatoryExperience || 'relevant';
    const yearsRequired = jobRequirements?.experience?.yearsRequired ?? 0;
    const relevantRoles =
      jobRequirements?.experience?.relevantRoles?.join(', ') || 'relevant roles';

    // Scale point allocations based on maxScore
    const mandatoryPoints = (0.625 * maxScore).toFixed(2);
    const yearsPoints = (0.25 * maxScore).toFixed(2);
    const hardcorePoints = (0.05 * maxScore).toFixed(2);
    const commPoints = (0.05 * maxScore).toFixed(2);
    const diversityPoints = (0.025 * maxScore).toFixed(2);

    // For entry-level (low maxScore), adjust messaging
    const isEntryLevel = yearsRequired === 0;
    const mandatoryInstruction = isEntryLevel
      ? `- Any ${mandatoryExp} experience or relevant exposure (${mandatoryPoints} points)`
      : `- ${mandatoryExp} experience (${mandatoryPoints} points - MANDATORY)`;

    return [
      {
        role: 'system',
        content: `You are evaluating work experience for ${roleTitle}.

${
  isEntryLevel
    ? 'ENTRY-LEVEL POSITION - Work experience is valued but not strictly required.'
    : `CRITICAL REQUIREMENTS:
- Minimum ${yearsRequired} year(s) ${mandatoryExp} experience (MANDATORY - return 0 if missing)`
}
- Relevant roles: ${relevantRoles}

Score 0-${maxScore} points considering:
${mandatoryInstruction}
- Years of relevant experience (${yearsPoints} points)
- HARDCORE signal: Ambitious projects, startup experience, high-pressure situations (${hardcorePoints} points)
- COMMUNICATION signal: Client-facing work, team leadership (${commPoints} points)
- DIVERSITY signal: Varied industries, international experience (${diversityPoints} points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "core_experience": "description of ${mandatoryExp} experience found",
  "signals_found": {
    "hardcore": boolean,
    "communication": boolean,
    "diversity": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this work experience:
${JSON.stringify(workExperience, null, 2)}

Provide score and reasoning.${isEntryLevel ? '' : ` Return 0 if no ${mandatoryExp} experience is found.`}`,
      },
    ];
  }

  /**
   * Build basic info LLM prompt
   * @param {Object} basicInformation - Basic info data from resume
   * @param {Object} jobRequirements - Job requirements for dynamic prompts
   * @param {number} maxScore - Maximum score for this category (dynamic based on job requirements)
   */
  static buildBasicInfoPrompt(basicInformation, jobRequirements, maxScore = 1) {
    const roleTitle = jobRequirements?.positionAppliedFor?.title || 'the position';
    const isRemote = jobRequirements?.location?.isRemote || false;
    const preferredLocations = jobRequirements?.location?.preferred?.join(', ') || 'Any location';

    let systemPrompt;

    if (isRemote) {
      // Remote position: 100% weight on contact completeness, no location evaluation
      const contactPoints = maxScore.toFixed(2);
      const phonePoints = (0.1 * maxScore).toFixed(2);

      systemPrompt = `You are evaluating basic information for ${roleTitle}.

This is a REMOTE position - location is not a factor in evaluation.

Score 0-${maxScore} points considering ONLY:
- Contact completeness (name, email, phone; phone is weighted at ${phonePoints} points) (${contactPoints} points total)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation"
}`;
    } else {
      // Non-remote: standard 60/40 split between contact and location
      const contactPoints = (0.6 * maxScore).toFixed(2);
      const phonePoints = (0.1 * maxScore).toFixed(2);
      const locationPoints = (0.4 * maxScore).toFixed(2);

      systemPrompt = `You are evaluating basic information for ${roleTitle}.

Requirements:
- Preferred locations: ${preferredLocations}

Score 0-${maxScore} points considering:
- Contact completeness (name, email, phone; phone is weighted at ${phonePoints} points) (${contactPoints} points total)
- Location alignment with preferred locations (${locationPoints} points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation"
}`;
    }

    const userData = `Evaluate this basic information:
${JSON.stringify(basicInformation, null, 2)}

Provide score and reasoning.`;

    return [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userData,
      },
    ];
  }

  /**
   * Build education LLM prompt
   * @param {Object} educationBackground - Education data from resume
   * @param {Object} jobRequirements - Job requirements for dynamic prompts
   * @param {number} maxScore - Maximum score for this category (dynamic based on job requirements)
   */
  static buildEducationPrompt(educationBackground, jobRequirements, maxScore = 2) {
    const roleTitle = jobRequirements?.positionAppliedFor?.title || 'the position';
    const preferredFields =
      jobRequirements?.education?.preferredFields?.join(', ') || 'relevant fields';
    const alternatives =
      jobRequirements?.education?.alternatives?.join(', ') || 'alternative education';

    // Scale point allocations based on maxScore
    const formalPoints = (0.65 * maxScore).toFixed(2);
    const alternativePoints = (0.5 * maxScore).toFixed(2);
    const selectivityPoints = (0.2 * maxScore).toFixed(2);
    const brainsPoints = (0.15 * maxScore).toFixed(2);

    return [
      {
        role: 'system',
        content: `You are evaluating education for ${roleTitle}.

Acceptable education:
- Formal degrees: ${preferredFields}
- Alternatives: ${alternatives}

Score 0-${maxScore} points considering:
- Relevant formal education (up to ${formalPoints} points)
- Alternative education paths (bootcamps, self-taught) (up to ${alternativePoints} points)
- SELECTIVITY signal: Bootcamp completion, competitions, selective programs (${selectivityPoints} points)
- BRAINS signal: Academic achievements, complex projects (${brainsPoints} points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "selectivity": boolean,
    "brains": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate this education background:
${JSON.stringify(educationBackground, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }
}

export default EvaluationPrompts;
