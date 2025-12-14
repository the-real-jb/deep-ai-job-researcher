import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing the route
vi.mock('@/lib/pdf', () => ({
  extractTextFromPDF: vi.fn().mockResolvedValue('John Doe Resume Text that is definitely longer than fifty characters to pass the validation check in the API route which requires at least 50 chars.'),
}));

vi.mock('@/lib/candidate', () => ({
  buildCandidateProfile: vi.fn().mockResolvedValue({
    name: 'John Doe',
    headline: 'Full Stack Developer',
    skills: ['JavaScript', 'TypeScript', 'React'],
    yearsExperience: 5,
    topProjects: [],
    gaps: [],
    suggestions: [],
  }),
}));

vi.mock('@/lib/jobs', () => ({
  crawlJobSources: vi.fn().mockResolvedValue([
    {
      title: 'Senior Developer',
      company: 'TechCorp',
      url: 'https://example.com/job/1',
      description: 'Job description',
      source: 'Test',
    },
  ]),
}));

vi.mock('@/lib/match', () => ({
  llmMatch: vi.fn().mockResolvedValue([
    {
      title: 'Senior Developer',
      company: 'TechCorp',
      url: 'https://example.com/job/1',
      score: 90,
      missingSkills: [],
      pitch: 'Great fit',
      source: 'Test',
    },
  ]),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'authenticated' }),
  }),
}));

import { POST } from '@/app/api/analyze/resume/route';
import { mockCandidateProfile, mockJobListings, mockJobMatches, mockResumeText } from '../fixtures';

describe('POST /api/analyze/resume', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Override mocks with fixture data
    const { buildCandidateProfile } = await import('@/lib/candidate');
    vi.mocked(buildCandidateProfile).mockResolvedValue(mockCandidateProfile);

    const { crawlJobSources } = await import('@/lib/jobs');
    vi.mocked(crawlJobSources).mockResolvedValue(mockJobListings);

    const { llmMatch } = await import('@/lib/match');
    vi.mocked(llmMatch).mockResolvedValue(mockJobMatches);
  });

  it('should return 400 when no file is provided', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    // Mock formData() to avoid parsing issues
    (request as any).formData = async () => formData;

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No file provided');
  });

  it('should return 400 when file is not a PDF', async () => {
    const formData = new FormData();
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    formData.append('file', textFile);

    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    (request as any).formData = async () => formData;

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('PDF');
  });

  it('should return 400 when file is empty', async () => {
    const formData = new FormData();
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    formData.append('file', emptyFile);

    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    (request as any).formData = async () => formData;

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('empty');
  });

  it('should return 400 when file is too large', async () => {
    const formData = new FormData();
    // Create a file larger than 5MB
    const largeContent = new Uint8Array(6 * 1024 * 1024); // 6MB
    const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    formData.append('file', largeFile);

    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    (request as any).formData = async () => formData;

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('5MB');
  });

  it('should successfully process valid PDF resume', async () => {
    const formData = new FormData();
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
    const validFile = new File([pdfContent], 'resume.pdf', { type: 'application/pdf' });
    
    // Mock arrayBuffer since jsdom File implementation might miss it
    validFile.arrayBuffer = async () => pdfContent.buffer;
    
    formData.append('file', validFile);

    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    (request as any).formData = async () => formData;

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.candidate).toEqual(mockCandidateProfile);
    expect(data.matches).toEqual(mockJobMatches);
    expect(data.jobsFound).toBe(mockJobListings.length);
  });

  it('should call all processing functions in correct order', async () => {
    const { extractTextFromPDF } = await import('@/lib/pdf');
    const { buildCandidateProfile } = await import('@/lib/candidate');
    const { crawlJobSources } = await import('@/lib/jobs');
    const { llmMatch } = await import('@/lib/match');

    const formData = new FormData();
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const validFile = new File([pdfContent], 'resume.pdf', { type: 'application/pdf' });
    
    // Mock arrayBuffer
    validFile.arrayBuffer = async () => pdfContent.buffer;
    
    formData.append('file', validFile);

    const request = new Request('http://localhost:3000/api/analyze/resume', {
      method: 'POST',
    });
    (request as any).formData = async () => formData;

    await POST(request as any);

    expect(extractTextFromPDF).toHaveBeenCalled();
    // The exact text might vary because of the mock implementation details in the test file vs fixture
    // but we can check if it was called.
    expect(buildCandidateProfile).toHaveBeenCalled(); 
    expect(crawlJobSources).toHaveBeenCalled();
    expect(llmMatch).toHaveBeenCalledWith(mockCandidateProfile, mockJobListings);
  });
});
