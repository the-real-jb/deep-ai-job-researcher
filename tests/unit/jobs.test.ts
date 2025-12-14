import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crawlJobSources, JobListing } from '@/lib/jobs';
import { mockCrawlResult } from '../fixtures';
import * as cacheModule from '@/lib/cache';
import * as rateLimitModule from '@/lib/rate-limit';

// Mock the cache module
vi.mock('@/lib/cache', () => ({
  getCachedData: vi.fn().mockReturnValue(null),
  setCachedData: vi.fn(),
  generateCacheKey: vi.fn((source, params) => `${source}-${JSON.stringify(params)}`),
}));

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
  incrementRateLimit: vi.fn(),
}));

// Mock the Hyperbrowser client
vi.mock('@/lib/hb', () => ({
  withClient: vi.fn((callback) => {
    return callback({
      crawl: {
        startAndWait: vi.fn().mockResolvedValue(mockCrawlResult),
      },
    });
  }),
}));

// Mock global fetch for API sources
const mockFetchResponse = (data: any) => ({
  ok: true,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(''),
});

describe('Job Crawling', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset cache mock to return null (no cached data)
    vi.mocked(cacheModule.getCachedData).mockReturnValue(null);
    vi.mocked(cacheModule.generateCacheKey).mockImplementation((source, params) => `${source}-${JSON.stringify(params)}`);

    // Reset rate limit mock
    vi.mocked(rateLimitModule.checkRateLimit).mockReturnValue({ allowed: true, remaining: 100 });

    // Mock fetch for API sources
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: [] }));
  });

  it('should crawl job sources and return job listings', async () => {
    const progressMessages: string[] = [];
    const onProgress = (message: string) => {
      progressMessages.push(message);
    };

    const jobs = await crawlJobSources(onProgress);

    expect(jobs).toBeDefined();
    expect(Array.isArray(jobs)).toBe(true);
    expect(progressMessages.length).toBeGreaterThan(0);
    // With parallel crawling, we should see START message
    expect(progressMessages.some(msg => msg.includes('[START]') || msg.includes('[CRAWL]'))).toBe(true);
  });

  it('should call onProgress callback during crawling', async () => {
    const onProgress = vi.fn();

    await crawlJobSources(onProgress);

    expect(onProgress).toHaveBeenCalled();
    // With parallel crawling, should see START or CRAWL messages
    expect(onProgress).toHaveBeenCalledWith(expect.stringMatching(/\[(START|CRAWL|PARALLEL|COMPLETE)\]/));
  });

  it('should handle crawling errors gracefully', async () => {
    const { withClient } = await import('@/lib/hb');

    // Mock ALL withClient calls to reject (for scrape sources)
    vi.mocked(withClient).mockRejectedValue(new Error('Network error'));

    // Mock fetch to also fail for API sources
    global.fetch = vi.fn().mockRejectedValue(new Error('API error'));

    const onProgress = vi.fn();
    const jobs = await crawlJobSources(onProgress);

    // Should return empty array on error, not throw
    expect(jobs).toBeDefined();
    expect(Array.isArray(jobs)).toBe(true);
    // At least one ERROR message should have been logged
    expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
  });

  it('should parse job data from crawl results', async () => {
    const jobs = await crawlJobSources();

    if (jobs.length > 0) {
      const job = jobs[0];
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('url');
      expect(job).toHaveProperty('description');
      expect(job).toHaveProperty('source');
    }
  });

  it('should crawl sources in parallel', async () => {
    const progressMessages: string[] = [];
    const onProgress = (message: string) => {
      progressMessages.push(message);
    };

    await crawlJobSources(onProgress);

    // Should see the PARALLEL completion message
    expect(progressMessages.some(msg => msg.includes('[PARALLEL]'))).toBe(true);
  });

  it('should use cached data when available', async () => {
    const cachedJobs: JobListing[] = [
      {
        title: 'Cached Job',
        company: 'Cache Corp',
        url: 'https://example.com/cached',
        description: 'A cached job',
        source: 'Work at a Startup',
      },
    ];

    // Make cache return jobs
    vi.mocked(cacheModule.getCachedData).mockReturnValue(cachedJobs);

    const progressMessages: string[] = [];
    const onProgress = (message: string) => {
      progressMessages.push(message);
    };

    const jobs = await crawlJobSources(onProgress);

    // Should see CACHE messages
    expect(progressMessages.some(msg => msg.includes('[CACHE]'))).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);
  });
});
