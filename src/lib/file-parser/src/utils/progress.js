/**
 * Progress reporting utilities for file parsing operations
 */

/**
 * Progress reporter class for tracking parsing operations
 */
export class ProgressReporter {
  /**
   * Create a progress reporter
   * @param {Function} callback - Progress callback function
   * @param {Object} options - Reporter options
   */
  constructor(callback, options = {}) {
    this.callback = callback || (() => {});
    this.total = options.total || 100;
    this.current = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.updateInterval = options.updateInterval !== undefined ? options.updateInterval : 100; // ms
    this.stage = 'initialization';
    this.stages = options.stages || [];
    this.currentStageIndex = 0;
  }

  /**
   * Update progress
   * @param {number} progress - Progress value (0-100)
   * @param {string} message - Progress message
   * @param {Object} details - Additional details
   */
  update(progress, message = '', details = {}) {
    this.current = Math.min(Math.max(progress, 0), this.total);

    const now = Date.now();
    if (
      this.updateInterval > 0 &&
      now - this.lastUpdateTime < this.updateInterval &&
      progress < this.total
    ) {
      return; // Skip update if too frequent
    }

    this.lastUpdateTime = now;

    const progressData = {
      progress: this.current,
      percentage: Math.round((this.current / this.total) * 100),
      message,
      stage: this.stage,
      elapsed: now - this.startTime,
      estimated: this._estimateTimeRemaining(),
      ...details,
    };

    try {
      this.callback(progressData);
    } catch (error) {
      console.warn('Progress callback error:', error);
    }
  }

  /**
   * Set current stage
   * @param {string} stage - Stage name
   * @param {number} stageProgress - Progress within stage (0-100)
   */
  setStage(stage, stageProgress = 0) {
    this.stage = stage;

    // If using predefined stages, calculate overall progress
    if (this.stages.length > 0) {
      const stageIndex = this.stages.indexOf(stage);
      if (stageIndex !== -1) {
        this.currentStageIndex = stageIndex;
        const stageWeight = 100 / this.stages.length;
        const overallProgress = stageIndex * stageWeight + (stageProgress * stageWeight) / 100;
        this.update(overallProgress, `${stage}...`);
        return;
      }
    }

    this.update(this.current, `${stage}...`);
  }

  /**
   * Mark stage as complete
   * @param {string} stage - Stage name
   */
  completeStage(stage) {
    if (this.stages.length > 0) {
      const stageIndex = this.stages.indexOf(stage);
      if (stageIndex !== -1) {
        const stageWeight = 100 / this.stages.length;
        const overallProgress = (stageIndex + 1) * stageWeight;
        this.update(overallProgress, `${stage} complete`);
        return;
      }
    }

    this.update(this.current, `${stage} complete`);
  }

  /**
   * Complete all progress
   * @param {string} message - Completion message
   */
  complete(message = 'Complete') {
    this.update(this.total, message);
  }

  /**
   * Report error state
   * @param {string|Error} error - Error message or object
   */
  error(error) {
    const message = error instanceof Error ? error.message : error;
    this.update(this.current, `Error: ${message}`, { error: true });
  }

  /**
   * Create a sub-reporter for a portion of the progress
   * @param {number} startPercent - Start percentage
   * @param {number} endPercent - End percentage
   * @returns {ProgressReporter} Sub-reporter
   */
  createSubReporter(startPercent, endPercent) {
    const range = endPercent - startPercent;

    return new ProgressReporter((subProgress) => {
      const mappedProgress = startPercent + (subProgress.percentage * range) / 100;
      this.update(mappedProgress, subProgress.message, subProgress);
    });
  }

  /**
   * Estimate time remaining based on current progress
   * @private
   */
  _estimateTimeRemaining() {
    if (this.current === 0) return null;

    const elapsed = Date.now() - this.startTime;
    const rate = this.current / elapsed;
    const remaining = (this.total - this.current) / rate;

    return Math.round(remaining);
  }
}

/**
 * Create a simple progress function
 * @param {Function} callback - Progress callback
 * @param {Array} stages - Stage names for structured progress
 * @param {Object} options - Options for the progress reporter
 * @returns {Function} Progress function
 */
export function createProgressFunction(callback, stages = [], options = {}) {
  if (!callback || typeof callback !== 'function') {
    return () => {}; // No-op function
  }

  const reporterOptions = { stages, ...options };
  const reporter = new ProgressReporter(callback, reporterOptions);

  return (progress, message, details) => {
    if (typeof progress === 'string') {
      // Called as (stage, stageProgress)
      reporter.setStage(progress, message || 0);
    } else {
      // Called as (progress, message, details)
      reporter.update(progress, message, details);
    }
  };
}

/**
 * Create a throttled progress function
 * @param {Function} callback - Progress callback
 * @param {number} interval - Throttle interval in ms
 * @returns {Function} Throttled progress function
 */
export function createThrottledProgress(callback, interval = 100) {
  let lastCall = 0;
  let lastProgress = -1;

  return (progress, message, details) => {
    const now = Date.now();

    // Always call for completion (100%) or significant changes
    const significantChange = Math.abs(progress - lastProgress) >= 5;
    const shouldCall = progress >= 100 || significantChange || now - lastCall >= interval;

    if (shouldCall && callback) {
      lastCall = now;
      lastProgress = progress;

      const progressData = {
        progress,
        percentage: Math.round(progress),
        message: message || '',
        timestamp: now,
        ...details,
      };

      callback(progressData);
    }
  };
}

/**
 * Combine multiple progress sources into one
 * @param {Function} callback - Combined progress callback
 * @param {Array} weights - Weight for each source (must sum to 1.0)
 * @returns {Array} Array of progress functions for each source
 */
export function createCombinedProgress(callback, weights = []) {
  const sources = new Array(weights.length).fill(0);

  const updateCombined = () => {
    const totalProgress = sources.reduce((sum, progress, index) => {
      return sum + progress * (weights[index] || 1 / sources.length);
    }, 0);

    callback(totalProgress, 'Processing...', { sources });
  };

  return weights.map((_, index) => {
    return (progress) => {
      sources[index] = progress;
      updateCombined();
    };
  });
}

/**
 * Default parsing stages for consistent progress reporting
 */
export const PARSING_STAGES = [
  'validation',
  'metadata-extraction',
  'content-parsing',
  'text-processing',
  'finalization',
];

/**
 * Progress utilities for common parsing operations
 */
export const ProgressUtils = {
  /**
   * Create parser progress reporter
   */
  forParser(callback) {
    return createProgressFunction(callback, PARSING_STAGES);
  },

  /**
   * Create validation progress
   */
  forValidation(callback) {
    return createProgressFunction(callback, [
      'file-check',
      'type-detection',
      'validation-complete',
    ]);
  },

  /**
   * Create batch processing progress
   */
  forBatch(callback, fileCount) {
    let currentFile = 0;

    return {
      nextFile: () => {
        currentFile++;
        const progress = (currentFile / fileCount) * 100;
        callback(progress, `Processing file ${currentFile} of ${fileCount}`);
      },

      fileProgress: (progress, message) => {
        const fileWeight = 100 / fileCount;
        const baseProgress = ((currentFile - 1) / fileCount) * 100;
        const totalProgress = baseProgress + (progress * fileWeight) / 100;
        callback(totalProgress, message || 'Processing...');
      },
    };
  },
};
