/**
 * Job Context Utilities
 * Helper functions to work with job context data from extraction
 */

/**
 * Get role type display name
 * @param {string} roleType - Role type code
 * @returns {string} Display name
 */
export function getRoleTypeDisplayName(roleType) {
  const displayNames = {
    technical_ic: 'Individual Contributor',
    tech_lead: 'Technical Lead',
    eng_manager: 'Engineering Manager',
    exec_leader: 'Executive Leader',
  };

  return displayNames[roleType] || 'Unknown Role';
}

/**
 * Get domain focus display name
 * @param {string} domainFocus - Domain focus code
 * @returns {string} Display name
 */
export function getDomainFocusDisplayName(domainFocus) {
  const displayNames = {
    frontend: 'Frontend',
    backend: 'Backend',
    fullstack: 'Full Stack',
    mobile: 'Mobile',
    data: 'Data Science',
    infrastructure: 'Infrastructure',
    other: 'General',
  };

  return displayNames[domainFocus] || 'Unknown Domain';
}
