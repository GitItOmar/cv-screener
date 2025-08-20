import { parse } from 'csv-parse/sync';

class CSVParser {
  /**
   * Parse CSV file and extract candidate data
   * @param {ArrayBuffer} buffer - CSV file buffer
   * @returns {Promise<string>} - Formatted text representation of CSV data
   */
  static async parse(buffer) {
    try {
      // Convert ArrayBuffer to string
      const csvString = new TextDecoder('utf-8').decode(buffer);

      if (!csvString.trim()) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV with various delimiter options
      const records = this.parseCSVString(csvString);

      if (!records || records.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      // Convert records to formatted text
      const formattedText = this.formatCSVAsText(records);

      return formattedText;
    } catch (error) {
      if (error.message.includes('Invalid CSV')) {
        throw new Error('Invalid CSV format or corrupted file');
      } else if (error.message.includes('empty')) {
        throw new Error('CSV file contains no data');
      } else {
        throw new Error(`CSV parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Parse CSV string with multiple delimiter attempts
   * @param {string} csvString - CSV content as string
   * @returns {Array} - Parsed records
   */
  static parseCSVString(csvString) {
    const delimiters = [',', ';', '\t', '|'];
    let bestResult = null;
    let maxColumns = 0;

    // Try different delimiters and pick the best one
    for (const delimiter of delimiters) {
      try {
        const records = parse(csvString, {
          delimiter,
          skip_empty_lines: true,
          trim: true,
          columns: true, // Use first row as header
          relax_column_count: true, // Allow inconsistent column counts
        });

        if (records.length > 0) {
          const columnCount = Object.keys(records[0]).length;

          if (columnCount > maxColumns) {
            maxColumns = columnCount;
            bestResult = records;
          }
        }
      } catch {
        // Skip to next delimiter if parsing fails
      }
    }

    if (!bestResult) {
      throw new Error('Invalid CSV format - no suitable delimiter found');
    }

    return bestResult;
  }

  /**
   * Format CSV records as readable text
   * @param {Array} records - Parsed CSV records
   * @returns {string} - Formatted text
   */
  static formatCSVAsText(records) {
    const formattedEntries = records.map((record, index) => {
      const entryNumber = index + 1;
      const sections = [];

      sections.push(`=== CANDIDATE ${entryNumber} ===`);

      // Map common field variations to standardized names
      const fieldMappings = this.getFieldMappings();
      const standardizedRecord = this.standardizeFields(record, fieldMappings);

      // Format each section
      if (standardizedRecord.basicInfo && Object.keys(standardizedRecord.basicInfo).length > 0) {
        sections.push('\n--- BASIC INFORMATION ---');
        Object.entries(standardizedRecord.basicInfo).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            sections.push(`${key}: ${value.toString().trim()}`);
          }
        });
      }

      if (standardizedRecord.contact && Object.keys(standardizedRecord.contact).length > 0) {
        sections.push('\n--- CONTACT INFORMATION ---');
        Object.entries(standardizedRecord.contact).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            sections.push(`${key}: ${value.toString().trim()}`);
          }
        });
      }

      if (
        standardizedRecord.professional &&
        Object.keys(standardizedRecord.professional).length > 0
      ) {
        sections.push('\n--- PROFESSIONAL INFORMATION ---');
        Object.entries(standardizedRecord.professional).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            sections.push(`${key}: ${value.toString().trim()}`);
          }
        });
      }

      if (standardizedRecord.other && Object.keys(standardizedRecord.other).length > 0) {
        sections.push('\n--- OTHER INFORMATION ---');
        Object.entries(standardizedRecord.other).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            sections.push(`${key}: ${value.toString().trim()}`);
          }
        });
      }

      return sections.join('\n');
    });

    const result = formattedEntries.join('\n\n');
    return result;
  }

  /**
   * Get field mappings for common CSV column variations
   * @returns {Object} - Field mappings
   */
  static getFieldMappings() {
    return {
      basicInfo: {
        'Full Name': ['name', 'full_name', 'fullname', 'candidate_name', 'applicant_name'],
        'First Name': ['first_name', 'firstname', 'fname'],
        'Last Name': ['last_name', 'lastname', 'lname'],
        Age: ['age'],
        Gender: ['gender', 'sex'],
        Location: ['location', 'city', 'address', 'residence'],
      },
      contact: {
        Email: ['email', 'email_address', 'mail', 'e_mail'],
        Phone: ['phone', 'phone_number', 'mobile', 'contact_number', 'tel'],
        LinkedIn: ['linkedin', 'linkedin_url', 'linkedin_profile'],
        Website: ['website', 'portfolio', 'personal_website'],
        GitHub: ['github', 'github_url', 'github_profile'],
      },
      professional: {
        'Current Position': ['position', 'current_position', 'job_title', 'role', 'title'],
        Company: ['company', 'current_company', 'employer', 'organization'],
        'Experience Years': [
          'experience',
          'years_experience',
          'total_experience',
          'work_experience',
        ],
        Skills: ['skills', 'technical_skills', 'competencies', 'expertise'],
        Education: ['education', 'degree', 'qualification', 'academic_background'],
        'Salary Expectation': ['salary', 'expected_salary', 'salary_expectation'],
        'Notice Period': ['notice_period', 'availability', 'joining_date'],
      },
      other: {},
    };
  }

  /**
   * Standardize field names and categorize data
   * @param {Object} record - Raw CSV record
   * @param {Object} mappings - Field mappings
   * @returns {Object} - Standardized record
   */
  static standardizeFields(record, mappings) {
    const standardized = {
      basicInfo: {},
      contact: {},
      professional: {},
      other: {},
    };

    // Process each field in the record
    Object.entries(record).forEach(([originalKey, value]) => {
      if (!value || !value.toString().trim()) return;

      const normalizedKey = originalKey.toLowerCase().replace(/\s+/g, '_');
      let mapped = false;

      // Try to map to standard categories
      for (const [category, categoryMappings] of Object.entries(mappings)) {
        for (const [standardName, variations] of Object.entries(categoryMappings)) {
          if (
            variations.includes(normalizedKey) ||
            variations.includes(originalKey.toLowerCase())
          ) {
            standardized[category][standardName] = value;
            mapped = true;
            break;
          }
        }
        if (mapped) break;
      }

      // If not mapped, put in "other" category
      if (!mapped) {
        standardized.other[originalKey] = value;
      }
    });

    return standardized;
  }

  /**
   * Validate if buffer contains valid CSV data
   * @param {ArrayBuffer} buffer - File buffer
   * @returns {boolean} - Whether buffer contains valid CSV
   */
  static isValidCSV(buffer) {
    try {
      const csvString = new TextDecoder('utf-8').decode(buffer);
      if (!csvString.trim()) return false;

      // Try to parse with common delimiters
      const delimiters = [',', ';', '\t'];
      for (const delimiter of delimiters) {
        try {
          const records = parse(csvString, {
            delimiter,
            skip_empty_lines: true,
            trim: true,
            columns: true,
            relax_column_count: true,
          });

          if (records.length > 0) return true;
        } catch {
          // Skip to next delimiter if parsing fails
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get CSV file statistics
   * @param {ArrayBuffer} buffer - CSV file buffer
   * @returns {Promise<Object>} - CSV statistics
   */
  static async getStatistics(buffer) {
    try {
      const csvString = new TextDecoder('utf-8').decode(buffer);
      const records = this.parseCSVString(csvString);

      const stats = {
        recordCount: records.length,
        columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
        columns: records.length > 0 ? Object.keys(records[0]) : [],
        hasEmail: false,
        hasPhone: false,
        hasName: false,
      };

      // Check for common fields
      if (records.length > 0) {
        const firstRecord = records[0];
        const keys = Object.keys(firstRecord).map((k) => k.toLowerCase());

        stats.hasEmail = keys.some((k) => k.includes('email') || k.includes('mail'));
        stats.hasPhone = keys.some(
          (k) => k.includes('phone') || k.includes('mobile') || k.includes('tel'),
        );
        stats.hasName = keys.some((k) => k.includes('name'));
      }

      return stats;
    } catch {
      return {};
    }
  }
}

export default CSVParser;
