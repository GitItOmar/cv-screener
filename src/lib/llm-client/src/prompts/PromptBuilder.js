/**
 * Advanced prompt builder with template-based system and variable substitution
 */
export class PromptBuilder {
  constructor() {
    this.messages = [];
    this.variables = {};
    this.role = null;
    this.responseFormat = null;
    this.templates = new Map();
    this.validation = {
      required: new Set(),
      types: new Map(),
    };
  }

  /**
   * Set the agent role for context
   * @param {string} role - The agent role (e.g., 'text_analyzer', 'assistant')
   * @returns {PromptBuilder} This instance for chaining
   */
  setRole(role) {
    this.role = role;
    return this;
  }

  /**
   * Add a system message
   * @param {string} content - System message content
   * @returns {PromptBuilder} This instance for chaining
   */
  addSystemMessage(content) {
    this.messages.push({
      role: 'system',
      content: this.processTemplate(content),
    });
    return this;
  }

  /**
   * Add a user message
   * @param {string} content - User message content
   * @returns {PromptBuilder} This instance for chaining
   */
  addUserMessage(content) {
    this.messages.push({
      role: 'user',
      content: this.processTemplate(content),
    });
    return this;
  }

  /**
   * Add an assistant message
   * @param {string} content - Assistant message content
   * @returns {PromptBuilder} This instance for chaining
   */
  addAssistantMessage(content) {
    this.messages.push({
      role: 'assistant',
      content: this.processTemplate(content),
    });
    return this;
  }

  /**
   * Add a message with custom role
   * @param {string} role - Message role
   * @param {string} content - Message content
   * @returns {PromptBuilder} This instance for chaining
   */
  addMessage(role, content) {
    this.messages.push({
      role,
      content: this.processTemplate(content),
    });
    return this;
  }

  /**
   * Set template variables
   * @param {Object} variables - Variables to substitute in templates
   * @returns {PromptBuilder} This instance for chaining
   */
  withVariables(variables) {
    this.variables = { ...this.variables, ...variables };
    return this;
  }

  /**
   * Add a single variable
   * @param {string} key - Variable key
   * @param {any} value - Variable value
   * @returns {PromptBuilder} This instance for chaining
   */
  addVariable(key, value) {
    this.variables[key] = value;
    return this;
  }

  /**
   * Enable JSON response format (always enabled)
   * @returns {PromptBuilder} This instance for chaining
   * @deprecated Response format is always JSON
   */
  withResponseFormat() {
    // Always JSON format - method kept for backward compatibility
    this.responseFormat = 'json_object';
    return this;
  }

  /**
   * Add a reusable template
   * @param {string} name - Template name
   * @param {string} template - Template content
   * @returns {PromptBuilder} This instance for chaining
   */
  addTemplate(name, template) {
    this.templates.set(name, template);
    return this;
  }

  /**
   * Use a predefined template
   * @param {string} name - Template name
   * @param {Object} variables - Variables for this template
   * @returns {PromptBuilder} This instance for chaining
   */
  useTemplate(name, variables = {}) {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }

    const content = this.processTemplate(template, variables);
    this.addUserMessage(content);
    return this;
  }

  /**
   * Add validation rules
   * @param {Object} rules - Validation rules
   * @param {Array<string>} rules.required - Required variable names
   * @param {Object} rules.types - Variable type requirements
   * @returns {PromptBuilder} This instance for chaining
   */
  withValidation(rules) {
    if (rules.required) {
      rules.required.forEach((key) => this.validation.required.add(key));
    }
    if (rules.types) {
      Object.entries(rules.types).forEach(([key, type]) => {
        this.validation.types.set(key, type);
      });
    }
    return this;
  }

  /**
   * Add conditional content based on variables
   * @param {string} condition - Variable name to check
   * @param {string} trueContent - Content when condition is truthy
   * @param {string} falseContent - Content when condition is falsy (optional)
   * @returns {PromptBuilder} This instance for chaining
   */
  addConditional(condition, trueContent, falseContent = '') {
    const content = this.variables[condition] ? trueContent : falseContent;
    if (content) {
      this.addUserMessage(content);
    }
    return this;
  }

  /**
   * Build the final prompt structure
   * @returns {Object} Prompt configuration object
   */
  build() {
    this.validateVariables();
    this.processAllMessages();

    const result = {
      messages: [...this.messages],
      role: this.role,
      variables: { ...this.variables },
      responseFormat: 'json_object', // Always JSON
    };

    return result;
  }

  /**
   * Get messages array (for direct use with LLM client)
   * @returns {Array<Object>} Array of message objects
   */
  getMessages() {
    this.validateVariables();
    this.processAllMessages();
    return [...this.messages];
  }

  /**
   * Process template variables in content
   * @param {string} content - Content with template variables
   * @param {Object} additionalVars - Additional variables for this template
   * @returns {string} Processed content
   * @private
   */
  processTemplate(content, additionalVars = {}) {
    if (typeof content !== 'string') {
      return content;
    }

    const vars = { ...this.variables, ...additionalVars };

    // Replace {{variable}} patterns
    return content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();

      // Support nested object access with dot notation
      const value = this.getNestedValue(vars, trimmedKey);

      if (value === undefined || value === null) {
        console.warn(`Template variable '${trimmedKey}' not found`);
        return match; // Return original placeholder if variable not found
      }

      return String(value);
    });
  }

  /**
   * Get nested object value using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path (e.g., 'user.name')
   * @returns {any} Value at path or undefined
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Process all messages to resolve templates
   * @private
   */
  processAllMessages() {
    this.messages = this.messages.map((message) => ({
      ...message,
      content: this.processTemplate(message.content),
    }));
  }

  /**
   * Validate required variables and types
   * @private
   */
  validateVariables() {
    // Check required variables
    for (const required of this.validation.required) {
      if (!(required in this.variables)) {
        throw new Error(`Required variable '${required}' is missing`);
      }
    }

    // Check variable types
    for (const [key, expectedType] of this.validation.types) {
      if (key in this.variables) {
        const actualType = typeof this.variables[key];
        if (actualType !== expectedType) {
          throw new Error(`Variable '${key}' should be ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  /**
   * Clear all messages and variables
   * @returns {PromptBuilder} This instance for chaining
   */
  clear() {
    this.messages = [];
    this.variables = {};
    this.role = null;
    this.responseFormat = null;
    this.validation.required.clear();
    this.validation.types.clear();
    return this;
  }

  /**
   * Clone this prompt builder
   * @returns {PromptBuilder} New instance with same configuration
   */
  clone() {
    const clone = new PromptBuilder();
    clone.messages = [...this.messages];
    clone.variables = { ...this.variables };
    clone.role = this.role;
    clone.responseFormat = this.responseFormat;
    clone.templates = new Map(this.templates);
    clone.validation.required = new Set(this.validation.required);
    clone.validation.types = new Map(this.validation.types);
    return clone;
  }

  /**
   * Get builder statistics
   * @returns {Object} Statistics about the current prompt
   */
  getStats() {
    const totalLength = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const messagesByRole = this.messages.reduce((counts, msg) => {
      counts[msg.role] = (counts[msg.role] || 0) + 1;
      return counts;
    }, {});

    return {
      messageCount: this.messages.length,
      totalLength,
      messagesByRole,
      variableCount: Object.keys(this.variables).length,
      templateCount: this.templates.size,
      role: this.role,
      responseFormat: this.responseFormat,
    };
  }
}
