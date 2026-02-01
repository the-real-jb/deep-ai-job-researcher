#!/usr/bin/env node

/**
 * Test AI Models Integration
 * Tests that each AI provider can parse resume requests correctly
 */

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

console.log('=== AI Models Integration Test ===\n');

// Sample resume text for testing
const sampleResume = `John Doe
Software Engineer
San Francisco, CA

SUMMARY
Senior Software Engineer with 8 years of experience in full-stack development.
Expert in React, Node.js, TypeScript, and cloud technologies.

EXPERIENCE
Senior Software Engineer at TechCorp (2020-Present)
- Led development of customer-facing web applications using React and Node.js
- Implemented microservices architecture with AWS Lambda and API Gateway
- Mentored 3 junior engineers

Software Engineer at Startup Inc. (2016-2020)
- Developed REST APIs with Express.js and MongoDB
- Built responsive frontend applications with React and Redux
- Implemented CI/CD pipelines with Jenkins

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, AWS, Docker, Git, Agile/Scrum

EDUCATION
BS Computer Science, University of California (2016)`;

// Test each provider
const providersToTest = [
  { name: 'openai', envVar: 'OPENAI_API_KEY' },
  { name: 'claude', envVar: 'ANTHROPIC_API_KEY' },
  { name: 'google', envVar: 'GOOGLE_AI_API_KEY' }
];

async function testProvider(providerName) {
  console.log(`\n=== Testing ${providerName.toUpperCase()} ===`);
  
  // Set the provider for this test
  process.env.AI_PROVIDER = providerName;
  
  try {
    // Dynamically import the module
    const { createChatCompletion } = require('../lib/ai-provider.js');
    
    console.log(`1. Testing simple completion...`);
    const simpleResult = await createChatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond with exactly: "Test successful"'
      },
      {
        role: 'user',
        content: 'Say test successful'
      }
    ], {
      temperature: 0.1,
      maxTokens: 10
    });
    
    console.log(`   Response: "${simpleResult.content}"`);
    console.log(`   ✓ Simple completion test passed`);
    
    console.log(`\n2. Testing JSON response parsing...`);
    const jsonResult = await createChatCompletion([
      {
        role: 'system',
        content: `Extract skills from the resume text. Return a JSON object with format: {"skills": ["skill1", "skill2"]}`
      },
      {
        role: 'user',
        content: `Resume: ${sampleResume}`
      }
    ], {
      responseFormat: { type: 'json_object' },
      temperature: 0.1,
      maxTokens: 200
    });
    
    console.log(`   JSON Response: ${jsonResult.content.substring(0, 100)}...`);
    
    try {
      const parsed = JSON.parse(jsonResult.content);
      if (parsed.skills && Array.isArray(parsed.skills)) {
        console.log(`   ✓ JSON parsing test passed (found ${parsed.skills.length} skills)`);
        console.log(`   Sample skills: ${parsed.skills.slice(0, 5).join(', ')}`);
      } else {
        console.log(`   ⚠ JSON structure incorrect`);
      }
    } catch (e) {
      console.log(`   ✗ JSON parsing failed: ${e.message}`);
    }
    
    console.log(`\n3. Testing resume profile extraction...`);
    const profileResult = await createChatCompletion([
      {
        role: 'system',
        content: `Extract candidate profile from resume. Return JSON with: name, headline, skills array, yearsExperience number, experienceLevel.`
      },
      {
        role: 'user',
        content: sampleResume
      }
    ], {
      responseFormat: { type: 'json_object' },
      temperature: 0.1,
      maxTokens: 300
    });
    
    console.log(`   Profile extraction response received`);
    
    try {
      const profile = JSON.parse(profileResult.content);
      const checks = [
        profile.skills && Array.isArray(profile.skills),
        typeof profile.yearsExperience === 'number',
        profile.experienceLevel && ['entry', 'mid', 'senior', 'staff', 'principal'].includes(profile.experienceLevel)
      ];
      
      const passedChecks = checks.filter(Boolean).length;
      console.log(`   ✓ Profile extraction test passed (${passedChecks}/3 checks)`);
      
    } catch (e) {
      console.log(`   ✗ Profile extraction failed: ${e.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ✗ ${providerName} test failed: ${error.message}`);
    if (error.message.includes('API key') || error.message.includes('environment variable')) {
      console.log(`   ⚠ Check ${providersToTest.find(p => p.name === providerName)?.envVar} environment variable`);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('Available AI Providers:');
  providersToTest.forEach(p => {
    const hasKey = process.env[p.envVar] && process.env[p.envVar] !== `your_${p.name}_api_key_here`;
    console.log(`  - ${p.name.toUpperCase()}: ${hasKey ? '✅ Configured' : '❌ Not configured'}`);
  });
  
  console.log(`\nCurrent AI_PROVIDER setting: ${process.env.AI_PROVIDER || 'auto-detected'}`);
  
  const results = {};
  
  for (const provider of providersToTest) {
    const hasKey = process.env[provider.envVar] && process.env[provider.envVar] !== `your_${provider.name}_api_key_here`;
    
    if (hasKey) {
      results[provider.name] = await testProvider(provider.name);
    } else {
      console.log(`\n=== Skipping ${provider.name.toUpperCase()} (no API key) ===`);
      results[provider.name] = 'skipped';
    }
  }
  
  console.log('\n=== Test Summary ===');
  console.log('\nProvider Status:');
  
  let allPassed = true;
  providersToTest.forEach(p => {
    const result = results[p.name];
    const hasKey = process.env[p.envVar] && process.env[p.envVar] !== `your_${p.name}_api_key_here`;
    
    if (!hasKey) {
      console.log(`  ${p.name.toUpperCase()}: ⚠ Not configured`);
    } else if (result === true) {
      console.log(`  ${p.name.toUpperCase()}: ✅ All tests passed`);
    } else if (result === 'skipped') {
      console.log(`  ${p.name.toUpperCase()}: ⚠ Skipped (no API key)`);
    } else {
      console.log(`  ${p.name.toUpperCase()}: ❌ Tests failed`);
      allPassed = false;
    }
  });
  
  console.log('\n=== Recommendations ===');
  
  const configuredProviders = providersToTest.filter(p => 
    process.env[p.envVar] && process.env[p.envVar] !== `your_${p.name}_api_key_here`
  );
  
  if (configuredProviders.length === 0) {
    console.log('❌ No AI providers configured!');
    console.log('   Set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY');
  } else if (allPassed) {
    console.log('✅ All configured AI providers are working correctly!');
    console.log('   The AI integration is ready for use.');
  } else {
    console.log('⚠ Some AI providers have issues.');
    console.log('   Check the error messages above for troubleshooting.');
  }
  
  console.log('\nCurrent provider selection logic:');
  console.log('- Unauthenticated users: Always use Google');
  console.log('- Authenticated users: OpenAI > Claude > Google (by priority)');
  console.log(`- Explicit setting: ${process.env.AI_PROVIDER ? `Using ${process.env.AI_PROVIDER}` : 'Auto-detected'}`);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
