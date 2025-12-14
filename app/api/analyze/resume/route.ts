import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { extractTextFromPDF } from '@/lib/pdf';
import { buildCandidateProfile } from '@/lib/candidate';
import { crawlJobSources } from '@/lib/jobs';
import { llmMatch } from '@/lib/match';
import { AuthContext } from '@/lib/ai-provider';

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

    // Crawl job sources (this will be streamed in a real implementation)
    console.log('Starting job crawl...');
    const jobs = await crawlJobSources((msg) => console.log(msg));
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