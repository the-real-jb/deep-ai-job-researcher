import { NextRequest, NextResponse } from 'next/server';
import { withClient } from '@/lib/hb';
import { buildCandidateProfile } from '@/lib/candidate';
import { crawlJobSources } from '@/lib/jobs';
import { llmMatch } from '@/lib/match';

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

    // Crawl job sources
    const jobs = await crawlJobSources();

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