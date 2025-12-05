import { createChatCompletion } from './ai-provider';
import { CandidateProfile } from './candidate';
import { JobListing } from './jobs';

export interface JobMatch {
  title: string;
  company: string;
  url: string;
  score: number;
  missingSkills: string[];
  pitch: string;
  location?: string;
  remote?: boolean;
  source: string;
}

export async function llmMatch(
  candidate: CandidateProfile,
  jobs: JobListing[],
  onProgress?: (message: string) => void
): Promise<JobMatch[]> {
  try {
    onProgress?.('[LLM] Starting job matching analysis...');

    const result = await createChatCompletion(
      [
        {
          role: 'system',
          content: `You are a professional recruiter analyzing job matches for a candidate. Given a candidate profile and a list of job opportunities, provide a detailed analysis of how well each job matches the candidate.

          Return a JSON object with this exact structure:
          {
            "matches": [
              {
                "title": "exact job title from the job listing",
                "company": "exact company name from the job listing", 
                "url": "exact URL from the job listing",
                "score": "number from 0-100 indicating match quality",
                "missingSkills": ["array of skills candidate lacks for this role"],
                "pitch": "one sentence tailored pitch for why this candidate fits this role"
              }
            ]
          }

          Scoring criteria:
          - 90-100: Perfect match, candidate has all required skills and experience
          - 70-89: Strong match, candidate has most skills with minor gaps
          - 50-69: Good match, candidate has core skills but missing some important ones
          - 30-49: Potential match, candidate has some relevant skills but significant gaps
          - 0-29: Poor match, candidate lacks most required skills

          For missingSkills, identify specific technical skills, tools, or experience gaps.
          For pitch, craft a compelling one-liner that highlights the candidate's best attributes for that specific role.
          
          Only return jobs with scores above 30. Sort by score descending.`
        },
        {
          role: 'user',
          content: `Candidate Profile:
          Name: ${candidate.name || 'Anonymous'}
          Headline: ${candidate.headline}
          Years Experience: ${candidate.yearsExperience}
          Skills: ${candidate.skills.join(', ')}
          Top Projects: ${candidate.topProjects.join(', ')}
          
          Job Opportunities:
          ${jobs.map((job, index) => `
          ${index + 1}. ${job.title} at ${job.company}
          URL: ${job.url}
          Description: ${job.description}
          Location: ${job.location || 'Not specified'}
          Remote: ${job.remote ? 'Yes' : 'No'}
          Source: ${job.source}
          `).join('\n')}`
        }
      ],
      {
        responseFormat: { type: 'json_object' },
        temperature: 0.3,
      }
    );

    const content = result.content;

    onProgress?.('[LLM] Processing match results...');

    const response = JSON.parse(content);
    const matches = response.matches || [];

    // Validate and enhance matches with original job data
    const validMatches = matches
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
          missingSkills: Array.isArray(match.missingSkills) ? match.missingSkills : [],
          pitch: match.pitch || 'Great fit for this role',
          location: originalJob?.location,
          remote: originalJob?.remote,
          source: originalJob?.source || 'Unknown',
        };
      })
      .sort((a: JobMatch, b: JobMatch) => b.score - a.score);

    onProgress?.(`[LLM] Found ${validMatches.length} quality matches`);
    return validMatches;
    
  } catch (error) {
    console.error('Error in LLM matching:', error);
    onProgress?.('[ERROR] Failed to analyze job matches');
    throw new Error(
      `Failed to analyze job matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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