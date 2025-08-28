/**
 * Response parser for handling LLM JSON outputs
 * Always expects and parses JSON responses
 */
export class ResponseParser {
  /**
   * Parse LLM JSON response
   * @param {string|Object} response - LLM response (string or object with content)
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed and validated response
   */
  parse(response) {
    // Handle both string and object responses
    const content = typeof response === 'string' ? response : response.content;

    try {
      const parsed = this.parseJSON(content);

      return {
        success: true,
        data: parsed,
        format: 'json',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
        format: 'json',
      };
    }
  }

  /**
   * Parse JSON response content
   * @param {string} content - Response content
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed JSON object
   */
  parseJSON(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content for JSON parsing');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }
}
