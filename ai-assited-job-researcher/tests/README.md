# Testing Guide

This directory contains all tests for the AI Assisted Job Hunter application.

## Structure

```
tests/
├── e2e/           # End-to-end tests (Playwright)
├── unit/          # Unit and integration tests (Vitest)
├── fixtures/      # Shared test data and mocks
├── setup.ts       # Vitest configuration
└── README.md      # This file
```

## Quick Start

```bash
# Run unit tests (fast, no API keys needed)
npm test

# Run E2E tests (requires dev server)
npm run test:e2e

# Run all tests
npm run test:all
```

## Unit Tests (Vitest)

Unit tests run quickly and don't require API keys. They use mocked dependencies.

### What's tested:
- **AI Provider Detection** (`ai-provider.test.ts`)
  - Provider priority logic (OpenAI > Anthropic > Google)
  - Environment variable handling

- **Job Crawling** (`jobs.test.ts`)
  - Job source crawling with mocked Hyperbrowser
  - Progress callbacks
  - Error handling

- **Matching Logic** (`match.test.ts`)
  - Export formatting
  - Email generation
  - Summary statistics

- **API Routes** (`api-*.test.ts`)
  - Resume upload validation
  - Portfolio URL validation
  - Complete analysis pipelines

### Running Unit Tests

```bash
npm test              # Watch mode (reruns on file changes)
npm run test:unit     # Run once
npm run test:coverage # With coverage report
```

### Adding Unit Tests

1. Create test file in `tests/unit/` with `.test.ts` extension
2. Import test functions: `import { describe, it, expect, vi } from 'vitest'`
3. Use fixtures from `tests/fixtures/` for consistent data
4. Mock external dependencies with `vi.mock()`

Example:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '@/lib/mymodule';
import { mockData } from '../fixtures';

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction(mockData);
    expect(result).toBe(expectedValue);
  });
});
```

## E2E Tests (Playwright)

E2E tests run in a real browser and test complete user flows.

### What's tested:
- **Resume Flow** (`resume-flow.spec.ts`)
  - File upload interface
  - PDF validation
  - Mode switching
  - Results display

- **Portfolio Flow** (`portfolio-flow.spec.ts`)
  - URL input validation
  - Portfolio analysis
  - Error handling

### Running E2E Tests

```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Interactive UI mode (great for debugging)
npm run test:e2e:debug  # Debug mode with pause
```

### Full E2E Tests (with real API calls)

Some E2E tests are skipped by default because they require:
1. Valid API keys in `.env.local`
2. Real API calls (costs money, slower)

To enable them:
1. Set up `.env.local` with valid keys:
   ```
   HYPERBROWSER_API_KEY=your_key
   OPENAI_API_KEY=your_key  # or another AI provider
   ```
2. Remove `.skip` from the test:
   ```typescript
   test.skip('test name') → test('test name')
   ```

## Test Fixtures

Shared test data lives in `tests/fixtures/`:

- `candidate.ts` - Mock candidate profiles and resume text
- `jobs.ts` - Mock job listings and crawl results
- `pdf.ts` - Mock PDF buffers for testing

Import fixtures like:
```typescript
import { mockCandidateProfile, mockJobListings } from '../fixtures';
```

## Mocking Dependencies

### Mocking Hyperbrowser

```typescript
vi.mock('@/lib/hb', () => ({
  withClient: vi.fn((callback) => {
    return callback({
      crawl: { startAndWait: vi.fn().mockResolvedValue(mockCrawlResult) }
    });
  }),
}));
```

### Mocking AI Providers

```typescript
vi.mock('@/lib/ai-provider', () => ({
  createChatCompletion: vi.fn().mockResolvedValue({
    content: JSON.stringify(mockResponse)
  }),
}));
```

## Continuous Integration

For CI environments:
- Unit tests run without any setup
- E2E tests need environment variables set
- Use `CI=true npm run test:all` for CI pipelines

## Debugging Tests

### Vitest
- Use `test.only()` to run a single test
- Use `console.log()` for debugging (visible in test output)
- Use VS Code Vitest extension for inline debugging

### Playwright
- Run `npm run test:e2e:ui` for interactive debugging
- Use `await page.pause()` to pause execution
- Screenshots saved on failure in `test-results/`

## Coverage

Generate coverage report:
```bash
npm run test:coverage
```

View coverage report at `coverage/index.html`

## Tips

1. **Keep tests fast** - Mock external APIs, use minimal fixtures
2. **Test behavior, not implementation** - Focus on what the code does, not how
3. **Use descriptive test names** - "should do X when Y" format
4. **Organize with describe blocks** - Group related tests
5. **Clean up after tests** - Use `beforeEach` and `afterEach` for setup/teardown
