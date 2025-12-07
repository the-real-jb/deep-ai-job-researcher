import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf';
import { buildLinkedInEnhancedProfile } from '@/lib/candidate';
import { crawlLinkedInJobs, crawlJobSources } from '@/lib/jobs';
import { llmMatch } from '@/lib/match';
import { scrapeLinkedInProfile, convertLinkedInDataToText } from '@/lib/linkedin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const linkedInUrl = formData.get('linkedInUrl') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'Resume PDF file is required' },
        { status: 400 }
      );
    }

    if (!linkedInUrl) {
      return NextResponse.json(
        { error: 'LinkedIn profile URL is required' },
        { status: 400 }
      );
    }

    // Validate LinkedIn URL
    try {
      const url = new URL(linkedInUrl);
      if (!url.hostname.includes('linkedin.com')) {
        return NextResponse.json(
          { error: 'Invalid LinkedIn URL. Must be a linkedin.com URL' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL format' },
        { status: 400 }
      );
    }

    // Validate PDF file
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be between 1 byte and 5MB' },
        { status: 400 }
      );
    }

    console.log('LinkedIn analysis started:', {
      fileName: file.name,
      fileSize: file.size,
      linkedInUrl,
    });

    // Step 1: Extract text from resume
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractTextFromPDF(buffer);

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from PDF' },
        { status: 400 }
      );
    }

    // Step 2: Scrape LinkedIn profile
    const linkedInData = await scrapeLinkedInProfile(linkedInUrl);
    const linkedInText = convertLinkedInDataToText(linkedInData);

    if (!linkedInText || linkedInText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful data from LinkedIn profile. The profile may be private or inaccessible.' },
        { status: 400 }
      );
    }

    // Step 3: Build enhanced candidate profile (resume + LinkedIn)
    const candidate = await buildLinkedInEnhancedProfile(
      resumeText,
      linkedInText,
      linkedInUrl
    );

    // Step 4: Crawl LinkedIn jobs using candidate's skills
    const keywords = candidate.coreSkills || candidate.skills.slice(0, 3);
    const linkedInJobs = await crawlLinkedInJobs(
      keywords,
      candidate.location
    );

    // Step 5: Also crawl other job sources for comparison
    const otherJobs = await crawlJobSources(undefined, {
      keywords: keywords,
    });

    // Combine all jobs
    const allJobs = [...linkedInJobs, ...otherJobs];

    if (allJobs.length === 0) {
      return NextResponse.json(
        { error: 'No jobs found during crawl. Try again later.' },
        { status: 404 }
      );
    }

    // Step 6: Match jobs with enhanced candidate profile
    const matches = await llmMatch(candidate, allJobs);

    return NextResponse.json({
      success: true,
      candidate,
      matches,
      jobsFound: allJobs.length,
      linkedInJobsFound: linkedInJobs.length,
      otherJobsFound: otherJobs.length,
      linkedInProfile: {
        name: linkedInData.name,
        headline: linkedInData.headline,
        location: linkedInData.location,
        connections: linkedInData.connections,
        skills: linkedInData.skills?.slice(0, 10),
      },
    });

  } catch (error) {
    console.error('LinkedIn analysis error:', error);
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
    { message: 'LinkedIn analysis endpoint. Use POST with PDF file and LinkedIn URL.' },
    { status: 405 }
  );
}
