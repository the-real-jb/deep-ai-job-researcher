#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests all AI providers configured in the system
 */

const { execSync } = require('child_process');
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

console.log('=== AI Integration Test ===\n');

// Check which providers are configured
console.log('Checking configured AI providers...\n');

const providers = [];

if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  providers.push({
    name: 'OpenAI',
    key: process.env.OPENAI_API_KEY.substring(0, 10) + '...',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    envVar: 'OPENAI_API_KEY'
  });
}

if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-your_anthropic_api_key_here') {
  providers.push({
    name: 'Claude (Anthropic)',
    key: process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    envVar: 'ANTHROPIC_API_KEY'
  });
}

if ((process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your_google_ai_api_key_here') ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_google_ai_api_key_here')) {
  providers.push({
    name: 'Google AI (Gemini)',
    key: (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY).substring(0, 10) + '...',
    model: process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash',
    envVar: 'GOOGLE_AI_API_KEY or GEMINI_API_KEY'
  });
}

console.log(`Found ${providers.length} configured AI provider(s):`);
providers.forEach(p => {
  console.log(`  - ${p.name}: ${p.model} (${p.envVar})`);
});

console.log('\n=== Testing AI Provider Detection ===\n');

// Create a test TypeScript file to test the detection logic
const testCode = `
import { detectProvider } from './lib/ai-provider';

console.log('Testing provider detection...');

// Test 1: Authenticated user with all keys
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_AI_API_KEY = 'test-google-key';

const authContext = { isAuthenticated: true };
console.log('Authenticated user detection:', detectProvider(authContext));

// Test 2: Unauthenticated user (should default to Google)
const unauthContext = { isAuthenticated: false };
console.log('Unauthenticated user detection:', detectProvider(unauthContext));

// Test 3: No auth context (should behave like authenticated)
console.log('No auth context detection:', detectProvider());
`;

fs.writeFileSync('test-detection.ts', testCode);

try {
  // Compile and run the test
  console.log('Compiling test...');
  execSync('npx tsc test-detection.ts --module commonjs --target es2020 --lib es2020,dom --esModuleInterop --skipLibCheck', { stdio: 'pipe' });
  
  console.log('Running detection test...');
  const output = execSync('node test-detection.js', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error('Error running detection test:', error.message);
} finally {
  // Clean up
  try { fs.unlinkSync('test-detection.ts'); } catch {}
  try { fs.unlinkSync('test-detection.js'); } catch {}
}

console.log('\n=== Testing API Endpoints ===\n');

// Test the API endpoints
console.log('Testing if API endpoints are accessible...');

const testResume = `
John Doe
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
BS Computer Science, University of California (2016)
`;

// Create a simple test to check if the AI provider can parse requests
const simpleTest = `
// Simple test to verify AI provider can be instantiated
const { createChatCompletion } = require('./lib/ai-provider');

async function testSimpleCompletion() {
  try {
    console.log('Testing simple chat completion...');
    
    const result = await createChatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond with "Hello, world!"'
      },
      {
        role: 'user',
        content: 'Say hello'
      }
    ], {
      temperature: 0.1,
      maxTokens: 10
    });
    
    console.log('Response:', result.content);
    console.log('✓ Simple completion test passed');
  } catch (error) {
    console.error('✗ Simple completion test failed:', error.message);
  }
}

testSimpleCompletion();
`;

fs.writeFileSync('test-simple.js', simpleTest);

try {
  console.log('Running simple AI test...');
  const output = execSync('node test-simple.js', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error('Error running simple AI test:', error.message);
  console.error('Full error:', error.stderr?.toString() || error.stdout?.toString());
} finally {
  try { fs.unlinkSync('test-simple.js'); } catch {}
}

console.log('\n=== Testing Candidate Profile Generation ===\n');

const profileTest = `
const { buildCandidateProfile } = require('./lib/candidate');

const testResume = \`${testResume}\`;

async function testProfileGeneration() {
  try {
    console.log('Testing candidate profile generation...');
    
    const profile = await buildCandidateProfile(testResume);
    
    console.log('Generated profile:');
    console.log('- Name:', profile.name || 'Not found');
    console.log('- Headline:', profile.headline);
    console.log('- Skills:', profile.skills.length, 'skills found');
    console.log('- Years Experience:', profile.yearsExperience);
    console.log('- Experience Level:', profile.experienceLevel);
    console.log('- Top Projects:', profile.topProjects.length);
    
    if (profile.skills.length > 0) {
      console.log('✓ Profile generation test passed');
    } else {
      console.log('✗ No skills extracted - check AI provider');
    }
  } catch (error) {
    console.error('✗ Profile generation test failed:', error.message);
  }
}

testProfileGeneration();
`;

fs.writeFileSync('test-profile.js', profileTest);

try {
  console.log('Running profile generation test...');
  const output = execSync('node test-profile.js', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error('Error running profile test:', error.message);
  console.error('Full error:', error.stderr?.toString() || error.stdout?.toString());
} finally {
  try { fs.unlinkSync('test-profile.js'); } catch {}
}

console.log('\n=== Summary ===\n');
console.log('AI Integration Status:');
console.log(`- Configured Providers: ${providers.length}`);
console.log('- Current AI_PROVIDER setting:', process.env.AI_PROVIDER || 'auto-detected');

if (providers.length === 0) {
  console.log('\n⚠️  WARNING: No AI providers configured!');
  console.log('Please set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY');
} else {
  console.log('\n✅ AI integration appears to be properly configured.');
  console.log('Next steps:');
  console.log('1. Test the web interface at http://localhost:3003');
  console.log('2. Upload a resume PDF to test the full flow');
  console.log('3. Test portfolio URL analysis');
}
