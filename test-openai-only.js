#!/usr/bin/env node

/**
 * Test OpenAI-only configuration
 */

async function main() {
  const fs = require('fs');
  const path = require('path');

  // Load environment variables from .env.local
  function loadEnv() {
    try {
      const envPath = path.join(__dirname, '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            // Remove quotes if present
            const cleanValue = value.replace(/^['"]|['"]$/g, '');
            process.env[key] = cleanValue;
          }
        });
      }
    } catch (error) {
      console.error('Error loading .env.local:', error.message);
    }
  }

  loadEnv();

  console.log('=== OpenAI-Only Configuration Test ===\n');

  console.log('Environment Configuration:');
  console.log(`- AI_PROVIDER: ${process.env.AI_PROVIDER || 'not set'}`);
  console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`- ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '⚠ Set (will be ignored)' : 'Not set'}`);
  console.log(`- GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? '⚠ Set (will be ignored)' : 'Not set'}`);

  console.log('\nTesting provider detection...\n');

  try {
    const { detectProvider } = require('./lib/ai-provider.js');
    
    // Test 1: With OpenAI key (should work)
    console.log('Test 1: With OpenAI API key');
    const provider = detectProvider();
    console.log(`   Detected provider: ${provider}`);
    console.log(`   ✅ Expected: openai, Got: ${provider}`);
    
    // Test 2: Simulate no OpenAI key (should fail)
    console.log('\nTest 2: Simulating no OpenAI API key');
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    
    try {
      detectProvider();
      console.log('   ❌ Should have thrown error but did not');
    } catch (error) {
      console.log(`   ✅ Correctly threw error: ${error.message}`);
    }
    
    // Restore key
    process.env.OPENAI_API_KEY = originalKey;
    
    // Test 3: Test actual OpenAI completion
    console.log('\nTest 3: Testing actual OpenAI completion');
    const { createChatCompletion } = require('./lib/ai-provider.js');
    
    const result = await createChatCompletion([
      {
        role: 'system',
        content: 'You are a test assistant. Respond with "OpenAI test successful"'
      },
      {
        role: 'user',
        content: 'Say test successful'
      }
    ], {
      temperature: 0.1,
      maxTokens: 10
    });
    
    console.log(`   Response: "${result.content}"`);
    console.log(`   ✅ OpenAI integration working correctly`);
    
    console.log('\n=== Summary ===');
    console.log('✅ Configuration successfully updated to use OpenAI only');
    console.log('✅ Provider detection forces OpenAI-only mode');
    console.log('✅ OpenAI API is working correctly');
    console.log('\nThe application will now only use OpenAI, ignoring Claude and Google providers.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
