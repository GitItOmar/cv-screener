# @screening/llm-client

A unified LLM client supporting multiple providers (OpenAI, DeepSeek) with a consistent, powerful API.

## Features

- 🔄 **Provider-Agnostic**: Switch between OpenAI and DeepSeek with identical APIs
- 🎯 **Flexible Prompts**: Template-based prompt system with variable substitution
- 💰 **Cost Tracking**: Built-in cost monitoring across all providers
- 📊 **Observability**: Comprehensive logging and metrics
- 🧪 **Testing**: Mock providers and comprehensive test coverage

## Quick Start

### Installation

```bash
npm install @screening/llm-client
```

### Basic Usage

```javascript
import { LLMClient } from '@screening/llm-client';

// Initialize client
const client = new LLMClient({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple completion
const response = await client.complete([
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello, how are you?' },
]);

console.log(response.content);
```

### Advanced Usage with Prompt Builder

```javascript
import { LLMClient, PromptBuilder } from '@screening/llm-client';

const client = new LLMClient({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

// Build complex prompts (always returns JSON)
const prompt = new PromptBuilder()
  .setRole('text_analyzer')
  .addSystemMessage('You are a helpful assistant that analyzes text')
  .addUserMessage('Analyze this text: {{textContent}}')
  .withVariables({ textContent: documentText })
  .build();

const result = await client.complete(prompt, {
  temperature: 0,
  maxTokens: 1000,
});
```

### Provider Switching

```javascript
// Switch to DeepSeek for cost optimization
const deepseekClient = new LLMClient({
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Same API, different provider
const response = await deepseekClient.complete(prompt);
```

## Configuration

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_key
```

### Client Configuration

```javascript
const client = new LLMClient({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,

  // Optional configuration
  timeout: 30000,
  costTracking: true,
  logging: true,
});
```

## API Reference

### LLMClient

#### Methods

- `complete(messages, options)` - Complete a chat conversation
- `stream(messages, options)` - Stream a chat completion
- `getCostTracking()` - Get cost and usage statistics
- `switchProvider(config)` - Switch to a different provider

#### Options

- `temperature: number` - Controls randomness (0-1)
- `maxTokens: number` - Maximum tokens to generate

Note: Response format is always JSON.

### PromptBuilder

#### Methods

- `setRole(role)` - Set the agent role
- `addSystemMessage(content)` - Add system message
- `addUserMessage(content)` - Add user message
- `withVariables(vars)` - Add template variables
- `build()` - Build the final prompt (always JSON format)

## Cost Tracking

```javascript
// Get detailed cost information
const costs = client.getCostTracking();

console.log(`Total cost: $${costs.totalCost}`);
console.log(`Tokens used: ${costs.totalTokensUsed}`);
console.log(`Requests made: ${costs.requestCount}`);
```

## Error Handling

The client includes comprehensive error handling:

```javascript
try {
  const response = await client.complete(messages);
} catch (error) {
  if (error.type === 'RATE_LIMIT_EXCEEDED') {
    console.log('Rate limit hit, will retry automatically');
  } else if (error.type === 'INSUFFICIENT_QUOTA') {
    console.log('API quota exceeded');
  } else {
    console.log('Other error:', error.message);
  }
}
```

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
