import { createChatCompletion } from './ai-provider';

export interface CandidateProfile {
  name?: string;
  headline?: string;
  skills: string[];
  yearsExperience: number;
  topProjects: string[];
  gaps: string[];
  suggestions: string[];
}

export async function buildCandidateProfile(text: string): Promise<CandidateProfile> {
  try {
    const result = await createChatCompletion(
      [
        {
          role: 'system',
          content: `Extract candidate profile information from the provided text (resume or portfolio). Return a JSON object with the following structure:
          {
            "name": "string (if present)",
            "headline": "string (brief professional title/summary)",
            "skills": ["array of technical skills, tools, frameworks, languages"],
            "yearsExperience": "number (estimated total years of professional experience)",
            "topProjects": ["array of notable projects or achievements"],
            "gaps": ["array of potential skill gaps or areas for improvement"],
            "suggestions": ["array of suggested improvements or focus areas"]
          }
          
          Be thorough in extracting skills and technologies mentioned. For years of experience, make a reasonable estimate based on career progression, education, and project timelines.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      {
        responseFormat: { type: 'json_object' },
        temperature: 0.3,
      }
    );

    const content = result.content;

    const profile = JSON.parse(content) as CandidateProfile;
    
    // Validate and provide defaults
    return {
      name: profile.name || undefined,
      headline: profile.headline || 'Professional',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      yearsExperience: typeof profile.yearsExperience === 'number' ? profile.yearsExperience : 0,
      topProjects: Array.isArray(profile.topProjects) ? profile.topProjects : [],
      gaps: Array.isArray(profile.gaps) ? profile.gaps : [],
      suggestions: Array.isArray(profile.suggestions) ? profile.suggestions : [],
    };
  } catch (error) {
    console.error('Error building candidate profile:', error);
    throw new Error(
      `Failed to analyze candidate profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
} 