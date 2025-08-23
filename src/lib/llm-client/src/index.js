// Main exports for @screening/llm-client
import { LLMClient } from './LLMClient.js';
import { PromptBuilder } from './prompts/PromptBuilder.js';
import { ResponseParser } from './prompts/ResponseParser.js';

export { LLMClient } from './LLMClient.js';
export { PromptBuilder } from './prompts/PromptBuilder.js';
export { ResponseParser } from './prompts/ResponseParser.js';

// Provider exports
export { BaseProvider } from './providers/BaseProvider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';
export { DeepSeekProvider } from './providers/DeepSeekProvider.js';

// Utility exports
export { CostCalculator } from './utils/CostCalculator.js';
export { ConfigValidator } from './utils/ConfigValidator.js';

// Constants
export { CAPABILITIES, ERROR_TYPES } from './providers/BaseProvider.js';

// Factory functions
export const createLLMClient = (provider, config = {}) => {
  return new LLMClient({ provider, ...config });
};

export const createPromptBuilder = () => {
  return new PromptBuilder();
};

export const createResponseParser = (config = {}) => {
  return new ResponseParser(config);
};
