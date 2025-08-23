/**
 * Critical Keyword Detection System
 * Ensures 100% detection rate for critical business keywords
 */

class KeywordDetector {
  constructor() {
    // Critical keywords with their synonyms and variations
    this.criticalKeywords = {
      shopify: {
        priority: 1,
        variations: [
          'shopify',
          'shopify plus',
          'shopify themes',
          'shopify theme',
          'shopify development',
          'shopify developer',
          'shopify store',
          'shopify app',
          'shopify api',
          'shopify liquid',
          'shopify partner',
          'shopify expert',
          'shopify migrations',
          'shopify integration',
        ],
        patterns: [
          /shopify/gi,
          /liquid\s*(?:template|templating|language)?/gi,
          /theme\s*kit/gi,
          /polaris/gi,
        ],
        weight: 1.0,
        critical: true,
      },
      ecommerce: {
        priority: 2,
        variations: [
          'e-commerce',
          'ecommerce',
          'e commerce',
          'online store',
          'online shop',
          'webshop',
          'web shop',
          'digital commerce',
          'online retail',
          'online marketplace',
        ],
        patterns: [
          /e[\s-]?commerce/gi,
          /online\s+(?:store|shop|retail)/gi,
          /web[\s-]?shop/gi,
          /digital\s+commerce/gi,
        ],
        weight: 0.5,
        critical: false,
      },
      liquid: {
        priority: 2,
        variations: ['liquid', 'liquid template', 'liquid templating', 'liquid language'],
        patterns: [/liquid\s*(?:template|templating|language)?/gi],
        weight: 0.8,
        critical: false,
        contextRequired: true, // Only count if appears with Shopify context
      },
      migrations: {
        priority: 3,
        variations: [
          'migration',
          'migrations',
          'data migration',
          'platform migration',
          'shopify migration',
          'store migration',
        ],
        patterns: [/(?:data|platform|shopify|store)?\s*migrations?/gi],
        weight: 0.3,
        critical: false,
      },
    };

    // Detection log for monitoring
    this.detectionLog = [];
    this.lastScanResult = null;
  }

  /**
   * Pre-extraction keyword scanner
   * Scans raw text for critical keywords before LLM processing
   * @param {string} text - Raw text to scan
   * @returns {Object} Scan results with detected keywords
   */
  scanText(text) {
    if (!text || typeof text !== 'string') {
      return this.createScanResult(false, 'Invalid or empty text input');
    }

    const normalizedText = this.normalizeText(text);
    const detectedKeywords = {};
    const missingCritical = [];
    let hasCriticalKeywords = false;

    // Scan for each keyword category
    for (const [keyword, config] of Object.entries(this.criticalKeywords)) {
      const detection = this.detectKeyword(normalizedText, config, keyword);
      detectedKeywords[keyword] = detection;

      if (config.critical) {
        if (detection.found) {
          hasCriticalKeywords = true;
        } else {
          missingCritical.push(keyword);
        }
      }
    }

    // Apply context rules
    this.applyContextRules(detectedKeywords, normalizedText);

    const result = this.createScanResult(
      hasCriticalKeywords || missingCritical.length === 0,
      hasCriticalKeywords
        ? 'Critical keywords detected'
        : `Missing critical keywords: ${missingCritical.join(', ')}`,
      detectedKeywords,
      missingCritical,
    );

    this.lastScanResult = result;
    this.logDetection('pre-extraction', result);

    return result;
  }

  /**
   * Post-extraction validation
   * Validates extracted data contains expected keywords
   * @param {Object} extractedData - Extracted resume data
   * @param {string} originalText - Original text for comparison
   * @returns {Object} Validation results
   */
  validateExtraction(extractedData, originalText) {
    const preScanResult = this.lastScanResult || this.scanText(originalText);
    const extractionText = this.extractDataToText(extractedData);
    const postScanResult = this.scanText(extractionText);

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      keywordComparison: {},
    };

