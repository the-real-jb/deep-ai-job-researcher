import { CandidateProfile } from '@/lib/candidate';

export const mockCandidateProfile: CandidateProfile = {
  name: 'John Doe',
  headline: 'Full Stack Developer',
  skills: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Next.js',
    'Python',
    'PostgreSQL',
    'AWS',
  ],
  yearsExperience: 5,
  topProjects: [
    'E-commerce platform with 100k+ users',
    'Real-time chat application using WebSockets',
    'AI-powered recommendation engine',
  ],
  gaps: [
    'Machine Learning frameworks (TensorFlow, PyTorch)',
    'Kubernetes and container orchestration',
  ],
  suggestions: [
    'Consider learning ML frameworks for AI projects',
    'Gain experience with DevOps tools',
  ],
};

export const mockResumeText = `
John Doe
Full Stack Developer
Email: john.doe@example.com
Phone: (555) 123-4567

SUMMARY
Experienced Full Stack Developer with 5 years of experience building scalable web applications.
Proficient in JavaScript, TypeScript, React, Node.js, and cloud technologies.

SKILLS
- Frontend: React, Next.js, TypeScript, HTML, CSS, TailwindCSS
- Backend: Node.js, Express, Python, PostgreSQL, MongoDB
- Cloud: AWS (EC2, S3, Lambda), Docker
- Tools: Git, VS Code, Postman

EXPERIENCE
Senior Full Stack Developer - Tech Company (2021-Present)
- Built e-commerce platform serving 100k+ users
- Implemented real-time chat using WebSockets
- Developed AI-powered recommendation engine

Full Stack Developer - Startup Inc (2019-2021)
- Created RESTful APIs and microservices
- Optimized database queries improving performance by 40%
- Mentored junior developers

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2015-2019)
`;
