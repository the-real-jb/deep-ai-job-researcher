import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCandidateProfile } from '@/lib/candidate';

// Mock AI provider
vi.mock('@/lib/ai-provider', () => ({
  createChatCompletion: vi.fn(),
}));

describe('Enhanced Candidate Profile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should extract core and secondary skills from resume', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        name: 'Test Developer',
        headline: 'Full Stack Engineer',
        skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker'],
        coreSkills: ['React', 'Node.js', 'TypeScript'],
        secondarySkills: ['Python', 'AWS', 'Docker'],
        yearsExperience: 5,
        experienceLevel: 'senior',
        topProjects: ['E-commerce Platform', 'Real-time Chat App'],
        gaps: ['GraphQL', 'Kubernetes'],
        suggestions: ['Learn system design', 'Get AWS certification'],
        location: 'San Francisco, CA',
        preferences: {
          remoteOnly: true,
          desiredRoles: ['Full Stack Engineer', 'Backend Engineer'],
        },
      }),
    });

    const profile = await buildCandidateProfile('Resume text...');

    expect(profile.coreSkills).toBeDefined();
    expect(profile.coreSkills?.length).toBe(3);
    expect(profile.coreSkills).toContain('React');
    expect(profile.secondarySkills).toContain('Python');
    expect(profile.experienceLevel).toBe('senior');
    expect(profile.location).toBe('San Francisco, CA');
    expect(profile.preferences?.remoteOnly).toBe(true);
  });

  it('should determine experience level from years', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    // Entry level (1 year)
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 1,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const entryProfile = await buildCandidateProfile('Entry level resume');
    expect(entryProfile.experienceLevel).toBe('entry');

    // Mid level (4 years)
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 4,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const midProfile = await buildCandidateProfile('Mid level resume');
    expect(midProfile.experienceLevel).toBe('mid');

    // Senior level (8 years)
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 8,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const seniorProfile = await buildCandidateProfile('Senior resume');
    expect(seniorProfile.experienceLevel).toBe('senior');

    // Staff level (12 years)
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 12,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const staffProfile = await buildCandidateProfile('Staff resume');
    expect(staffProfile.experienceLevel).toBe('staff');

    // Principal level (20 years)
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 20,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const principalProfile = await buildCandidateProfile('Principal resume');
    expect(principalProfile.experienceLevel).toBe('principal');
  });

  it('should handle missing optional fields gracefully', async () => {
    const { createChatCompletion } = await import('@/lib/ai-provider');

    vi.mocked(createChatCompletion).mockResolvedValue({
      content: JSON.stringify({
        skills: ['JavaScript'],
        yearsExperience: 3,
        topProjects: [],
        gaps: [],
        suggestions: [],
      }),
    });

    const profile = await buildCandidateProfile('Minimal resume');

    expect(profile.skills).toBeDefined();
    expect(profile.coreSkills).toBeDefined(); // Should fallback to first 5 skills
    expect(profile.secondarySkills).toBeDefined();
    expect(profile.experienceLevel).toBe('mid'); // Derived from 3 years
  });
});
