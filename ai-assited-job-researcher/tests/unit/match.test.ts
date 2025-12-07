import { describe, it, expect, vi } from 'vitest';
import { formatMatchesForExport, generateOutreachEmail } from '@/lib/match';
import { mockCandidateProfile, mockJobMatches } from '../fixtures';

describe('Job Match Functions', () => {
  describe('formatMatchesForExport', () => {
    it('should format matches for export with candidate info', () => {
      const result = formatMatchesForExport(mockJobMatches, mockCandidateProfile);

      expect(result).toHaveProperty('candidate');
      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('summary');

      expect(result.candidate.name).toBe(mockCandidateProfile.name);
      expect(result.candidate.headline).toBe(mockCandidateProfile.headline);
      expect(result.matches.length).toBe(mockJobMatches.length);
    });

    it('should include summary statistics', () => {
      const result = formatMatchesForExport(mockJobMatches, mockCandidateProfile);

      expect(result.summary.totalMatches).toBe(mockJobMatches.length);
      expect(result.summary.averageScore).toBeGreaterThan(0);
      expect(result.summary.topScore).toBe(92); // From mock data
    });

    it('should handle empty matches array', () => {
      const result = formatMatchesForExport([], mockCandidateProfile);

      expect(result.matches).toEqual([]);
      expect(result.summary.totalMatches).toBe(0);
      expect(result.summary.averageScore).toBe(0);
      expect(result.summary.topScore).toBe(0);
    });

    it('should add export date to each match', () => {
      const result = formatMatchesForExport(mockJobMatches, mockCandidateProfile);

      result.matches.forEach((match) => {
        expect(match).toHaveProperty('exportDate');
        expect(new Date(match.exportDate).toString()).not.toBe('Invalid Date');
      });
    });
  });

  describe('generateOutreachEmail', () => {
    it('should generate personalized email with job details', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      expect(email).toContain(match.title);
      expect(email).toContain(match.company);
      expect(email).toContain(match.pitch);
      expect(email).toContain(mockCandidateProfile.name);
    });

    it('should include candidate years of experience', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      expect(email).toContain(mockCandidateProfile.yearsExperience.toString());
    });

    it('should include candidate skills', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      // Should include at least some skills
      const skillsIncluded = mockCandidateProfile.skills
        .slice(0, 5)
        .some((skill) => email.includes(skill));

      expect(skillsIncluded).toBe(true);
    });

    it('should include top projects if available', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      if (mockCandidateProfile.topProjects.length > 0) {
        const projectIncluded = mockCandidateProfile.topProjects
          .slice(0, 2)
          .some((project) => email.includes(project));

        expect(projectIncluded).toBe(true);
      }
    });

    it('should include Hyperbrowser attribution', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      expect(email).toContain('Hyperbrowser');
    });

    it('should have proper email structure', () => {
      const match = mockJobMatches[0];
      const email = generateOutreachEmail(match, mockCandidateProfile);

      expect(email).toContain('Subject:');
      expect(email).toContain('Dear Hiring Manager');
      expect(email).toContain('Best regards');
    });
  });
});
