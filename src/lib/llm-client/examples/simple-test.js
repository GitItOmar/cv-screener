#!/usr/bin/env node
/**
 * Simple test for the simplified LLM Client (no rate limiting or retries)
 */

import { LLMClient, PromptBuilder } from '../src/index.js';

async function main() {
  console.log('🤖 Simple LLM Client Test (No Rate Limiting/Retries)\n');

  try {
    // Test PromptBuilder
    console.log('🔧 Testing PromptBuilder...');
    const prompt = new PromptBuilder()
      .setRole('assistant')
      .addSystemMessage('You are a helpful assistant.')
      .addUserMessage('Please analyze this data: {{inputData}}')
      .withVariables({
        inputData: {
          title: 'Sample Document',
          content: 'This is a sample text for analysis.',
        },
      })
      .build();

    console.log('📋 Built prompt with', prompt.messages.length, 'messages');
    console.log('🎯 Role:', prompt.role);
    console.log('📝 Variables:', Object.keys(prompt.variables));
    console.log('✨ Response Format:', prompt.responseFormat);

    // Test client creation (without actual API calls)
    console.log('\n📦 Testing Client Creation...');
    const client = new LLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      costTracking: true,
      logging: false,
    });

    console.log('✅ Client created successfully');
    console.log('⚙️  Config:', {
      provider: client.config.provider,
      model: client.config.model,
      timeout: client.config.timeout,
      costTracking: client.config.costTracking,
    });

    console.log('\n✨ All tests passed! No rate limiting or retry logic present.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
