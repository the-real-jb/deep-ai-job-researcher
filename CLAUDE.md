# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Assisted Job Hunter (Deep Job Researcher) is a Next.js application that matches resumes or portfolio websites with live job postings using AI-powered web scraping. The app scrapes actual job boards in real-time, analyzes candidate profiles, and uses AI to score and rank job matches with tailored pitches.

## Development Commands

```bash
# Development server (uses Turbopack)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Testing
npm test              # Run unit tests in watch mode
npm run test:unit     # Run unit tests once
npm run test:watch    # Run unit tests in watch mode
npm run test:coverage # Run unit tests with coverage report
npm run test:e2e      # Run E2E tests with Playwright
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:debug # Run E2E tests in debug mode
npm run test:all      # Run all tests (unit + E2E)
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

**Required:**
- `HYPERBROWSER_API_KEY` - For web scraping (get at hyperbrowser.ai)
- **ONE** AI provider API key (priority: OpenAI > Anthropic > Google AI):
  - `OPENAI_API_KEY` (default)
  - `ANTHROPIC_API_KEY` (for Claude)
  - `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` (for Gemini)

**Optional:**
- `AI_PROVIDER` - Explicitly set provider (openai|claude|google)
- `OPENAI_MODEL` - Default: gpt-4o-mini
- `ANTHROPIC_MODEL` - Default: claude-3-5-sonnet-20241022
- `GOOGLE_AI_MODEL` - Default: gemini-1.5-flash

## Architecture

### Core Flow

1. **Input Processing** (app/page.tsx)
   - User uploads PDF resume OR enters portfolio URL
   - Frontend sends to appropriate API endpoint

2. **Analysis Pipeline** (API routes)
   - Resume: `/api/analyze/resume` - Extracts text from PDF
   - Portfolio: `/api/analyze/portfolio` - Scrapes website with Hyperbrowser
   - Both paths converge at candidate profile building

3. **Candidate Profiling** (lib/candidate.ts)
   - `buildCandidateProfile()` uses AI to extract structured profile:
     - Name, headline, skills, years of experience
     - Top projects, skill gaps, suggestions

4. **Job Crawling** (lib/jobs.ts)
   - `crawlJobSources()` scrapes job boards using Hyperbrowser SDK
   - Currently sources: Work at a Startup
   - Parses both markdown and HTML job listings
   - Extracts: title, company, description, location, remote status, URL

5. **AI Matching** (lib/match.ts)
   - `llmMatch()` scores candidate against all jobs (0-100)
   - Returns matches >30 with missing skills and tailored pitch
   - `generateOutreachEmail()` creates personalized application emails

### AI Provider Abstraction (lib/ai-provider.ts)

Unified interface for OpenAI, Anthropic, and Google AI:

- `detectProvider()` - Auto-detects available provider from env vars
- `createChatCompletion()` - Provider-agnostic completion API
- **Important**: Claude requires special JSON extraction (handles markdown code fences)
- **Important**: Google AI uses different JSON format (`response_mime_type`)

### Key Files

- `lib/hb.ts` - Hyperbrowser client wrapper (`withClient` pattern)
- `lib/pdf.ts` - PDF text extraction using pdf-parse-new
- `components/` - React components (LiveConsole, MatchTable, ExportButtons, etc.)
- `app/api/analyze/` - API route handlers for resume/portfolio analysis

## Important Patterns

### Hyperbrowser Usage

Always use the `withClient` wrapper from `lib/hb.ts`:

```typescript
import { withClient } from '@/lib/hb';

const result = await withClient(async (client) => {
  return await client.scrape.startAndWait({ url, scrapeOptions });
});
```

### AI Provider Switching

The app auto-detects providers, but respect the priority order. When adding new AI features:

1. Use `createChatCompletion()` from `lib/ai-provider.ts`
2. Always provide system message for context
3. Use `responseFormat: { type: 'json_object' }` for structured outputs
4. Handle JSON extraction for Claude (see `createClaudeCompletion`)

### Job Source Extensions

To add new job boards in `lib/jobs.ts`:

1. Add entry to `JOB_SOURCES` array with name, URL, depth
2. Update parsing logic in `extractJobsFromHTML()` for site-specific patterns
3. Test with both markdown and HTML extraction paths

## Tech Stack

- **Framework**: Next.js 15.4.8 (App Router, Turbopack)
- **UI**: React 19, TailwindCSS, Framer Motion, Lucide icons
- **AI SDKs**: OpenAI, Anthropic, Google Generative AI
- **Web Scraping**: Hyperbrowser SDK
- **PDF Processing**: pdf-parse-new
- **Testing**: Vitest, Playwright, React Testing Library

## Testing

The project uses a comprehensive testing setup with both unit and E2E tests.

### Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── resume-flow.spec.ts
│   └── portfolio-flow.spec.ts
├── unit/                   # Vitest unit tests
│   ├── ai-provider.test.ts
│   ├── jobs.test.ts
│   ├── match.test.ts
│   ├── api-resume.test.ts
│   └── api-portfolio.test.ts
├── fixtures/               # Test data and mocks
│   ├── candidate.ts
│   ├── jobs.ts
│   └── pdf.ts
└── setup.ts               # Vitest setup file
```

### Unit Testing (Vitest)

- **AI Provider Tests**: Test provider detection and priority logic
- **Job Tests**: Test job crawling with mocked Hyperbrowser client
- **Match Tests**: Test job matching, export formatting, and email generation
- **API Tests**: Test API routes with mocked dependencies

**Key patterns:**
- Mock external dependencies (Hyperbrowser, AI providers) using `vi.mock()`
- Use fixtures from `tests/fixtures/` for consistent test data
- Test both success and error cases

### E2E Testing (Playwright)

Tests full user flows in a real browser:
- Resume upload and analysis workflow
- Portfolio URL analysis workflow
- Mode switching, validation, error handling

**Important:**
- E2E tests with `.skip` require real API keys and make actual API calls
- Remove `.skip` and add valid API keys to `.env.local` to run full E2E tests
- Tests automatically start dev server via `webServer` config

### Running Tests

```bash
# Unit tests (fast, no API keys needed)
npm test                    # Watch mode
npm run test:unit           # Run once
npm run test:coverage       # With coverage

# E2E tests (require dev server)
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:debug      # Debug mode

# All tests
npm run test:all            # Unit + E2E
```

### Mocking Strategy

1. **Hyperbrowser**: Mock `withClient` wrapper to return test crawl results
2. **AI Providers**: Mock `createChatCompletion` to return structured test data
3. **PDF Parsing**: Mock `extractTextFromPDF` to return test resume text
4. **Next.js**: Router and navigation mocked in `tests/setup.ts`

## Common Gotchas

1. **PDF Upload**: API validates file type, size (<5MB), and extracts meaningful text (>50 chars)
2. **Job Parsing**: Different job boards use different HTML structures - parsing logic handles multiple patterns
3. **AI JSON Responses**: Claude may wrap JSON in markdown code fences - extraction logic handles this
4. **Google AI API Keys**: Both `GOOGLE_AI_API_KEY` and `GEMINI_API_KEY` are supported for backwards compatibility
5. **Hyperbrowser Crawling**: Uses `startAndWait` for synchronous crawling with maxPages=10 limit
