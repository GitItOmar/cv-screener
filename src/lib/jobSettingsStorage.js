/**
 * Job Settings Storage Utility
 * Manages persistence of custom job requirements using localStorage
 */

const STORAGE_KEY = 'jobSettings';

/**
 * Default job settings structure
 */
const defaultSettings = {
  jobDescription: '',
  jobTitle: '',
  yearsExperience: 0,
  requiredKeywords: [],
  preferredKeywords: [],
  preferredLocations: [],
  // New structure: array of {language: string, level: string}
  languageRequirements: [],
  educationFields: [],
  updatedAt: null,
};

export const jobSettingsStorage = {
  /**
   * Save job settings to localStorage
   * @param {Object} settings - Job settings object
   * @param {string} settings.jobDescription - Markdown job description
   * @param {string[]} settings.requiredKeywords - Required skills/keywords
   * @param {string[]} settings.preferredKeywords - Preferred skills/keywords
   */
  save: (settings) => {
    if (typeof window === 'undefined') return;

    const settingsToSave = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      return true;
    } catch (error) {
      console.error('Failed to save job settings:', error);
      return false;
    }
  },

  /**
   * Load job settings from localStorage
   * @returns {Object|null} Job settings object or null if not found
   */
  load: () => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const settings = JSON.parse(saved);
      return settings;
    } catch (error) {
      console.error('Failed to load job settings:', error);
      return null;
    }
  },

  /**
   * Check if custom job settings exist
   * @returns {boolean} True if settings exist
   */
  exists: () => {
    if (typeof window === 'undefined') return false;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved !== null;
  },

  /**
   * Clear job settings from localStorage
   */
  clear: () => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear job settings:', error);
      return false;
    }
  },

  /**
   * Get default settings structure
   * @returns {Object} Default settings
   */
  getDefaults: () => ({ ...defaultSettings }),

  /**
   * Parse comma-separated keywords string into array
   * @param {string} keywordsString - Comma-separated keywords
   * @returns {string[]} Array of trimmed keywords
   */
  parseKeywords: (keywordsString) => {
    if (!keywordsString || typeof keywordsString !== 'string') return [];

    return keywordsString
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
  },

  /**
   * Format keywords array into comma-separated string
   * @param {string[]} keywordsArray - Array of keywords
   * @returns {string} Comma-separated string
   */
  formatKeywords: (keywordsArray) => {
    if (!Array.isArray(keywordsArray)) return '';
    return keywordsArray.join(', ');
  },

  /**
   * Convert saved settings to job requirements format
   * @param {Object} settings - Saved job settings
   * @returns {Object} Job requirements object compatible with evaluator
   */
  toJobRequirements: (settings) => {
    if (!settings) return null;

    const yearsExp = settings.yearsExperience ?? 0;

    return {
      positionAppliedFor: {
        title: settings.jobTitle || 'Custom Position',
        level: 'custom',
        department: 'Custom',
        roleType: 'custom',
      },
      experience: {
        yearsRequired: yearsExp,
        yearsPreferred: yearsExp + 1,
        mandatoryExperience: settings.requiredKeywords?.[0] || 'Relevant experience',
        relevantRoles: settings.requiredKeywords || [],
      },
      skills: {
        required: settings.requiredKeywords || [],
        preferred: settings.preferredKeywords || [],
        categories: {
          required: settings.requiredKeywords || [],
          preferred: settings.preferredKeywords || [],
        },
      },
      education: {
        minimumLevel: 'Any',
        preferredFields: settings.educationFields || [],
        alternatives: ['Bootcamp certification', 'Self-taught', 'Online courses'],
      },
      location: {
        preferred: settings.preferredLocations || [],
        acceptable: [],
      },
      languages: {
        required: {
          // New structure: array of {language, level} for per-language proficiency
          requirements: settings.languageRequirements || [],
          evidenceRequired: (settings.languageRequirements || []).length > 0,
        },
      },
      onboarding: {
        timeframe: 'Flexible',
        adaptabilityRequired: true,
      },
      evaluationSignals: {
        passion: {
          indicators: ['personal projects', 'open source', 'blogs', 'meetups', 'side projects'],
        },
        communication: {
          indicators: [
            'client-facing work',
            'leadership experience',
            'clear resume structure',
            'presentations',
          ],
        },
        brains: {
          indicators: [
            'complex problem-solving',
            'technical depth',
            'architecture decisions',
            'optimization',
          ],
        },
        selectivity: {
          indicators: [
            'selective job history',
            'bootcamp completion',
            'competitions',
            'continuous learning',
          ],
        },
        hardcore: {
          indicators: [
            'ambitious projects',
            'challenging work',
            'startup experience',
            'high-pressure situations',
          ],
        },
        diversity: {
          indicators: [
            'unique background',
            'international experience',
            'different industries',
            'varied perspectives',
          ],
        },
      },
      // Add the raw job description for LLM context
      customJobDescription: settings.jobDescription || '',
    };
  },
};
