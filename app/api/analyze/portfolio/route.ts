import { NextRequest, NextResponse } from 'next/server';
import { withClient } from '@/lib/hb';
import { buildCandidateProfile, type CandidateProfile } from '@/lib/candidate';
import { crawlJobSources } from '@/lib/jobs';
import { llmMatch } from '@/lib/match';

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
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return NextResponse.json(
          { error: 'URL must start with http:// or https://' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Scrape portfolio website
    const portfolioText = await withClient(async (client) => {
      const result = await client.scrape.startAndWait({
        url,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        },
      });

      if (!result.data?.markdown && !result.data?.html) {
        throw new Error('Could not extract content from portfolio website');
      }

      // Use markdown if available, otherwise extract text from HTML
      if (result.data.markdown) {
        return result.data.markdown;
      }

      if (result.data.html) {
        const textContent = result.data.html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return textContent;
      }

      throw new Error('No content extracted from portfolio');
    });

    if (!portfolioText || portfolioText.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract meaningful content from portfolio' },
        { status: 400 }
      );
    }

    // Build candidate profile from portfolio content
    const candidate = await buildCandidateProfile(portfolioText);

    // Build dynamic job search keywords based on the candidate profile
    const jobKeywords = deriveJobKeywords(candidate);

    // Crawl job sources with dynamic keywords
    const jobs = await crawlJobSources(
      undefined,
      jobKeywords.length ? { keywords: jobKeywords } : undefined
    );

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
      portfolioUrl: url,
    });

  } catch (error) {
    console.error('Portfolio analysis error:', error);
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
    { message: 'Portfolio analysis endpoint. Use POST with URL in JSON body.' },
    { status: 405 }
  );
} 