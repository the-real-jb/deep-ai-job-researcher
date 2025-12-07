import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crawlJobSources, JobListing } from '@/lib/jobs';
import { mockCrawlResult } from '../fixtures';

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

describe('Job Crawling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(progressMessages.some(msg => msg.includes('[CRAWL]'))).toBe(true);
  });

  it('should call onProgress callback during crawling', async () => {
    const onProgress = vi.fn();

    await crawlJobSources(onProgress);

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('[CRAWL]'));
  });

  it('should handle crawling errors gracefully', async () => {
    const { withClient } = await import('@/lib/hb');

    // Mock error scenario
    vi.mocked(withClient).mockRejectedValueOnce(new Error('Network error'));

    const onProgress = vi.fn();
    const jobs = await crawlJobSources(onProgress);

    // Should return empty array on error, not throw
    expect(jobs).toBeDefined();
    expect(Array.isArray(jobs)).toBe(true);
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
});
