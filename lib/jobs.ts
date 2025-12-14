import { withClient } from './hb';
import { getCachedData, setCachedData, generateCacheKey } from './cache';
import { checkRateLimit, incrementRateLimit } from './rate-limit';

export interface JobListing {
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  description: string;
  source: string;
}

export interface JobSource {
  name: string;
  url: string;
  depth: number;
  selector?: string;
  type?: 'scrape' | 'api';
}

const JOB_SOURCES: JobSource[] = [
  {
    name: 'Work at a Startup',
    url: 'https://www.workatastartup.com/jobs',
    depth: 2,
    type: 'scrape',
  },
  {
    name: 'LinkedIn Jobs',
    url: 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States&f_TPR=r86400',
    depth: 1,
    type: 'scrape',
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com/jobs?q=software+engineer&l=United+States&fromage=1',
    depth: 1,
    type: 'scrape',
  },
  {
    name: 'Google Jobs',
    url: 'https://www.google.com/search?q=software+engineer+jobs&ibp=htl;jobs',
    depth: 1,
    type: 'scrape',
  },
  {
    name: 'Arbeitnow',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    depth: 1,
    type: 'api',
  },
  {
    name: 'We Work Remotely',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs',
    depth: 1,
    type: 'api',
  },
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/api',
    depth: 1,
    type: 'api',
  },
  {
    name: 'GitHub Jobs (Himalayas)',
    url: 'https://himalayas.app/jobs/api',
    depth: 1,
    type: 'api',
  },
];

interface CrawlSourceResult {
  source: JobSource;
  jobs: JobListing[];
  error?: string;
  fromCache: boolean;
}

/**
 * Crawl a single job source (used for parallel crawling)
 */
