import { JobListing } from '@/lib/jobs';
import { JobMatch } from '@/lib/match';

export const mockJobListings: JobListing[] = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    remote: true,
    url: 'https://example.com/jobs/1',
    description: 'Looking for a senior full stack engineer with React and Node.js experience. Must have 5+ years of experience.',
    source: 'Work at a Startup',
  },
  {
    title: 'Frontend Developer',
    company: 'StartupXYZ',
    location: 'New York, NY',
    remote: false,
    url: 'https://example.com/jobs/2',
    description: 'Frontend developer position requiring React, TypeScript, and modern CSS frameworks.',
    source: 'Work at a Startup',
  },
  {
    title: 'Python Backend Engineer',
    company: 'DataCo',
    location: 'Remote',
    remote: true,
    url: 'https://example.com/jobs/3',
    description: 'Backend engineer role focused on Python, Django, and PostgreSQL. ML experience is a plus.',
    source: 'Work at a Startup',
  },
];

export const mockJobMatches: JobMatch[] = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'TechCorp',
    url: 'https://example.com/jobs/1',
    score: 92,
    missingSkills: ['Kubernetes'],
    pitch: 'Your 5 years of React and Node.js experience make you an excellent fit for this senior role.',
    location: 'San Francisco, CA',
    remote: true,
    source: 'Work at a Startup',
  },
  {
    title: 'Frontend Developer',
    company: 'StartupXYZ',
    url: 'https://example.com/jobs/2',
    score: 85,
    missingSkills: [],
    pitch: 'Your TypeScript and React expertise align perfectly with this frontend position.',
    location: 'New York, NY',
    remote: false,
    source: 'Work at a Startup',
  },
  {
    title: 'Python Backend Engineer',
    company: 'DataCo',
    url: 'https://example.com/jobs/3',
    score: 78,
    missingSkills: ['Django', 'Machine Learning'],
    pitch: 'Your Python and PostgreSQL skills are a strong foundation for this backend role.',
    location: 'Remote',
    remote: true,
    source: 'Work at a Startup',
  },
];

export const mockCrawlResult = {
  status: 'completed',
  data: [
    {
      markdown: `
# Senior Full Stack Engineer

TechCorp

San Francisco, CA • Remote

We're looking for a senior full stack engineer with React and Node.js experience.

## Requirements
- 5+ years of experience
- React, Node.js, TypeScript
- Experience with cloud platforms (AWS preferred)
      `,
      html: '<div>...</div>',
      metadata: {
        url: 'https://example.com/jobs/1',
      },
    },
  ],
};
