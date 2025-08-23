/**
 * Cost calculation and tracking utility
 * Supports multiple LLM providers with accurate pricing
 */
export class CostCalculator {
  constructor() {
    this.usage = [];
    this.totals = {
      cost: 0,
      tokens: 0,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
    this.providerTotals = new Map();
    this.modelTotals = new Map();
  }

  /**
   * Add usage record and calculate cost
   * @param {Object} record - Usage record
   * @param {string} record.provider - Provider name (openai, deepseek)
   * @param {string} record.model - Model name
   * @param {Object} record.usage - Token usage
   * @param {Date} record.timestamp - Request timestamp
   * @param {number} record.duration - Request duration in ms
   */
  addUsage(record) {
    const cost = this.calculateCost(record.provider, record.model, record.usage);

    const usageRecord = {
      ...record,
      cost,
      id: this.generateId(),
    };

    this.usage.push(usageRecord);
    this.updateTotals(usageRecord);

    return usageRecord;
  }

  /**
   * Calculate cost for specific provider/model/usage
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   * @param {Object} usage - Usage object with token counts
   * @returns {number} Cost in USD
   */
  calculateCost(provider, model, usage) {
    const pricing = this.getPricing(provider, model);
    if (!pricing) {
      return 0; // Unknown model, can't calculate cost
    }

    const inputCost = (usage.promptTokens / 1000000) * pricing.input;
    const outputCost = (usage.completionTokens / 1000000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get pricing for provider/model combination
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   * @returns {Object|null} Pricing object with input/output rates per million tokens
   */
  getPricing(provider, model) {
    const pricing = {
      openai: {
        'gpt-4o': { input: 5.0, output: 15.0 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-4-turbo': { input: 10.0, output: 30.0 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'gpt-3.5-turbo-16k': { input: 3.0, output: 4.0 },
      },
      deepseek: {
        'deepseek-chat': { input: 0.14, output: 0.28 },
        'deepseek-coder': { input: 0.14, output: 0.28 },
      },
    };

    return pricing[provider.toLowerCase()]?.[model] || null;
  }

  /**
   * Update internal totals
   * @param {Object} record - Usage record
   * @private
   */
  updateTotals(record) {
    // Global totals
    this.totals.cost += record.cost;
    this.totals.tokens += record.usage.totalTokens;
    this.totals.requests += 1;
    this.totals.promptTokens += record.usage.promptTokens;
    this.totals.completionTokens += record.usage.completionTokens;

    // Provider totals
    const providerKey = record.provider.toLowerCase();
    if (!this.providerTotals.has(providerKey)) {
      this.providerTotals.set(providerKey, {
        cost: 0,
        tokens: 0,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
      });
    }

    const providerTotal = this.providerTotals.get(providerKey);
    providerTotal.cost += record.cost;
    providerTotal.tokens += record.usage.totalTokens;
    providerTotal.requests += 1;
    providerTotal.promptTokens += record.usage.promptTokens;
    providerTotal.completionTokens += record.usage.completionTokens;

    // Model totals
    const modelKey = `${record.provider}:${record.model}`;
    if (!this.modelTotals.has(modelKey)) {
      this.modelTotals.set(modelKey, {
        cost: 0,
        tokens: 0,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        provider: record.provider,
        model: record.model,
      });
    }

    const modelTotal = this.modelTotals.get(modelKey);
    modelTotal.cost += record.cost;
    modelTotal.tokens += record.usage.totalTokens;
    modelTotal.requests += 1;
    modelTotal.promptTokens += record.usage.promptTokens;
    modelTotal.completionTokens += record.usage.completionTokens;
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Complete usage statistics
   */
  getStats() {
    const providerStats = {};
    for (const [provider, stats] of this.providerTotals) {
      providerStats[provider] = { ...stats };
    }

    const modelStats = {};
    for (const [modelKey, stats] of this.modelTotals) {
      modelStats[modelKey] = { ...stats };
    }

    return {
      total: { ...this.totals },
      byProvider: providerStats,
      byModel: modelStats,
      recordCount: this.usage.length,
      timespan: this.getTimespan(),
      averages: this.calculateAverages(),
    };
  }

  /**
   * Get usage records with filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.provider - Filter by provider
   * @param {string} filters.model - Filter by model
   * @param {Date} filters.since - Records since this date
   * @param {Date} filters.until - Records until this date
   * @param {number} filters.limit - Maximum number of records
   * @returns {Array} Filtered usage records
   */
  getUsage(filters = {}) {
    let filtered = [...this.usage];

    if (filters.provider) {
      filtered = filtered.filter(
        (r) => r.provider.toLowerCase() === filters.provider.toLowerCase(),
      );
    }

    if (filters.model) {
      filtered = filtered.filter((r) => r.model === filters.model);
    }

    if (filters.since) {
      filtered = filtered.filter((r) => r.timestamp >= filters.since);
    }

    if (filters.until) {
      filtered = filtered.filter((r) => r.timestamp <= filters.until);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get time-based usage breakdown
   * @param {string} period - Time period ('hour', 'day', 'week', 'month')
   * @returns {Object} Usage breakdown by time period
   */
  getUsageByTime(period = 'day') {
    const breakdown = new Map();

    for (const record of this.usage) {
      const key = this.getTimePeriodKey(record.timestamp, period);

      if (!breakdown.has(key)) {
        breakdown.set(key, {
          cost: 0,
          tokens: 0,
          requests: 0,
          promptTokens: 0,
          completionTokens: 0,
        });
      }

      const periodStats = breakdown.get(key);
      periodStats.cost += record.cost;
      periodStats.tokens += record.usage.totalTokens;
      periodStats.requests += 1;
      periodStats.promptTokens += record.usage.promptTokens;
      periodStats.completionTokens += record.usage.completionTokens;
    }

    // Convert to sorted array
    return Array.from(breakdown.entries())
      .map(([period, stats]) => ({ period, ...stats }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate averages
   * @returns {Object} Average statistics
   * @private
   */
  calculateAverages() {
    if (this.totals.requests === 0) {
      return {
        costPerRequest: 0,
        tokensPerRequest: 0,
        tokensPerDollar: 0,
        promptTokensPerRequest: 0,
        completionTokensPerRequest: 0,
      };
    }

    return {
      costPerRequest: this.totals.cost / this.totals.requests,
      tokensPerRequest: this.totals.tokens / this.totals.requests,
      tokensPerDollar: this.totals.cost > 0 ? this.totals.tokens / this.totals.cost : 0,
      promptTokensPerRequest: this.totals.promptTokens / this.totals.requests,
      completionTokensPerRequest: this.totals.completionTokens / this.totals.requests,
    };
  }

  /**
   * Get timespan of usage records
   * @returns {Object} Timespan information
   * @private
   */
  getTimespan() {
    if (this.usage.length === 0) {
      return { start: null, end: null, duration: 0 };
    }

    const timestamps = this.usage.map((r) => r.timestamp);
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    const duration = end - start;

    return { start, end, duration };
  }

  /**
   * Get time period key for grouping
   * @param {Date} date - Date to convert
   * @param {string} period - Period type
   * @returns {string} Period key
   * @private
   */
  getTimePeriodKey(date, period) {
    const d = new Date(date);

    switch (period) {
      case 'hour': {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      }
      case 'day': {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      case 'week': {
        const week = this.getWeekNumber(d);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      case 'month': {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      default: {
        return d.toISOString().split('T')[0];
      }
    }
  }

  /**
   * Get week number for date
   * @param {Date} date - Date object
   * @returns {number} Week number
   * @private
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /**
   * Generate unique ID for usage record
   * @returns {string} Unique ID
   * @private
   */
  generateId() {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export usage data
   * @param {string} format - Export format ('json', 'csv')
   * @param {Object} options - Export options
   * @returns {string} Exported data
   */
  export(format = 'json', options = {}) {
    const data = this.getUsage(options.filters);

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(
          {
            usage: data,
            stats: this.getStats(),
            exported: new Date().toISOString(),
          },
          null,
          2,
        );

      case 'csv':
        return this.exportCSV(data);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as CSV
   * @param {Array} data - Usage data
   * @returns {string} CSV string
   * @private
   */
  exportCSV(data) {
    if (data.length === 0) return 'No data to export';

    const headers = [
      'timestamp',
      'provider',
      'model',
      'prompt_tokens',
      'completion_tokens',
      'total_tokens',
      'cost',
      'duration',
    ];

    const rows = data.map((record) => [
      record.timestamp.toISOString(),
      record.provider,
      record.model,
      record.usage.promptTokens,
      record.usage.completionTokens,
      record.usage.totalTokens,
      record.cost.toFixed(6),
      record.duration || 0,
    ]);

    return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(',')).join('\n');
  }

  /**
   * Reset all tracking data
   */
  reset() {
    this.usage = [];
    this.totals = {
      cost: 0,
      tokens: 0,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
    this.providerTotals.clear();
    this.modelTotals.clear();
  }

  /**
   * Get cost projection based on current usage
   * @param {string} period - Projection period ('day', 'week', 'month')
   * @returns {Object} Cost projection
   */
  getProjection(period = 'month') {
    const stats = this.getStats();
    if (!stats.timespan.duration || stats.total.requests === 0) {
      return { projection: 0, period, confidence: 'low' };
    }

    const hoursOfData = stats.timespan.duration / (1000 * 60 * 60);
    const costPerHour = stats.total.cost / hoursOfData;

    const periodHours = {
      day: 24,
      week: 24 * 7,
      month: 24 * 30,
    };

    const projection = costPerHour * periodHours[period];
    const confidence = hoursOfData > 24 ? 'high' : hoursOfData > 6 ? 'medium' : 'low';

    return {
      projection,
      period,
      confidence,
      basedOnHours: Math.round(hoursOfData * 10) / 10,
      averageCostPerHour: costPerHour,
    };
  }
}
