import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmMatch, JobMatch } from '@/lib/match';
import { JobListing } from '@/lib/jobs';
import { CandidateProfile } from '@/lib/candidate';
import * as aiProvider from '@/lib/ai-provider';

// Mock the AI provider
vi.mock('@/lib/ai-provider', () => ({
  createChatCompletion: vi.fn(),
  detectProvider: vi.fn().mockReturnValue('openai'),
}));

describe('LINKEDIN_FEATURE.md Claims Validation', () => {
  const mockCandidate: CandidateProfile = {
    name: 'Test Candidate',
    headline: 'Senior Software Engineer',
    skills: ['TypeScript', 'React', 'Node.js', 'AWS'],
    coreSkills: ['TypeScript', 'React'], // Claim: coreSkills used for matching
    yearsExperience: 5,
    experienceLevel: 'Senior', // Claim: experienceLevel used
    topProjects: ['Project A'],
    suggestions: [],
    missingSkills: [],
  };

  const mockJobs: JobListing[] = [
    {
      title: 'Senior React Developer',
      company: 'Tech Corp',
      description: 'We need a React expert with TypeScript experience.',
      url: 'http://test.com/1',
      source: 'LinkedIn Jobs',
    },
    {
      title: 'Java Developer',
      company: 'Old Corp',
      description: 'Java and Spring Boot required.',
      url: 'http://test.com/2',
      source: 'LinkedIn Jobs',
    },
    {
      title: 'Frontend Engineer',
      company: 'Startup Inc',
      description: 'Looking for a frontend engineer with React skills.',
      url: 'http://test.com/3',
      source: 'Work at a Startup',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Claim: Pre-filtering (preFilterJobs)', () => {
    it('should filter out irrelevant jobs before LLM matching', async () => {
      // Setup mock to return a match for the jobs that pass filtering
      const mockLlmResponse = {
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'http://test.com/1',
            score: 90,
            scoreBreakdown: {
              skillMatch: 35,
              experienceMatch: 25,
              projectMatch: 15,
              preferenceMatch: 15,
            },
            pitch: 'Great fit',
          },
        ],
      };

      (aiProvider.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify(mockLlmResponse),
      });

      const matches = await llmMatch(mockCandidate, mockJobs);

      // Verify createChatCompletion was called
      expect(aiProvider.createChatCompletion).toHaveBeenCalledTimes(1);

      // Verify the prompt passed to LLM only contains relevant jobs
      // 'Java Developer' should be filtered out because it doesn't match 'TypeScript', 'React', etc.
      const callArgs = (aiProvider.createChatCompletion as any).mock.calls[0];
      const promptUserContent = callArgs[0][1].content;

      expect(promptUserContent).toContain('Senior React Developer'); // Matches 'React'
      expect(promptUserContent).toContain('Frontend Engineer'); // Matches 'React'
      expect(promptUserContent).not.toContain('Java Developer'); // Should be filtered out
    });

    it('should handle pre-filtering correctly when coreSkills are missing', async () => {
        // Test with a candidate having no coreSkills defined
        const candidateNoCore = { ...mockCandidate, coreSkills: undefined };
        
        // Setup mock to return empty matches just to satisfy the call
        (aiProvider.createChatCompletion as any).mockResolvedValue({
            content: JSON.stringify({ matches: [] }),
        });

        await llmMatch(candidateNoCore, mockJobs);

        const callArgs = (aiProvider.createChatCompletion as any).mock.calls[0];
        const promptUserContent = callArgs[0][1].content;
        
        // Should still match based on regular skills (anySkillMatches >= 2)
        // 'Senior React Developer' has 'React' and 'TypeScript' (from description context or implied) - wait, description says "React expert with TypeScript"
        // Skills: TypeScript, React, Node.js, AWS.
        // Job 1: "React expert with TypeScript" -> Matches React, TypeScript (2 matches) -> KEPT
        // Job 3: "frontend engineer with React skills" -> Matches React (1 match). AWS? Node? No.
        // If logic is "coreSkillMatches >= 1 || anySkillMatches >= 2"
        // With no core skills, it relies on anySkillMatches >= 2.
        
        expect(promptUserContent).toContain('Senior React Developer'); 
        // Job 3 might be filtered out if it only matches 1 skill (React) and we have no core skills defined to trigger the ">= 1" rule.
        // Let's check logic: (candidate.coreSkills || []) -> []
        // coreSkillMatches = 0.
        // anySkillMatches >= 2.
        
        // This test validates if strict filtering is the cause of "no matches"
    });
  });

  describe('Claim: Batch Processing', () => {
    it('should process jobs in batches of 20', async () => {
      // Create 25 relevant jobs
      const manyJobs = Array.from({ length: 25 }, (_, i) => ({
        title: `React Developer ${i}`,
        company: `Company ${i}`,
        description: 'React and TypeScript',
        url: `http://test.com/${i}`,
        source: 'LinkedIn',
      }));

      (aiProvider.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({ matches: [] }),
      });

      await llmMatch(mockCandidate, manyJobs);

      // Should be called twice: 1 batch of 20, 1 batch of 5
      expect(aiProvider.createChatCompletion).toHaveBeenCalledTimes(2);
    });
  });

  describe('Claim: Detailed Scoring Breakdown', () => {
    it('should return matches with score breakdown components', async () => {
      const mockLlmResponse = {
        matches: [
          {
            title: 'Senior React Developer',
            company: 'Tech Corp',
            url: 'http://test.com/1',
            score: 85,
            scoreBreakdown: {
              skillMatch: 30,
              experienceMatch: 25,
              projectMatch: 15,
              preferenceMatch: 15,
            },
            pitch: 'Great fit',
          },
        ],
      };

      (aiProvider.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify(mockLlmResponse),
      });

      const matches = await llmMatch(mockCandidate, [mockJobs[0]]);
      const match = matches[0];

      expect(match.scoreBreakdown).toBeDefined();
      expect(match.scoreBreakdown?.skillMatch).toBe(30);
      expect(match.scoreBreakdown?.experienceMatch).toBe(25);
      expect(match.scoreBreakdown?.projectMatch).toBe(15);
      expect(match.scoreBreakdown?.preferenceMatch).toBe(15);
    });
  });

  describe('Potential Issues: Edge Cases', () => {
    it('should filter out ALL jobs if candidate has no skills', async () => {
      const candidateNoSkills: CandidateProfile = {
        ...mockCandidate,
        skills: [],
        coreSkills: [],
      };

      // Even if LLM would match them, pre-filter stops them
      await llmMatch(candidateNoSkills, mockJobs);

      expect(aiProvider.createChatCompletion).not.toHaveBeenCalled();
    });

    it('should include job if only 1 regular skill matches (relaxed filtering)', async () => {
      const candidateOneSkill: CandidateProfile = {
        ...mockCandidate,
        skills: ['React'],
        coreSkills: [], // No core skills
      };
      
      const jobs = [mockJobs[2]]; // Frontend Engineer (React only mentioned in desc)

      // Mock successful response
      (aiProvider.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({ matches: [] }),
      });

      await llmMatch(candidateOneSkill, jobs);

      // Should NOT be filtered out (called once)
      expect(aiProvider.createChatCompletion).toHaveBeenCalledTimes(1);
    });
  });
});