async function crawlSingleSource(
  source: JobSource,
  options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<CrawlSourceResult> {
  try {
    // 1. Check Cache
    const cacheKey = generateCacheKey(source.name, { keywords: options?.keywords });
    const cachedJobs = getCachedData<JobListing[]>(cacheKey);

    if (cachedJobs) {
      onProgress?.(`[CACHE] Found ${cachedJobs.length} jobs for ${source.name}`);
      return { source, jobs: cachedJobs, fromCache: true };
    }

    // 2. Check Rate Limit
    const { allowed, remaining } = checkRateLimit(source.name);
    if (!allowed) {
      onProgress?.(`[LIMIT] Rate limit reached for ${source.name}. Skipping.`);
      console.warn(`Rate limit reached for ${source.name}`);
      return { source, jobs: [], fromCache: false, error: 'Rate limit reached' };
    }

    onProgress?.(`[CRAWL] Starting ${source.name}... (${remaining} requests remaining)`);

    let jobs: JobListing[] = [];

    if (source.type === 'api') {
      jobs = await fetchFromApi(source, options, onProgress);
    } else {
      jobs = await withClient(async (client) => {
        // Build search URL with keywords based on source
        let searchUrl = source.url;
        const keywordString = options?.keywords?.slice(0, 3).join('%20') || 'software%20engineer';

        if (source.name === 'LinkedIn Jobs' && options?.keywords && options.keywords.length > 0) {
          searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${keywordString}&location=United%20States&f_TPR=r86400`;
        } else if (source.name === 'Indeed' && options?.keywords && options.keywords.length > 0) {
          const indeedKeywords = options.keywords.slice(0, 3).join('+');
          searchUrl = `https://www.indeed.com/jobs?q=${indeedKeywords}&l=United+States&fromage=1`;
        } else if (source.name === 'Google Jobs' && options?.keywords && options.keywords.length > 0) {
          const googleKeywords = options.keywords.slice(0, 3).join('+');
          searchUrl = `https://www.google.com/search?q=${googleKeywords}+jobs&ibp=htl;jobs`;
        }

        // Limit pages for rate-limited sources
        const maxPages = ['LinkedIn Jobs', 'Indeed', 'Google Jobs'].includes(source.name) ? 3 : 10;

        const result = await client.crawl.startAndWait({
          url: searchUrl,
          maxPages,
          scrapeOptions: {
            formats: ['markdown', 'html'],
          },
        });

        onProgress?.(`[CRAWL] ${source.name} - ${result.status || 'completed'} - ${result.data?.length || 0} pages`);

        return parseJobsFromCrawlResult(result, source);
      });

      // Increment rate limit for scraped sources
      incrementRateLimit(source.name);
    }

    // 3. Set Cache (TTL 2 hours = 7200 seconds)
    if (jobs.length > 0) {
      setCachedData(cacheKey, jobs, 7200);
    }

    onProgress?.(`[PARSE] Extracted ${jobs.length} jobs from ${source.name}`);
    return { source, jobs, fromCache: false };

  } catch (error) {
    console.error(`Error crawling ${source.name}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.(`[ERROR] Failed to crawl ${source.name}: ${errorMsg}`);
    return { source, jobs: [], fromCache: false, error: errorMsg };
  }
}

/**
 * Crawl all job sources in PARALLEL for faster performance
 */
export async function crawlJobSources(
  onProgress?: (message: string) => void,
  options?: {
    includeSources?: string[];
    keywords?: string[];
  }
): Promise<JobListing[]> {
  // Filter sources if specified
  let sourcesToCrawl = JOB_SOURCES;
  if (options?.includeSources) {
    sourcesToCrawl = JOB_SOURCES.filter(s =>
      options.includeSources!.some(inc => s.name.toLowerCase().includes(inc.toLowerCase()))
    );
  }

  onProgress?.(`[START] Crawling ${sourcesToCrawl.length} job sources in parallel...`);

  // Crawl ALL sources in parallel using Promise.allSettled
  const crawlPromises = sourcesToCrawl.map(source =>
    crawlSingleSource(source, options, onProgress)
  );

  const results = await Promise.allSettled(crawlPromises);

  // Collect all jobs from successful crawls
  const allJobs: JobListing[] = [];
  let successCount = 0;
  let cacheHits = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { jobs, fromCache, error } = result.value;
      if (!error) {
        successCount++;
        if (fromCache) cacheHits++;
      }
      allJobs.push(...jobs);
    }
  }

  onProgress?.(`[PARALLEL] Completed ${successCount}/${sourcesToCrawl.length} sources (${cacheHits} from cache)`);

  // Deduplicate jobs
  const uniqueJobs = deduplicateJobs(allJobs);
  onProgress?.(`[COMPLETE] Total unique jobs found: ${uniqueJobs.length} (from ${allJobs.length} raw)`);

  return uniqueJobs;
}

async function fetchFromApi(
  source: JobSource,
  options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<JobListing[]> {
  switch (source.name) {
    case 'Arbeitnow':
      return fetchArbeitnowJobs(source, options, onProgress);
    case 'We Work Remotely':
      return fetchWWRJobs(source, options, onProgress);
    case 'RemoteOK':
      return fetchRemoteOKJobs(source, options, onProgress);
    case 'GitHub Jobs (Himalayas)':
      return fetchHimalayasJobs(source, options, onProgress);
    default:
      return [];
  }
}

async function fetchRemoteOKJobs(
  source: JobSource,
  options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<JobListing[]> {
  try {
    const jobs: JobListing[] = [];

    onProgress?.(`[API] Fetching from RemoteOK...`);

    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobResearcherBot/1.0)',
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    // RemoteOK returns array, first item is metadata
    if (Array.isArray(data)) {
      for (const item of data.slice(1)) { // Skip first item (metadata)
        if (item.position && item.company) {
          const job: JobListing = {
            title: item.position,
            company: item.company,
            location: item.location || 'Remote',
            remote: true,
            url: item.url || `https://remoteok.com/l/${item.id}`,
            description: item.description?.substring(0, 500) || 'No description available',
            source: source.name,
          };

          // Filter by keywords if provided
          if (options?.keywords && options.keywords.length > 0) {
            const jobText = `${job.title} ${job.description}`.toLowerCase();
            const hasKeyword = options.keywords.some(kw => jobText.includes(kw.toLowerCase()));
            if (hasKeyword) {
              jobs.push(job);
            }
          } else {
            jobs.push(job);
          }
        }
      }
    }

    return jobs.slice(0, 30); // Limit results

  } catch (error) {
    console.error('Error fetching RemoteOK jobs:', error);
    onProgress?.(`[ERROR] Failed to fetch RemoteOK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

async function fetchHimalayasJobs(
  source: JobSource,
  options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<JobListing[]> {
  try {
    const jobs: JobListing[] = [];
    let url = source.url;

    // Add keyword filter if available
    if (options?.keywords && options.keywords.length > 0) {
      const keywordString = options.keywords[0]; // Use first keyword
      url = `${source.url}?q=${encodeURIComponent(keywordString)}`;
    }

    onProgress?.(`[API] Fetching from Himalayas...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobResearcherBot/1.0)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data.jobs)) {
      for (const item of data.jobs) {
        jobs.push({
          title: item.title,
          company: item.companyName || item.company?.name || 'Unknown Company',
          location: item.locationRestrictions?.join(', ') || 'Remote',
          remote: true,
          url: item.applicationLink || `https://himalayas.app/jobs/${item.slug}`,
          description: item.description?.substring(0, 500) || 'No description available',
          source: source.name,
        });
      }
    }

    return jobs.slice(0, 30);

  } catch (error) {
    console.error('Error fetching Himalayas jobs:', error);
    onProgress?.(`[ERROR] Failed to fetch Himalayas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

async function fetchWWRJobs(
  source: JobSource,
  _options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<JobListing[]> {
  try {
    const jobs: JobListing[] = [];
    const url = source.url;

    onProgress?.(`[API] Fetching from We Work Remotely...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobResearcherBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const xml = await response.text();

    // Simple Regex Parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const itemContent = itemMatch[1];

      const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const descriptionMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);

      let title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
      title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      const link = linkMatch ? linkMatch[1].trim() : '';
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      let company = 'We Work Remotely';
      if (title.includes(':')) {
        const parts = title.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      }

      if (title && link) {
        jobs.push({
          title,
          company,
          location: 'Remote',
          remote: true,
          url: link,
          description: description,
          source: source.name,
        });
      }
    }

    return jobs;

  } catch (error) {
    console.error('Error fetching WWR jobs:', error);
    onProgress?.(`[ERROR] Failed to fetch WWR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

async function fetchArbeitnowJobs(
  source: JobSource,
  options?: { keywords?: string[] },
  onProgress?: (message: string) => void
): Promise<JobListing[]> {
  try {
    const jobs: JobListing[] = [];
    let url = source.url;

    if (options?.keywords && options.keywords.length > 0) {
       const keywordString = options.keywords.join('%20');
       url = `${source.url}?search=${keywordString}`;
    }

    onProgress?.(`[API] Fetching from Arbeitnow...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data.data)) {
      for (const item of data.data) {
        jobs.push({
          title: item.title,
          company: item.company_name,
          location: item.location,
          remote: item.remote,
          url: item.url,
          description: item.description,
          source: source.name,
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error('Error fetching Arbeitnow jobs:', error);
    onProgress?.(`[ERROR] Failed to fetch Arbeitnow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

function deduplicateJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const unique: JobListing[] = [];

  for (const job of jobs) {
    const key = `${job.company.toLowerCase()}-${job.title.toLowerCase().replace(/\s+/g, '')}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(job);
    }
  }

  return unique;
}

function parseJobsFromCrawlResult(crawlResult: any, source: JobSource): JobListing[] {
  const jobs: JobListing[] = [];

  if (!crawlResult.data) {
    return jobs;
  }

  for (const page of crawlResult.data) {
    const content = page.markdown || page.html;
    if (!content) continue;

    const pageJobs = extractJobsFromHTML(content, page.metadata?.url || source.url, source);
    jobs.push(...pageJobs);
  }

  return jobs;
}

function extractJobsFromHTML(content: string, pageUrl: string, source: JobSource): JobListing[] {
  const jobs: JobListing[] = [];

  const isMarkdown = !content.includes('<html') && !content.includes('<!DOCTYPE');

  if (isMarkdown) {
    const lines = content.split('\n');
    let currentJob: Partial<JobListing> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const titleMatch = line.match(/^#{1,6}\s*(.+)$/) || line.match(/^\[([^\]]+)\]/);
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);

      if (titleMatch && isJobTitle(titleMatch[1])) {
        if (currentJob.title && currentJob.company) {
          jobs.push({
            title: currentJob.title,
            company: currentJob.company,
            url: currentJob.url || pageUrl,
            description: currentJob.description || 'No description available',
            source: source.name,
            remote: currentJob.remote,
            location: currentJob.location,
          });
        }

        let jobUrl = pageUrl;
        let jobTitle = titleMatch[1].trim();

        if (linkMatch) {
          jobTitle = linkMatch[1].trim();
          if (jobUrl.startsWith('/')) {
            try {
              const baseUrl = new URL(pageUrl);
              jobUrl = new URL(jobUrl, baseUrl).toString();
            } catch (e) {
              console.warn(`Could not resolve relative URL for ${jobUrl} with base ${pageUrl}:`, e);
              // Fallback to simple concatenation if URL is invalid, though this is less robust
              jobUrl = `${new URL(pageUrl).origin}${jobUrl}`;
            }
          }
        }

        currentJob = {
          title: jobTitle,
          url: jobUrl,
        };

        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('*')) {
            const company = nextLine.replace(/[\*_\[\]()]/g, '').trim();
            if (company.length > 1 && company.length < 50) {
              currentJob.company = company;
              break;
            }
          }
        }

        const descLines = lines.slice(i + 1, Math.min(i + 10, lines.length));
        currentJob.description = descLines
          .filter(l => l.trim() && !l.startsWith('#'))
          .join(' ')
          .replace(/[\*_\[\]]/g, '')
          .substring(0, 200);

        currentJob.remote = /remote|anywhere|distributed/i.test(content);
        currentJob.location = extractLocationFromText(content);
      }
    }

    if (currentJob.title && currentJob.company) {
      jobs.push({
        title: currentJob.title,
        company: currentJob.company,
        url: currentJob.url || pageUrl,
        description: currentJob.description || 'No description available',
        source: source.name,
        remote: currentJob.remote,
        location: currentJob.location,
      });
    }
  } else {
    const jobPatterns = [
      /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?<\/a>/gi,
      /<div[^>]*job[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?company[^>]*>([^<]+)<[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/article>/gi,
      /<div[^>]*role[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/div>/gi,
    ];

    for (const pattern of jobPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let title, company, jobUrl = pageUrl;

        if (match[1] && match[1].includes('/')) {
          jobUrl = match[1];
          title = match[2]?.trim();
          company = extractCompanyFromJobContent(content, title);

          if (jobUrl.startsWith('/')) {
            try {
              const baseUrl = new URL(pageUrl);
              jobUrl = new URL(jobUrl, baseUrl).toString();
            } catch (e) {
              console.warn(`Could not resolve relative URL for ${jobUrl} with base ${pageUrl}:`, e);
              // Fallback to simple concatenation if URL is invalid, though this is less robust
              jobUrl = `${new URL(pageUrl).origin}${jobUrl}`;
            }
          }
        } else {
          title = match[1]?.trim();
          company = match[2]?.trim();
        }

        if (title && title.length > 3 && isJobTitle(title)) {
          jobs.push({
            title,
            company: company || source.name,
            url: jobUrl,
            description: extractJobDescription(content, title),
            source: source.name,
            remote: /remote|anywhere|distributed/i.test(content),
            location: extractLocation(content),
          });
        }
      }
    }

    if (jobs.length === 0) {
      const titleMatches = content.match(/<h[1-6][^>]*>([^<]{10,100})<\/h[1-6]>/gi);
      if (titleMatches) {
        titleMatches.slice(0, 10).forEach((match) => {
          const title = match.replace(/<[^>]*>/g, '').trim();
          if (title && isJobTitle(title)) {
            jobs.push({
              title,
              company: source.name,
              url: pageUrl,
              description: `Job posting from ${source.name}`,
              source: source.name,
            });
          }
        });
      }
    }
  }

  return jobs.slice(0, 20);
}

function extractJobDescription(html: string, title: string): string {
  const titleIndex = html.toLowerCase().indexOf(title.toLowerCase());
  if (titleIndex === -1) return 'No description available';

  const surrounding = html.substring(titleIndex, titleIndex + 500);
  const cleanText = surrounding.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return cleanText.substring(0, 200) + (cleanText.length > 200 ? '...' : '');
}

function extractLocation(html: string): string | undefined {
  const locationPattern = /(?:location|based|office)[^>]*>([^<]+)</gi;
  const match = locationPattern.exec(html);
  return match?.[1]?.trim();
}

function extractLocationFromText(text: string): string | undefined {
  const locationPatterns = [
    /(?:location|based|office)[\s:]*([^\n\r\|]{1,50})/gi,
    /(?:remote|san francisco|new york|london|berlin|toronto|seattle|austin|boston|chicago|los angeles|miami|denver)/gi,
  ];

  for (const pattern of locationPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1]?.trim() || match[0]?.trim();
    }
  }

  return undefined;
}

function extractCompanyFromJobContent(content: string, jobTitle: string): string {
  const titleIndex = content.toLowerCase().indexOf(jobTitle.toLowerCase());
  if (titleIndex === -1) return 'Unknown Company';

  const surrounding = content.substring(
    Math.max(0, titleIndex - 200),
    titleIndex + jobTitle.length + 200
  );

  const companyPatterns = [
    /company:\s*([^\n\r]{1,50})/gi,
    /at\s+([A-Z][a-zA-Z\s&\.]{2,30})/g,
    /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:is|seeks|hiring)/g,
  ];

  for (const pattern of companyPatterns) {
    const match = pattern.exec(surrounding);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 40) {
        return company;
      }
    }
  }

  return 'Unknown Company';
}

function isJobTitle(text: string): boolean {
  const jobKeywords = [
    'engineer', 'developer', 'designer', 'manager', 'analyst', 'specialist',
    'consultant', 'architect', 'lead', 'senior', 'junior', 'intern',
    'frontend', 'backend', 'fullstack', 'devops', 'qa', 'data',
    'product', 'marketing', 'sales', 'support', 'operations'
  ];

  const lowerText = text.toLowerCase();
  return jobKeywords.some(keyword => lowerText.includes(keyword));
}
