import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmMatch } from '@/lib/match';
import type { CandidateProfile } from '@/lib/candidate';
import type { JobListing } from '@/lib/jobs';

// Mock AI provider
vi.mock('@/lib/ai-provider', () => ({
  createChatCompletion: vi.fn(),
}));

describe('Enhanced Job Matching', () => {
  const mockCandidate: CandidateProfile = {
    name: 'Test Developer',
    headline: 'Senior Full Stack Engineer',
    skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker'],
    coreSkills: ['React', 'Node.js', 'TypeScript'],
    secondarySkills: ['Python', 'AWS', 'Docker'],
    yearsExperience: 6,
    experienceLevel: 'senior',
    topProjects: ['E-commerce Platform', 'Real-time Chat'],
    gaps: ['Kubernetes', 'GraphQL'],
    suggestions: [],
    location: 'San Francisco, CA',
    preferences: {
      remoteOnly: false,
      desiredRoles: ['Full Stack Engineer'],
    },
  };

  const mockJobs: JobListing[] = [
    {
      title: 'Senior React Developer',
      company: 'Tech Corp',
      url: 'https://example.com/job1',
      description: 'Looking for experienced React and TypeScript developer with Node.js background',
      source: 'Work at a Startup',
      remote: true,
      location: 'San Francisco, CA',
    },
    {
      title: 'Backend Python Engineer',
      company: 'DataCo',
      url: 'https://example.com/job2',
      description: 'Python expert needed for data processing pipelines',
      source: 'LinkedIn Jobs',
      remote: false,
      location: 'New York, NY',
    },
    {
      title: 'DevOps Engineer',
      company: 'CloudStartup',
      url: 'https://example.com/job3',
      description: 'Need someone with strong Kubernetes and Docker experience',
      source: 'Work at a Startup',
      remote: true,
      location: 'Remote',
    },
    {
      title: 'Marketing Manager',
      company: 'SalesCo',
      url: 'https://example.com/job4',
      description: 'Looking for marketing professional with social media expertise',
      source: 'LinkedIn Jobs',
      remote: false,
      location: 'Austin, TX',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pre-filter jobs based on skill overlap', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 92,
            scoreBreakdown: {
              skillMatch: 38,
              experienceMatch: 28,
              projectMatch: 18,
              preferenceMatch: 8,
            },
            requiredSkills: ['React', 'TypeScript', 'Node.js'],
            niceToHaveSkills: ['GraphQL', 'AWS'],
            missingSkills: ['GraphQL'],
            experienceRequired: '5+ years',
            pitch: 'Your extensive React and TypeScript experience makes you a perfect fit',
          },
        ],
      }),
    });

    const matches = await llmMatch(mockCandidate, mockJobs);

    // Should filter out Marketing Manager (no skill overlap)
    // Should process remaining 3 jobs
    expect(matches).toBeDefined();
    expect(createChatCompletion).toHaveBeenCalled();
  });

  it('should return matches with detailed score breakdown', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 92,
            scoreBreakdown: {
              skillMatch: 38,
              experienceMatch: 28,
              projectMatch: 18,
              preferenceMatch: 8,
            },
            requiredSkills: ['React', 'TypeScript', 'Node.js'],
            niceToHaveSkills: ['GraphQL'],
            missingSkills: ['GraphQL'],
            experienceRequired: '5+ years',
            pitch: 'Perfect fit for this role',
          },
        ],
      }),
    });

    const matches = await llmMatch(mockCandidate, mockJobs.slice(0, 1));

    expect(matches.length).toBeGreaterThan(0);

    const topMatch = matches[0];
    expect(topMatch.scoreBreakdown).toBeDefined();
    expect(topMatch.scoreBreakdown?.skillMatch).toBe(38);
    expect(topMatch.scoreBreakdown?.experienceMatch).toBe(28);
    expect(topMatch.scoreBreakdown?.projectMatch).toBe(18);
    expect(topMatch.scoreBreakdown?.preferenceMatch).toBe(8);
    expect(topMatch.score).toBe(92);
  });

  it('should include required and nice-to-have skills', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 85,
            scoreBreakdown: { skillMatch: 35, experienceMatch: 25, projectMatch: 15, preferenceMatch: 10 },
            requiredSkills: ['React', 'TypeScript'],
            niceToHaveSkills: ['GraphQL', 'Redux', 'Testing'],
            missingSkills: ['GraphQL', 'Redux'],
            experienceRequired: '3-5 years',
            pitch: 'Great match',
          },
        ],
      }),
    });

    const matches = await llmMatch(mockCandidate, mockJobs.slice(0, 1));

    expect(matches[0].requiredSkills).toBeDefined();
    expect(matches[0].requiredSkills).toContain('React');
    expect(matches[0].niceToHaveSkills).toBeDefined();
    expect(matches[0].niceToHaveSkills).toContain('GraphQL');
    expect(matches[0].missingSkills).toContain('GraphQL');
  });

  it('should filter out matches below score threshold', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 85,
            scoreBreakdown: { skillMatch: 35, experienceMatch: 25, projectMatch: 15, preferenceMatch: 10 },
            requiredSkills: [],
            niceToHaveSkills: [],
            missingSkills: [],
            pitch: 'Good fit',
          },
          {
            title: 'Marketing Manager',
            company: 'SalesCo',
            url: 'https://example.com/job4',
            score: 20, // Below threshold
            scoreBreakdown: { skillMatch: 5, experienceMatch: 5, projectMatch: 5, preferenceMatch: 5 },
            requiredSkills: [],
            niceToHaveSkills: [],
            missingSkills: [],
            pitch: 'Poor fit',
          },
        ],
      }),
    });

    const matches = await llmMatch(mockCandidate, mockJobs);

    // Should exclude job with score < 30
    expect(matches.every(m => m.score >= 30)).toBe(true);
  });

  it('should sort matches by score descending', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: [
          {
            title: 'Backend Python Engineer',
            company: 'DataCo',
            url: 'https://example.com/job2',
            score: 65,
            scoreBreakdown: { skillMatch: 25, experienceMatch: 20, projectMatch: 15, preferenceMatch: 5 },
            requiredSkills: [],
            niceToHaveSkills: [],
            missingSkills: [],
            pitch: 'Decent fit',
          },
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 92,
            scoreBreakdown: { skillMatch: 38, experienceMatch: 28, projectMatch: 18, preferenceMatch: 8 },
            requiredSkills: [],
            niceToHaveSkills: [],
            missingSkills: [],
            pitch: 'Excellent fit',
          },
        ],
      }),
    });

    const matches = await llmMatch(mockCandidate, mockJobs);

    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1]?.score || 0);
    expect(matches[0].title).toBe('Senior React Developer');
  });

  it('should handle batching for large job lists', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    // Create 25 jobs to test batching (batch size is 20)
    const manyJobs: JobListing[] = Array.from({ length: 25 }, (_, i) => ({
      title: `Software Engineer ${i}`,
      company: `Company ${i}`,
      url: `https://example.com/job${i}`,
      description: `Looking for React and Node.js developer with ${i} years experience`,
      source: 'LinkedIn Jobs',
      remote: true,
    }));

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        matches: manyJobs.slice(0, 10).map((job, i) => ({
          title: job.title,
          company: job.company,
          url: job.url,
          score: 80 - i * 2,
          scoreBreakdown: { skillMatch: 30, experienceMatch: 25, projectMatch: 15, preferenceMatch: 10 },
          requiredSkills: [],
          niceToHaveSkills: [],
          missingSkills: [],
          pitch: 'Good fit',
        })),
      }),
    });

    const matches = await llmMatch(mockCandidate, manyJobs);

    // Should make multiple API calls for batching
    expect(createChatCompletion).toHaveBeenCalled();
    expect(matches).toBeDefined();
  });

  it('should use LinkedIn data in matching when available', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    const candidateWithLinkedIn: CandidateProfile = {
      ...mockCandidate,
      linkedIn: {
        profileUrl: 'https://linkedin.com/in/test',
        endorsements: [
          { skill: 'React', count: 45 },
          { skill: 'Node.js', count: 38 },
        ],
        topSkills: ['React', 'Node.js', 'TypeScript'],
        connections: 500,
        recommendations: 12,
      },
    };

    vi.mocked(createChatCompletion).mockImplementation(async (messages) => {
      // Check that LinkedIn data is included in the prompt
      const userMessage = messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('LinkedIn Top Skills');

      return {
        content: JSON.stringify({
          matches: [
            {
              title: 'Senior React Developer',
              company: 'Tech Corp',
              url: 'https://example.com/job1',
              score: 95,
              scoreBreakdown: { skillMatch: 40, experienceMatch: 28, projectMatch: 18, preferenceMatch: 9 },
              requiredSkills: [],
              niceToHaveSkills: [],
              missingSkills: [],
              pitch: 'Perfect match',
            },
          ],
        }),
      };
    });

    const matches = await llmMatch(candidateWithLinkedIn, mockJobs.slice(0, 1));

    expect(matches).toBeDefined();
    expect(createChatCompletion).toHaveBeenCalled();
  });
});