    // Compare pre and post extraction keyword detection
    for (const keyword of Object.keys(this.criticalKeywords)) {
      const preDetection = preScanResult.detectedKeywords[keyword];
      const postDetection = postScanResult.detectedKeywords[keyword];

      validation.keywordComparison[keyword] = {
        foundInOriginal: preDetection.found,
        foundInExtraction: postDetection.found,
        preserved: preDetection.found === postDetection.found,
      };

      // Critical keyword validation
      if (this.criticalKeywords[keyword].critical) {
        if (preDetection.found && !postDetection.found) {
          validation.valid = false;
          validation.errors.push(
            `Critical keyword '${keyword}' found in original but missing in extraction`,
          );
        }
      }
    }

    // Additional validation for Shopify-specific fields
    if (preScanResult.detectedKeywords.shopify?.found) {
      validation.shopifyValidation = this.validateShopifyExtraction(extractedData);
      if (!validation.shopifyValidation.valid) {
        validation.warnings.push(...validation.shopifyValidation.warnings);
      }
    }

    this.logDetection('post-extraction', validation);
    return validation;
  }

  /**
   * Detect keyword presence with variations and patterns
   * @private
   */
  detectKeyword(text, config) {
    const matches = [];
    let found = false;
    let count = 0;

    // Check variations
    for (const variation of config.variations) {
      const regex = new RegExp(`\\b${this.escapeRegex(variation)}\\b`, 'gi');
      const variationMatches = text.match(regex);
      if (variationMatches) {
        found = true;
        count += variationMatches.length;
        matches.push(...variationMatches.map((m) => ({ type: 'variation', value: m })));
      }
    }

    // Check patterns
    for (const pattern of config.patterns) {
      const patternMatches = text.match(pattern);
      if (patternMatches) {
        found = true;
        count += patternMatches.length;
        matches.push(...patternMatches.map((m) => ({ type: 'pattern', value: m })));
      }
    }

    return {
      found,
      count,
      matches: matches.slice(0, 10), // Limit matches for logging
      confidence: found ? this.calculateConfidence(count, config.weight) : 0,
    };
  }

  /**
   * Apply context-based rules for keyword detection
   * @private
   */
  applyContextRules(detectedKeywords) {
    // Liquid should only count if Shopify is also present
    if (detectedKeywords.liquid?.found && this.criticalKeywords.liquid.contextRequired) {
      if (!detectedKeywords.shopify?.found) {
        detectedKeywords.liquid.found = false;
        detectedKeywords.liquid.confidence *= 0.1;
        detectedKeywords.liquid.contextNote = 'Liquid found but no Shopify context';
      }
    }

    // Boost ecommerce confidence if Shopify is found
    if (detectedKeywords.shopify?.found && detectedKeywords.ecommerce?.found) {
      detectedKeywords.ecommerce.confidence = Math.min(
        1.0,
        detectedKeywords.ecommerce.confidence * 1.5,
      );
    }
  }

  /**
   * Validate Shopify-specific extraction
   * @private
   */
  validateShopifyExtraction(extractedData) {
    const validation = {
      valid: true,
      warnings: [],
    };

    // Check work experience for Shopify mentions
    const workExperience = extractedData.workExperience || [];
    let shopifyInExperience = false;

    for (const job of workExperience) {
      const jobText = JSON.stringify(job).toLowerCase();
      if (jobText.includes('shopify')) {
        shopifyInExperience = true;
        break;
      }
    }

    // Check skills for Shopify-related skills
    const skills = extractedData.skillsAndSpecialties || {};
    const allSkills = [
      ...(skills.technical || []),
      ...(skills.frameworks || []),
      ...(skills.tools || []),
    ]
      .join(' ')
      .toLowerCase();

    const shopifyInSkills = allSkills.includes('shopify') || allSkills.includes('liquid');

    if (!shopifyInExperience && !shopifyInSkills) {
      validation.valid = false;
      validation.warnings.push(
        'Shopify keyword detected in original but not properly extracted in work experience or skills',
      );
    }

    return validation;
  }

  /**
   * Enhanced keyword injection for extraction improvement
   * Ensures critical keywords are preserved during extraction
   * @param {string} text - Original text
   * @param {Object} scanResult - Pre-scan results
   * @returns {string} Enhanced text with keyword markers
   */
  enhanceTextForExtraction(text, scanResult) {
    if (!scanResult || !scanResult.detectedKeywords) {
      scanResult = this.scanText(text);
    }

    let enhancedText = text;

    // Add explicit markers for critical keywords
    for (const [keyword, detection] of Object.entries(scanResult.detectedKeywords)) {
      if (detection.found && this.criticalKeywords[keyword].critical) {
        // Add a clear marker that the LLM should preserve
        const marker = `\n[CRITICAL_KEYWORD: ${keyword.toUpperCase()} - MUST BE PRESERVED IN EXTRACTION]\n`;
        enhancedText = marker + enhancedText;
      }
    }

    return enhancedText;
  }

  /**
   * Convert extracted data back to text for validation
   * @private
   */
  extractDataToText(data) {
    if (!data || typeof data !== 'object') {
      return '';
    }

    const textParts = [];

    // Recursively extract all text values
    const extractText = (obj, depth = 0) => {
      if (depth > 10) return; // Prevent infinite recursion

      if (typeof obj === 'string') {
        textParts.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach((item) => extractText(item, depth + 1));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach((value) => extractText(value, depth + 1));
      }
    };

    extractText(data);
    return textParts.join(' ');
  }

  /**
   * Normalize text for consistent matching
   * @private
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // Em/en dashes
      .replace(/\s+/g, ' ') // Multiple spaces
      .trim();
  }

  /**
   * Escape regex special characters
   * @private
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate confidence score for keyword detection
   * @private
   */
  calculateConfidence(count, weight) {
    // Logarithmic confidence scaling
    const baseConfidence = Math.min(1.0, Math.log(count + 1) / Math.log(10));
    return baseConfidence * weight;
  }

  /**
   * Create standardized scan result
   * @private
   */
  createScanResult(success, message, detectedKeywords = {}, missingCritical = []) {
    return {
      success,
      message,
      timestamp: new Date().toISOString(),
      detectedKeywords,
      missingCritical,
      summary: {
        totalDetected: Object.values(detectedKeywords).filter((k) => k.found).length,
        criticalDetected: Object.entries(detectedKeywords).filter(
          ([key, val]) => val.found && this.criticalKeywords[key].critical,
        ).length,
        criticalMissing: missingCritical.length,
      },
    };
  }

  /**
   * Log detection for monitoring
   * @private
   */
  logDetection(phase, result) {
    const logEntry = {
      phase,
      timestamp: new Date().toISOString(),
      result: {
        success: result.success || result.valid,
        summary: result.summary || {},
        errors: result.errors || [],
        warnings: result.warnings || [],
      },
    };

    this.detectionLog.push(logEntry);

    // Keep only last 100 entries
    if (this.detectionLog.length > 100) {
      this.detectionLog = this.detectionLog.slice(-100);
    }
  }

  /**
   * Get detection statistics
   */
  getStatistics() {
    const stats = {
      totalScans: this.detectionLog.length,
      successfulScans: this.detectionLog.filter((l) => l.result.success).length,
      failedScans: this.detectionLog.filter((l) => !l.result.success).length,
      byPhase: {},
    };

    for (const log of this.detectionLog) {
      if (!stats.byPhase[log.phase]) {
        stats.byPhase[log.phase] = { total: 0, successful: 0, failed: 0 };
      }
      stats.byPhase[log.phase].total++;
      if (log.result.success) {
        stats.byPhase[log.phase].successful++;
      } else {
        stats.byPhase[log.phase].failed++;
      }
    }

    return stats;
  }

  /**
   * Clear detection log
   */
  clearLog() {
    this.detectionLog = [];
    this.lastScanResult = null;
  }
}

// Export singleton instance
export const keywordDetector = new KeywordDetector();
