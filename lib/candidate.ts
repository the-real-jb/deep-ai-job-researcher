import { createChatCompletion, AuthContext } from './ai-provider';

export interface CandidatePreferences {
  desiredRoles?: string[];
  locationPreferences?: string[];
  remoteOnly?: boolean;
  companySizePreference?: 'startup' | 'midsize' | 'enterprise' | 'any';
  industryPreferences?: string[];
}

export interface CandidateProfile {
  name?: string;
  headline?: string;
  skills: string[];
  coreSkills?: string[]; // Primary expertise areas
  secondarySkills?: string[]; // Supporting/learning skills
  yearsExperience: number;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'staff' | 'principal';
  topProjects: string[];
  gaps: string[];
  suggestions: string[];
  preferences?: CandidatePreferences;
  location?: string;
}

export async function buildCandidateProfile(
  text: string,
  authContext?: AuthContext
): Promise<CandidateProfile> {
  try {
    const result = await createChatCompletion(
      [
        {
          role: 'system',
          content: `Extract candidate profile information from the provided text (resume or portfolio). Return a JSON object with the following structure:
          {
            "name": "string (if present)",
            "headline": "string (brief professional title/summary)",
            "skills": ["array of ALL technical skills, tools, frameworks, languages"],
            "coreSkills": ["array of 3-5 PRIMARY/EXPERT skills"],
            "secondarySkills": ["array of supporting/intermediate skills"],
            "yearsExperience": "number (estimated total years of professional experience)",
            "experienceLevel": "entry|mid|senior|staff|principal",
            "topProjects": ["array of notable projects or achievements"],
            "gaps": ["array of potential skill gaps or areas for improvement"],
            "suggestions": ["array of suggested improvements or focus areas"],
            "location": "string (current location if mentioned)",
            "preferences": {
              "desiredRoles": ["array of role types they seem interested in"],
              "remoteOnly": "boolean (if they emphasize remote work)",
              "companySizePreference": "startup|midsize|enterprise|any"
            }
          }

          Be thorough in extracting ALL skills. Categorize skills into core (expert) vs secondary (working knowledge).
          Determine experience level: entry (0-2 years), mid (2-5 years), senior (5-10 years), staff (10-15 years), principal (15+ years).`
        },
        {
          role: 'user',
          content: text
        }
      ],
      {
        responseFormat: { type: 'json_object' },
        temperature: 0.3,
      },
      authContext
    );

    const content = result.content;
    const profile = JSON.parse(content) as CandidateProfile;

    // Validate and provide defaults
    return {
      name: profile.name || undefined,
      headline: profile.headline || 'Professional',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      coreSkills: Array.isArray(profile.coreSkills) ? profile.coreSkills : profile.skills?.slice(0, 5),
      secondarySkills: Array.isArray(profile.secondarySkills) ? profile.secondarySkills : [],
      yearsExperience: typeof profile.yearsExperience === 'number' ? profile.yearsExperience : 0,
      experienceLevel: profile.experienceLevel || deriveExperienceLevel(profile.yearsExperience),
      topProjects: Array.isArray(profile.topProjects) ? profile.topProjects : [],
      gaps: Array.isArray(profile.gaps) ? profile.gaps : [],
      suggestions: Array.isArray(profile.suggestions) ? profile.suggestions : [],
      location: profile.location,
      preferences: profile.preferences,
    };
  } catch (error) {
    console.error('Error building candidate profile:', error);
    throw new Error(
      `Failed to analyze candidate profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function deriveExperienceLevel(years: number): 'entry' | 'mid' | 'senior' | 'staff' | 'principal' {
  if (years < 2) return 'entry';
  if (years < 5) return 'mid';
  if (years < 10) return 'senior';
  if (years < 15) return 'staff';
  return 'principal';
} 