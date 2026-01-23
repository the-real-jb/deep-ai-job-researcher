import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectProvider } from '@/lib/ai-provider';

describe('detectProvider', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules(); // Clear cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterEach(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('authenticated user', () => {
    const authContext = { isAuthenticated: true };

    it('should return "openai" if OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(detectProvider(authContext)).toBe('openai');
    });

    it('should return "claude" if ANTHROPIC_API_KEY is set and OPENAI_API_KEY is not', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(detectProvider(authContext)).toBe('claude');
    });

    it('should return "google" if only GOOGLE_AI_API_KEY is set', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(detectProvider(authContext)).toBe('google');
    });
  });

  describe('unauthenticated user', () => {
    const authContext = { isAuthenticated: false };

    it('should return "openai" if OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(detectProvider(authContext)).toBe('openai');
    });

    it('should error if OPENAI_API_KEY is not set but ANTHROPIC_API_KEY is set', () => {
        delete process.env.OPENAI_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'test-key';
        process.env.GOOGLE_AI_API_KEY = 'test-key';
        expect(() => detectProvider(authContext)).toThrow('OpenAI API key is required');
      });

    it('should error if only GOOGLE_AI_API_KEY is set', () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        process.env.GOOGLE_AI_API_KEY = 'test-key';
        expect(() => detectProvider(authContext)).toThrow('OpenAI API key is required');
    });

    it('should error if no keys are set', () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.GOOGLE_AI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        expect(() => detectProvider(authContext)).toThrow('At least one AI provider API key is required');
    });
  });

  describe('authContext not provided', () => {
    it('should behave like an authenticated user', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(detectProvider()).toBe('openai');
    });
  });
});
