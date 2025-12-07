import { withClient } from './hb';

export interface LinkedInProfileData {
  name?: string;
  headline?: string;
  location?: string;
  about?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  skills?: string[];
  endorsements?: Array<{
    skill: string;
    count: number;
  }>;
  connections?: number;
  recommendations?: number;
}

export async function scrapeLinkedInProfile(
  profileUrl: string,
  onProgress?: (message: string) => void
): Promise<LinkedInProfileData> {
  try {
    onProgress?.(`[LINKEDIN] Scraping profile: ${profileUrl}`);

    const profileData = await withClient(async (client) => {
      const result = await client.scrape.startAndWait({
        url: profileUrl,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        },
      });

      onProgress?.(`[LINKEDIN] Profile scraped successfully`);

      return parseLinkedInProfile(result);
    });

    onProgress?.(`[LINKEDIN] Extracted profile data for ${profileData.name || 'user'}`);
    return profileData;

  } catch (error) {
    console.error('Error scraping LinkedIn profile:', error);
    onProgress?.(`[ERROR] Failed to scrape LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // Return minimal data on error
    return {
      name: undefined,
      headline: undefined,
      skills: [],
    };
  }
}

function parseLinkedInProfile(scrapeResult: any): LinkedInProfileData {
  if (!scrapeResult.data) {
    return { skills: [] };
  }

  const content = scrapeResult.data.markdown || scrapeResult.data.html || '';
  const lines = content.split('\n');

  const profile: LinkedInProfileData = {
    skills: [],
    experience: [],
    endorsements: [],
  };

  // Extract name (usually first heading)
  for (const line of lines) {
    const nameMatch = line.match(/^#\s+(.+)/);
    if (nameMatch && !profile.name) {
      profile.name = nameMatch[1].trim();
      break;
    }
  }

  // Extract headline (usually after name)
  let foundName = false;
  for (const line of lines) {
    if (foundName && line.trim() && !line.startsWith('#')) {
      profile.headline = line.trim().replace(/[\*_]/g, '');
      break;
    }
    if (profile.name && line.includes(profile.name)) {
      foundName = true;
    }
  }

  // Extract location
  const locationMatch = content.match(/(?:location|based in|from)\s*:?\s*([^\n\r]{3,50})/i);
  if (locationMatch) {
    profile.location = locationMatch[1].trim();
  }

  // Extract about section
  const aboutMatch = content.match(/(?:about|summary)\s*:?\s*\n+([^\n#]{50,500})/i);
  if (aboutMatch) {
    profile.about = aboutMatch[1].trim();
  }

  // Extract skills
  const skillsSection = content.match(/(?:skills?|expertise)\s*:?\s*\n+([\s\S]{0,1000}?)(?:\n#{1,2}\s|$)/i);
  if (skillsSection) {
    const skillLines = skillsSection[1].split('\n');
    for (const line of skillLines) {
      // Match skills in various formats (bullets, lists, etc.)
      const skillMatch = line.match(/[-*•]\s*(.+?)(?:\s*[-–]\s*(\d+))?$/);
      if (skillMatch) {
        const skill = skillMatch[1].trim();
        const endorsementCount = skillMatch[2] ? parseInt(skillMatch[2]) : 0;

        if (skill && skill.length > 1 && skill.length < 50) {
          profile.skills?.push(skill);

          if (endorsementCount > 0) {
            profile.endorsements?.push({
              skill,
              count: endorsementCount,
            });
          }
        }
      }
    }
  }

  // If no skills found in section, extract from entire content
  if (profile.skills?.length === 0) {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
      'Angular', 'Vue', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB',
      'Git', 'CI/CD', 'Machine Learning', 'Data Analysis', 'DevOps',
      'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum'
    ];

    const contentLower = content.toLowerCase();
    for (const skill of commonSkills) {
      if (contentLower.includes(skill.toLowerCase())) {
        profile.skills?.push(skill);
      }
    }
  }

  // Extract experience
  const experienceSection = content.match(/(?:experience|work history)\s*:?\s*\n+([\s\S]{0,2000}?)(?:\n#{1,2}\s|education|$)/i);
  if (experienceSection) {
    const expLines = experienceSection[1].split('\n');
    let currentExp: Partial<{ title: string; company: string; duration?: string; description?: string }> = {};

    for (const line of expLines) {
      const trimmed = line.trim();

      // Job title pattern
      if (trimmed.match(/^#{3,4}|^[A-Z][^a-z]*$/)) {
        if (currentExp.title && currentExp.company) {
          profile.experience?.push(currentExp as any);
        }
        currentExp = { title: trimmed.replace(/^#{3,4}\s*/, '').trim(), company: '', duration: '', description: '' };
      }
      // Company pattern
      else if (currentExp.title && !currentExp.company && trimmed.length > 2) {
        currentExp.company = trimmed.replace(/[\*_]/g, '');
      }
      // Duration pattern
      else if (trimmed.match(/\d{4}/)) {
        currentExp.duration = trimmed;
      }
    }

    if (currentExp.title && currentExp.company) {
      profile.experience?.push(currentExp as any);
    }
  }

  // Extract connections count
  const connectionsMatch = content.match(/(\d+(?:,\d+)*)\s*connections?/i);
  if (connectionsMatch) {
    profile.connections = parseInt(connectionsMatch[1].replace(/,/g, ''));
  }

  // Extract recommendations count
  const recommendationsMatch = content.match(/(\d+)\s*recommendations?/i);
  if (recommendationsMatch) {
    profile.recommendations = parseInt(recommendationsMatch[1]);
  }

  return profile;
}

export function convertLinkedInDataToText(data: LinkedInProfileData): string {
  let text = '';

  if (data.name) text += `Name: ${data.name}\n`;
  if (data.headline) text += `Headline: ${data.headline}\n`;
  if (data.location) text += `Location: ${data.location}\n`;
  if (data.about) text += `\nAbout:\n${data.about}\n`;

  if (data.skills && data.skills.length > 0) {
    text += `\nSkills:\n${data.skills.join(', ')}\n`;
  }

  if (data.endorsements && data.endorsements.length > 0) {
    text += `\nTop Endorsed Skills:\n`;
    const sorted = [...data.endorsements].sort((a, b) => b.count - a.count).slice(0, 10);
    sorted.forEach(e => {
      text += `- ${e.skill} (${e.count} endorsements)\n`;
    });
  }

  if (data.experience && data.experience.length > 0) {
    text += `\nExperience:\n`;
    data.experience.slice(0, 5).forEach(exp => {
      text += `- ${exp.title} at ${exp.company}`;
      if (exp.duration) text += ` (${exp.duration})`;
      text += '\n';
      if (exp.description) text += `  ${exp.description}\n`;
    });
  }

  if (data.connections) {
    text += `\nConnections: ${data.connections}\n`;
  }

  if (data.recommendations) {
    text += `Recommendations: ${data.recommendations}\n`;
  }

  return text;
}
