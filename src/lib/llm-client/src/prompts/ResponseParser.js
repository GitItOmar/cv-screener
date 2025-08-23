/**
 * Response parser for handling LLM JSON outputs
 * Always expects and parses JSON responses
 */
export class ResponseParser {
  constructor(config = {}) {
    this.config = {
      strictJSON: false,
      ...config,
    };
    this.schemas = new Map();
  }

  /**
   * Parse LLM JSON response
   * @param {Object} response - LLM response object
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed and validated response
   */
  parse(response, options = {}) {
    const schema = options.schema;

    try {
      let parsed = this.parseJSON(response.content, options);

      // Apply schema validation if provided
      if (schema) {
        parsed = this.validateSchema(parsed, schema);
      }

      return {
        success: true,
        data: parsed,
        format: 'json',
        metadata: {
          originalResponse: response,
          parsingTime: Date.now() - (options._startTime || Date.now()),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
        format: 'json',
        metadata: {
          originalResponse: response,
          originalContent: response.content,
        },
      };
    }
  }

  /**
   * Parse JSON response content
   * @param {string} content - Response content
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed JSON object
   */
  parseJSON(content, options = {}) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content for JSON parsing');
    }

    // Clean the content
    const cleaned = this.cleanJSONContent(content);

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      if (options.fallback && !this.config.strictJSON) {
        return this.parseStructured(content, options);
      }
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean JSON content for parsing
   * @param {string} content - Raw JSON content
   * @returns {string} Cleaned JSON string
   */
  cleanJSONContent(content) {
    // Remove markdown code blocks
    let cleaned = content.replace(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/g, '$1');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    // Try to extract JSON from text if it's embedded
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    return cleaned;
  }

  /**
   * Validate response against schema
   * @param {any} data - Data to validate
   * @param {Object} schema - Validation schema
   * @returns {any} Validated data
   */
  validateSchema(data, schema) {
    if (!schema) return data;

    const errors = [];
    const validated = this.validateRecursive(data, schema, '', errors);

    if (errors.length > 0) {
      throw new Error(`Schema validation failed: ${errors.join(', ')}`);
    }

    return validated;
  }

  /**
   * Recursive schema validation
   * @param {any} data - Data to validate
   * @param {Object} schema - Schema object
   * @param {string} path - Current path
   * @param {Array} errors - Error array
   * @returns {any} Validated data
   */
  validateRecursive(data, schema, path, errors) {
    if (schema.type) {
      const actualType = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
      const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];

      if (!allowedTypes.includes(actualType)) {
        errors.push(`${path}: expected ${allowedTypes.join(' or ')}, got ${actualType}`);
        return data;
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`${path}: missing required field '${field}'`);
        }
      }
    }

    if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
      const validated = {};
      for (const [key, value] of Object.entries(data)) {
        const fieldSchema = schema.properties[key];
        if (fieldSchema) {
          validated[key] = this.validateRecursive(value, fieldSchema, `${path}.${key}`, errors);
        } else {
          validated[key] = value;
        }
      }
      return validated;
    }

    return data;
  }

  /**
   * Add a reusable schema
   * @param {string} name - Schema name
   * @param {Object} schema - Schema definition
   */
  addSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * Get a stored schema
   * @param {string} name - Schema name
   * @returns {Object|null} Schema definition
   */
  getSchema(name) {
    return this.schemas.get(name) || null;
  }

  /**
   * Parse response with streaming support
   * @param {AsyncGenerator} stream - Response stream
   * @param {Object} options - Parsing options
   * @returns {AsyncGenerator} Parsed stream chunks
   */
  async *parseStream(stream, options = {}) {
    let buffer = '';

    for await (const chunk of stream) {
      if (chunk.delta) {
        buffer += chunk.content;
        yield chunk;
      } else {
        // Final chunk - parse complete JSON content
        const final = this.parse({ content: buffer }, options);
        yield {
          ...chunk,
          parsed: final.success ? final.data : null,
          parsingError: final.success ? null : final.error,
          accumulated: buffer,
        };
      }
    }
  }
}
