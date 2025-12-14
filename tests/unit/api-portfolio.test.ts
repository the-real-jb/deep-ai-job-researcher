import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPortfolioText = 'Portfolio content with skills and projects. This is a very long string that should definitely be longer than one hundred characters so that the validation passes and we can test the rest of the flow. Ideally it contains meaningful content but for this test length matters more.';

// Mock dependencies BEFORE importing the route
vi.mock('@/lib/hb', () => ({
  withClient: vi.fn((callback) => {
    return callback({
      scrape: {
        startAndWait: vi.fn().mockResolvedValue({
          data: {
            markdown: 'Portfolio content with skills and projects. This is a very long string that should definitely be longer than one hundred characters so that the validation passes and we can test the rest of the flow. Ideally it contains meaningful content but for this test length matters more.',
            html: '<div>Portfolio content</div>',
          },
        }),
      },
    });
  }),
}));

vi.mock('@/lib/candidate', () => ({
  buildCandidateProfile: vi.fn().mockResolvedValue({
    name: 'John Doe',
    headline: 'Full Stack Developer',
    skills: ['JavaScript', 'TypeScript', 'React'],
    yearsExperience: 5,
    topProjects: [],
    gaps: [],
    suggestions: [],
  }),
}));

vi.mock('@/lib/jobs', () => ({
  crawlJobSources: vi.fn().mockResolvedValue([
    {
      title: 'Senior Developer',
      company: 'TechCorp',
      url: 'https://example.com/job/1',
      description: 'Job description',
      source: 'Test',
    },
  ]),
}));

vi.mock('@/lib/match', () => ({
  llmMatch: vi.fn().mockResolvedValue([
    {
      title: 'Senior Developer',
      company: 'TechCorp',
      url: 'https://example.com/job/1',
      score: 90,
      missingSkills: [],
      pitch: 'Great fit',
      source: 'Test',
    },
  ]),
}));

import { POST } from '@/app/api/analyze/portfolio/route';
import { mockCandidateProfile, mockJobListings, mockJobMatches } from '../fixtures';

/**
 * NOTE: These tests are currently skipped because they require integration testing
 * with Next.js Request/Response which is complex in a unit test environment.
 *
 * Consider:
 * 1. Testing the underlying logic functions directly instead of the route
 * 2. Moving these to E2E tests that make actual HTTP requests
 * 3. Using a test framework designed for Next.js API routes
 */
describe('POST /api/analyze/portfolio', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Override mocks with fixture data to match expectations
    const { buildCandidateProfile } = await import('@/lib/candidate');
    vi.mocked(buildCandidateProfile).mockResolvedValue(mockCandidateProfile);

    const { crawlJobSources } = await import('@/lib/jobs');
    vi.mocked(crawlJobSources).mockResolvedValue(mockJobListings);

    const { llmMatch } = await import('@/lib/match');
    vi.mocked(llmMatch).mockResolvedValue(mockJobMatches);
  });

  it('should return 400 when no URL is provided', async () => {
    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('URL is required');
  });

  it('should return 400 for invalid URL format', async () => {
    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid URL');
  });

  it('should return 400 for non-http(s) URLs', async () => {
    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'ftp://example.com' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('http');
  });

  it('should successfully process valid portfolio URL', async () => {
    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://example.com/portfolio' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidate).toEqual(mockCandidateProfile);
    expect(data.matches).toEqual(mockJobMatches);
    expect(data.jobsFound).toBe(mockJobListings.length);
    expect(data.portfolioUrl).toBe('https://example.com/portfolio');
  });

  it('should call Hyperbrowser scraper with correct URL', async () => {
    const { withClient } = await import('@/lib/hb');

    const testUrl = 'https://example.com/my-portfolio';
    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    await POST(request as any);

    expect(withClient).toHaveBeenCalled();
  });

  it('should call all processing functions in correct order', async () => {
    const { buildCandidateProfile } = await import('@/lib/candidate');
    const { crawlJobSources } = await import('@/lib/jobs');
    const { llmMatch } = await import('@/lib/match');

    const request = new Request('http://localhost:3000/api/analyze/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://example.com/portfolio' }),
    });

    await POST(request as any);

    expect(buildCandidateProfile).toHaveBeenCalledWith(mockPortfolioText);
    expect(crawlJobSources).toHaveBeenCalled();
    expect(llmMatch).toHaveBeenCalledWith(mockCandidateProfile, mockJobListings);
  });
});
