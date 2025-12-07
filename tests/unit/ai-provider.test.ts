import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectProvider } from '@/lib/ai-provider';

describe('AI Provider Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should detect OpenAI when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;

    const provider = detectProvider();
    expect(provider).toBe('openai');
  });

  it('should detect Anthropic when only ANTHROPIC_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete process.env.GOOGLE_AI_API_KEY;

    const provider = detectProvider();
    expect(provider).toBe('claude');
  });

  it('should detect Google AI when only GOOGLE_AI_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';

    const provider = detectProvider();
    expect(provider).toBe('google');
  });

  it('should detect Google AI when GEMINI_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const provider = detectProvider();
    expect(provider).toBe('google');
  });

  it('should prioritize OpenAI over other providers', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';

    const provider = detectProvider();
    expect(provider).toBe('openai');
  });

  it('should prioritize Anthropic over Google AI', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';

    const provider = detectProvider();
    expect(provider).toBe('claude');
  });

  it('should throw error when no API keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    expect(() => detectProvider()).toThrow('No AI provider API key found');
  });
});
