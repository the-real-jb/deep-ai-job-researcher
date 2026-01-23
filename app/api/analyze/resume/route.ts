import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { extractTextFromPDF } from '@/lib/pdf';
import { buildCandidateProfile, type CandidateProfile } from '@/lib/candidate';
import { crawlJobSources } from '@/lib/jobs';
import { llmMatch } from '@/lib/match';
import { AuthContext } from '@/lib/ai-provider';

function deriveJobKeywords(candidate: CandidateProfile): string[] {
  const keywords: string[] = [];

  // Prioritize explicit desired roles from preferences
  if (candidate.preferences?.desiredRoles?.length) {
    keywords.push(...candidate.preferences.desiredRoles);
  }

  // Use headline / title-like text from the resume
  if (candidate.headline) {
    keywords.push(candidate.headline);
  }

  // Add a few core skills to broaden the search surface
  if (candidate.coreSkills?.length) {
    keywords.push(...candidate.coreSkills.slice(0, 3));
  }

  // Normalize, dedupe, and keep the list concise
  const normalized = keywords
    .flatMap(k => k.split(/[,|/]/)) // split composite headlines like "SDET | QA Lead"
    .map(k => k.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const unique = normalized.filter(k => {
    const key = k.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Keep the top few to avoid over-broad searches
  return unique.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');
    const isAuthenticated = token?.value === 'authenticated';

    const authContext: AuthContext = { isAuthenticated };

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Received file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File appears to be empty (0 bytes)' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    const resumeText = await extractTextFromPDF(buffer);
    
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from PDF' },
        { status: 400 }
      );
    }

    // Build candidate profile
    console.log('Building candidate profile...');
    const candidate = await buildCandidateProfile(resumeText, authContext);
    console.log('Candidate profile built:', candidate.headline);

    // Build dynamic job search keywords based on the candidate profile
    const jobKeywords = deriveJobKeywords(candidate);

    // Crawl job sources (this will be streamed in a real implementation)
    console.log('Starting job crawl...');
    const jobs = await crawlJobSources(
      (msg) => console.log(msg),
      jobKeywords.length ? { keywords: jobKeywords } : undefined
    );
    console.log(`Job crawl complete. Found ${jobs.length} jobs.`);



    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No jobs found during crawl' },
        { status: 404 }
      );
    }

    // Match jobs with candidate
    const matches = await llmMatch(candidate, jobs);

    return NextResponse.json({
      success: true,
      candidate,
      matches,
      jobsFound: jobs.length,
    });

  } catch (error) {
    console.error('Resume analysis error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Resume analysis endpoint. Use POST with PDF file.' },
    { status: 405 }
  );
} 