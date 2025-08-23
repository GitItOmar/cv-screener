/**
 * Evaluation-specific prompt templates for resume scoring
 */
class EvaluationPrompts {
  /**
   * Build self-evaluation LLM prompt
   */
  static buildSelfEvaluationPrompt(selfEvaluation) {
    return [
      {
        role: 'system',
        content: `You are evaluating a candidate's self-evaluation for a Shopify Junior Developer role.
        
Score 0-1 points considering:
- Summary quality and clarity (0.4 points)
- Career goals alignment with role (0.3 points)
- PASSION signal: Personal projects, side projects, learning initiatives (0.2 points)
- COMMUNICATION signal: Clear, well-structured presentation (0.1 points)

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
   */
  static buildSkillsPrompt(skillsSpecialties, jobRequirements) {
    return [
      {
        role: 'system',
        content: `You are evaluating a candidate's skills for a Shopify Junior Developer role.

Required skills: ${jobRequirements.skills.required.join(', ')}
Preferred skills: ${jobRequirements.skills.preferred.join(', ')}

Score 0-2 points considering:
- Required skills match (up to 1.2 points)
- Preferred skills match (up to 0.5 points)
- BRAINS signal: Deep technical understanding, complex problem-solving (0.2 points)
- SELECTIVITY signal: Certifications, continuous learning, competitions (0.1 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "signals_found": {
    "brains": boolean,
    "selectivity": boolean
  }
}`,
      },
      {
        role: 'user',
        content: `Evaluate these skills:
${JSON.stringify(skillsSpecialties, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build experience LLM prompt
   */
  static buildExperiencePrompt(workExperience, jobRequirements) {
    return [
      {
        role: 'system',
        content: `You are evaluating work experience for a Shopify Junior Developer role.

CRITICAL REQUIREMENTS:
- Minimum 1 year Shopify experience (MANDATORY - return 0 if missing)
- Relevant roles: ${jobRequirements.experience.relevantRoles.join(', ')}

Score 0-4 points considering:
- Shopify experience (2.5 points - MANDATORY)
- Years of relevant experience (1 point)
- HARDCORE signal: Ambitious projects, startup experience, high-pressure situations (0.2 points)
- COMMUNICATION signal: Client-facing work, team leadership (0.2 points)
- DIVERSITY signal: Varied industries, international experience (0.1 points)

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "shopify_experience": "description of shopify experience found",
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

Provide score and reasoning. Return 0 if no Shopify experience is found.`,
      },
    ];
  }

  /**
   * Build basic info LLM prompt
   */
  static buildBasicInfoPrompt(basicInformation, jobRequirements) {
    return [
      {
        role: 'system',
        content: `You are evaluating basic information for a Shopify Junior Developer role.

Requirements:
- Preferred locations: ${jobRequirements.location.preferred.join(', ')}
- Required language proficiency: C1 English or German with evidence

Score 0-1 points considering:
- Contact completeness (name, email, phone) (0.4 points)
- Location alignment with DACH region (0.3 points)
- Language proficiency evidence (C1 English/German) (0.3 points)

Look for language evidence in:
- Explicit proficiency statements
- Education in English/German-speaking countries
- Work experience in these countries
- Language certifications

Return JSON format:
{
  "score": 0.X,
  "reasoning": "detailed explanation",
  "language_evidence": "description of language proficiency evidence found"
}`,
      },
      {
        role: 'user',
        content: `Evaluate this basic information:
${JSON.stringify(basicInformation, null, 2)}

Provide score and reasoning.`,
      },
    ];
  }

  /**
   * Build education LLM prompt
   */
  static buildEducationPrompt(educationBackground, jobRequirements) {
    return [
      {
        role: 'system',
        content: `You are evaluating education for a Shopify Junior Developer role.

Acceptable education:
- Formal degrees: ${jobRequirements.education.preferredFields.join(', ')}
- Alternatives: ${jobRequirements.education.alternatives.join(', ')}

Score 0-2 points considering:
- Relevant formal education (up to 1.3 points)
- Alternative education paths (bootcamps, self-taught) (up to 1 point)
- SELECTIVITY signal: Bootcamp completion, competitions, selective programs (0.4 points)
- BRAINS signal: Academic achievements, complex projects (0.3 points)

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
