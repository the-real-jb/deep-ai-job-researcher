import { createChatCompletion } from './ai-provider';
import { CandidateProfile } from './candidate';
import { JobListing } from './jobs';

export interface JobMatch {
  title: string;
  company: string;
  url: string;
  score: number;
  scoreBreakdown?: {
    skillMatch: number;      // 0-40 points
    experienceMatch: number;  // 0-30 points
    projectMatch: number;     // 0-20 points
    preferenceMatch: number;  // 0-10 points
  };
  missingSkills: string[];
  requiredSkills?: string[];  // Skills that are must-haves
  niceToHaveSkills?: string[]; // Skills that are preferred
  pitch: string;
  location?: string;
  remote?: boolean;
  source: string;
  experienceRequired?: string; // e.g., "3-5 years", "Senior level"
}

export async function llmMatch(
  candidate: CandidateProfile,
  jobs: JobListing[],
  onProgress?: (message: string) => void
): Promise<JobMatch[]> {
  try {
    onProgress?.('[LLM] Starting job matching analysis...');

    // Pre-filter jobs using basic semantic matching to reduce LLM load
    const preFilteredJobs = preFilterJobs(candidate, jobs);
    onProgress?.(`[FILTER] Pre-filtered to ${preFilteredJobs.length} relevant jobs from ${jobs.length} total`);

    // Batch jobs if there are too many (process in groups of 20)
    const batchSize = 20;
    const allMatches: JobMatch[] = [];

    for (let i = 0; i < preFilteredJobs.length; i += batchSize) {
      const batch = preFilteredJobs.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(preFilteredJobs.length / batchSize);

      onProgress?.(`[LLM] Processing batch ${batchNum}/${totalBatches}...`);

      const batchMatches = await processBatch(candidate, batch);
      allMatches.push(...batchMatches);
    }

    // Sort by score and take top matches
    const sortedMatches = allMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit to top 50 matches

    onProgress?.(`[LLM] Found ${sortedMatches.length} quality matches`);
    return sortedMatches;

  } catch (error) {
    console.error('Error in LLM matching:', error);
    onProgress?.('[ERROR] Failed to analyze job matches');
    throw new Error(
      `Failed to analyze job matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function processBatch(
  candidate: CandidateProfile,
  jobs: JobListing[]
): Promise<JobMatch[]> {
  const result = await createChatCompletion(
    [
      {
        role: 'system',
        content: `You are an expert technical recruiter analyzing job-candidate fit. Provide detailed scoring with breakdown.

        Return JSON:
        {
          "matches": [
            {
              "title": "exact job title",
              "company": "exact company name",
              "url": "exact URL",
              "score": number (0-100),
              "scoreBreakdown": {
                "skillMatch": number (0-40, how well skills align),
                "experienceMatch": number (0-30, experience level fit),
                "projectMatch": number (0-20, relevant project experience),
                "preferenceMatch": number (0-10, location/remote/company preferences)
              },
              "requiredSkills": ["must-have skills for this role"],
              "niceToHaveSkills": ["preferred but not required skills"],
              "missingSkills": ["critical skills candidate lacks"],
              "experienceRequired": "experience level (e.g., '3-5 years', 'Senior')",
              "pitch": "one compelling sentence for application"
            }
          ]
        }

        Scoring guidelines:
        - skillMatch (40): Core technical skills alignment
        - experienceMatch (30): Years + seniority level match
        - projectMatch (20): Relevant project/domain experience
        - preferenceMatch (10): Location, remote, company size fit

        Only return jobs with total score ≥ 30. Be honest about skill gaps.`
      },
      {
        role: 'user',
        content: `Candidate:
        Name: ${candidate.name || 'Anonymous'}
        Headline: ${candidate.headline}
        Experience: ${candidate.yearsExperience} years (${candidate.experienceLevel || 'mid'} level)
        Core Skills: ${candidate.coreSkills?.join(', ') || candidate.skills.slice(0, 5).join(', ')}
        All Skills: ${candidate.skills.join(', ')}
        Top Projects: ${candidate.topProjects.join(', ')}
        Location: ${candidate.location || 'Not specified'}
        ${candidate.preferences?.remoteOnly ? 'Preference: Remote only' : ''}
        ${candidate.preferences?.desiredRoles ? `Desired Roles: ${candidate.preferences.desiredRoles.join(', ')}` : ''}

        Jobs:
        ${jobs.map((job, i) => `
        ${i + 1}. ${job.title} at ${job.company}
        URL: ${job.url}
        Description: ${job.description}
        Location: ${job.location || 'Not specified'}
        Remote: ${job.remote ? 'Yes' : 'No'}
        `).join('\n')}`
      }
    ],
    {
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
    }
  );

  const response = JSON.parse(result.content);
  const matches = response.matches || [];

  return matches
    .filter((match: any) => match.score >= 30)
    .map((match: any) => {
      const originalJob = jobs.find(j =>
        j.title === match.title && j.company === match.company
      );

      return {
        title: match.title,
        company: match.company,
        url: match.url,
        score: Math.min(100, Math.max(0, match.score)),
        scoreBreakdown: match.scoreBreakdown,
        requiredSkills: match.requiredSkills || [],
        niceToHaveSkills: match.niceToHaveSkills || [],
        missingSkills: Array.isArray(match.missingSkills) ? match.missingSkills : [],
        experienceRequired: match.experienceRequired,
        pitch: match.pitch || 'Great fit for this role',
        location: originalJob?.location,
        remote: originalJob?.remote,
        source: originalJob?.source || 'Unknown',
      };
    });
}

function preFilterJobs(candidate: CandidateProfile, jobs: JobListing[]): JobListing[] {
  // Simple keyword-based pre-filtering to reduce API costs
  const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
  const coreSkillsLower = (candidate.coreSkills || []).map(s => s.toLowerCase());

  return jobs.filter(job => {
    const jobText = `${job.title} ${job.description}`.toLowerCase();

    // Check if job mentions at least 1 core skill or 2 any skills
    const coreSkillMatches = coreSkillsLower.filter(skill =>
      jobText.includes(skill)
    ).length;

    const anySkillMatches = candidateSkillsLower.filter(skill =>
      jobText.includes(skill)
    ).length;

    // Include if: has core skill match OR has 1+ skill matches (relaxed from 2+ to avoid over-filtering)
    // If candidate has no core skills defined, we definitely want to fall back to any skill match.
    return coreSkillMatches >= 1 || anySkillMatches >= 1;
  });
}

export function formatMatchesForExport(matches: JobMatch[], candidate: CandidateProfile) {
  return {
    candidate: {
      name: candidate.name,
      headline: candidate.headline,
      yearsExperience: candidate.yearsExperience,
      skills: candidate.skills,
    },
    matches: matches.map(match => ({
      ...match,
      exportDate: new Date().toISOString(),
    })),
    summary: {
      totalMatches: matches.length,
      averageScore: matches.length > 0 
        ? Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length)
        : 0,
      topScore: matches.length > 0 ? Math.max(...matches.map(m => m.score)) : 0,
    }
  };
}

export function generateOutreachEmail(match: JobMatch, candidate: CandidateProfile): string {
  const subject = `Application for ${match.title} at ${match.company}`;
  
  const body = `Subject: ${subject}

Dear Hiring Manager,

I hope this email finds you well. I am writing to express my strong interest in the ${match.title} position at ${match.company}.

${match.pitch} With ${candidate.yearsExperience} years of experience and expertise in ${candidate.skills.slice(0, 5).join(', ')}, I believe I would be a valuable addition to your team.

${candidate.topProjects.length > 0 ? `Some of my notable achievements include: ${candidate.topProjects.slice(0, 2).join(', ')}.` : ''}

I would welcome the opportunity to discuss how my background and skills align with your team's needs. Thank you for your consideration.

Best regards,
${candidate.name || 'Your Name'}

---
Application generated with Hyperbrowser Deep Job Researcher`;

  return body;
} 