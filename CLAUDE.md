# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Assisted Job Hunter (Deep Job Researcher) is a Next.js application that matches resumes or portfolio websites with live job postings using AI-powered web scraping. The app scrapes actual job boards in real-time, analyzes candidate profiles, and uses AI to score and rank job matches with tailored pitches.

**Key Features:**
- Multi-provider AI support (OpenAI, Anthropic/Claude, Google AI)
- Real-time job board crawling with rate limiting and caching
- LinkedIn profile integration for enhanced candidate profiles
- Authentication system with paid/free tier differentiation
- Comprehensive testing (unit + E2E)

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

## Deployment Commands

```bash
# Deploy workflow (from local machine)
git add .
git commit -m "Your changes"
git push origin master

# Then on VPS:
ssh user@45.90.109.196
cd /var/www/resume-hunter
./deployment/update-app.sh

# Or manually:
git pull origin master
npm install
npm run build
pm2 restart resume-hunter
```

### Deployment Resources

- **Git Workflow Guide**: [`deployment/GIT_WORKFLOW.md`](deployment/GIT_WORKFLOW.md) - Complete git deployment guide
- **Quick Start**: [`deployment/QUICKSTART.md`](deployment/QUICKSTART.md) - 5-minute setup
- **Full Guide**: [`deployment/DEPLOYMENT.md`](deployment/DEPLOYMENT.md) - Complete deployment documentation
- **Deployment Overview**: [`deployment/README.md`](deployment/README.md) - Overview of all deployment files
- **Update Script**: [`deployment/update-app.sh`](deployment/update-app.sh) - Automated update from git
- **Scripts Guide**: [`scripts/README.md`](scripts/README.md) - Hostinger API scripts documentation

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

**Required:**
- `HYPERBROWSER_API_KEY` - For web scraping (get at hyperbrowser.ai)
- **ONE** AI provider API key (priority: OpenAI > Anthropic > Google AI):
  - `OPENAI_API_KEY` (default, paid)
  - `ANTHROPIC_API_KEY` (for Claude, paid)
  - `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` (for Gemini, free tier available)

**Security (CRITICAL):**
- `AUTH_PASSWORD` - Required if using paid API keys (OpenAI/Anthropic)
  - If paid keys are present without this, app will block access with error
  - If only free keys (Google), app runs in open access mode

**Optional:**
- `AI_PROVIDER` - Explicitly set provider (openai|claude|google), overrides auto-detection
- `OPENAI_MODEL` - Default: gpt-4o-mini
- `ANTHROPIC_MODEL` - Default: claude-3-5-sonnet-20241022
- `GOOGLE_AI_MODEL` - Default: gemini-2.5-flash

**Authentication Flow:**
- Set `AUTH_PASSWORD=your_secure_password` in `.env.local`
- Access `/login` and enter password
- Cookie-based auth persists session
- Middleware enforces authentication on all non-public routes

## Architecture

### Core Flow

1. **Input Processing** (app/page.tsx)
   - User uploads PDF resume OR enters portfolio URL
   - Frontend sends to appropriate API endpoint
   - Middleware enforces authentication if AUTH_PASSWORD is set

2. **Analysis Pipeline** (API routes)
   - Resume: `/api/analyze/resume` - Extracts text from PDF
   - Portfolio: `/api/analyze/portfolio` - Scrapes website with Hyperbrowser
   - LinkedIn: Can enhance base profile with LinkedIn data
   - Both paths converge at candidate profile building

3. **Candidate Profiling** (lib/candidate.ts)
   - `buildCandidateProfile()` uses AI to extract structured profile:
     - Name, headline, skills (core vs secondary), years of experience
     - Experience level (entry/mid/senior/staff/principal)
     - Top projects, skill gaps, suggestions, preferences
   - `buildLinkedInEnhancedProfile()` merges resume + LinkedIn data:
     - Extracts endorsements, connections, recommendations
     - Identifies top validated skills from endorsements

4. **Job Crawling** (lib/jobs.ts)
   - `crawlJobSources()` scrapes job boards using Hyperbrowser SDK or APIs
   - **Job sources:** Work at a Startup, LinkedIn Jobs, Arbeitnow (API), We Work Remotely (RSS)
   - **Rate limiting:** Daily limits per source (LinkedIn: 20/day, others: 100/day)
   - **Caching:** 2-hour TTL, LRU eviction, max 50 entries (VPS memory constraint)
   - `crawlLinkedInJobs()` - Targeted search with candidate's top skills
   - Parses both markdown and HTML job listings
   - Deduplicates jobs by company+title normalization

5. **AI Matching** (lib/match.ts)
   - **Pre-filtering:** Reduces jobs to those matching ≥1 core skill or ≥1 any skill
   - **Batched processing:** Processes 20 jobs at a time to manage API costs
   - `llmMatch()` scores candidate against jobs with detailed breakdown:
     - Skill match (0-40 points), Experience match (0-30), Project match (0-20), Preference match (0-10)
     - Returns matches ≥30 with required/nice-to-have skills, missing skills, pitch
   - `generateOutreachEmail()` creates personalized application emails

### AI Provider Abstraction (lib/ai-provider.ts)

Unified interface for OpenAI, Anthropic, and Google AI:

- `detectProvider(authContext?)` - Auto-detects available provider from env vars
  - **Priority order:** OpenAI > Anthropic > Google AI
  - **Auth context:** Unauthenticated users forced to Google provider (free tier)
- `createChatCompletion()` - Provider-agnostic completion API
  - Accepts `ChatMessage[]`, `ChatCompletionOptions`, optional `AuthContext`
  - Returns normalized `ChatCompletionResult`
- **Claude specifics:**
  - Separates system message from conversation messages
  - Handles JSON extraction from markdown code fences (```json...```)
  - Validates and extracts text blocks from content array
- **Google AI specifics:**
  - Uses `response_mime_type: 'application/json'` for JSON mode
  - Supports both `GOOGLE_AI_API_KEY` and `GEMINI_API_KEY` for backwards compatibility
  - Handles multi-turn conversations via chat history

### Performance & Resource Management

- **Caching** (lib/cache.ts):
  - In-memory LRU cache with TTL support
  - Max 50 entries to conserve VPS memory
  - 2-hour TTL for job search results
  - Cache keys generated from source + search params

- **Rate Limiting** (lib/rate-limit.ts):
  - File-based persistent storage (`.rate-limits.json`)
  - Daily limits per job source (LinkedIn: 20/day, default: 100/day)
  - Auto-resets at midnight UTC
  - Prevents excessive API costs and scraping abuse

### Authentication & Security (middleware.ts)

- **Three-tier security model:**
  1. **Password set:** Requires authentication for all routes
  2. **Paid keys (OpenAI/Anthropic) + no password:** Blocks access with error (security risk)
  3. **Free keys only (Google) or no keys:** Open access (free tier mode)
- Authentication via cookie (`auth_token`)
- Public paths: `/login`, `/api/auth/login`, static assets
- Edge runtime compatible (middleware runs on Edge)

### Key Files

- `lib/ai-provider.ts` - Multi-provider AI abstraction layer
- `lib/candidate.ts` - Candidate profile building and LinkedIn enhancement
- `lib/jobs.ts` - Job crawling, parsing, deduplication
- `lib/match.ts` - AI-powered job matching with scoring
- `lib/cache.ts` - In-memory LRU cache with TTL
- `lib/rate-limit.ts` - File-based rate limiting
- `lib/hb.ts` - Hyperbrowser client wrapper (`withClient` pattern)
- `lib/pdf.ts` - PDF text extraction using pdf-parse-new
- `middleware.ts` - Authentication and security enforcement
- `components/` - React components (LiveConsole, MatchTable, ExportButtons, etc.)
- `app/api/analyze/` - API route handlers for resume/portfolio analysis
- `app/api/auth/login/` - Password-based authentication endpoint

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

1. Add entry to `JOB_SOURCES` array with name, URL, depth, type
   - `type: 'scrape'` for Hyperbrowser scraping
   - `type: 'api'` for API/RSS endpoints
2. For API sources: Add handler in `fetchFromApi()`
3. For scrape sources: Update parsing logic in `extractJobsFromHTML()` for site-specific patterns
4. Consider adding rate limit in `DAILY_LIMITS` if needed
5. Test with both markdown and HTML extraction paths

### Authentication Context

When calling AI functions, pass `AuthContext` to enforce free tier restrictions:

```typescript
const authContext = { isAuthenticated: false };
await buildCandidateProfile(text, authContext); // Forces Google provider
```

- Unauthenticated users: Forced to Google AI (free tier)
- Authenticated users: Use provider priority (OpenAI > Anthropic > Google)

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
5. **Hyperbrowser Crawling**: Uses `startAndWait` for synchronous crawling with maxPages=10 limit (5 for LinkedIn)
6. **Rate Limits**: Stored in `.rate-limits.json` - delete this file to reset daily limits
7. **Cache**: In-memory only - cleared on server restart. Max 50 entries, 2-hour TTL
8. **Middleware**: Runs on Edge runtime - not all Node.js APIs available
9. **Authentication**: Setting `AUTH_PASSWORD` with paid API keys is REQUIRED for security
10. **Job Pre-filtering**: Changed from requiring ≥1 core skill OR ≥2 skills to ≥1 core skill OR ≥1 skill to reduce over-filtering
11. **LinkedIn Scraping**: Has conservative 20/day limit to avoid detection - use sparingly

## Data Flow Diagram

```
User Input (PDF/URL)
    ↓
[Middleware Auth Check]
    ↓
API Route (/api/analyze/resume or /api/analyze/portfolio)
    ↓
Extract Text (PDF parser or Hyperbrowser scraper)
    ↓
buildCandidateProfile() [AI Provider]
    ↓
    ├─→ [Optional] buildLinkedInEnhancedProfile() [merge LinkedIn data]
    ↓
crawlJobSources() [with cache check & rate limit]
    ↓
    ├─→ Check cache (getCachedData)
    ├─→ Check rate limit (checkRateLimit)
    ├─→ Scrape/API fetch jobs
    ├─→ Parse & deduplicate
    ├─→ Set cache (setCachedData)
    └─→ Increment rate limit
    ↓
llmMatch() [AI Provider]
    ↓
    ├─→ Pre-filter jobs (keyword matching)
    ├─→ Batch jobs (20 at a time)
    ├─→ Score each batch (0-100 with breakdown)
    └─→ Filter matches ≥30
    ↓
Return JobMatch[] to frontend
    ↓
Display in MatchTable with export options
```
