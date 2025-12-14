# Performance Analysis: LinkedIn Analysis Flow

## Overview
Analysis of the LinkedIn-enhanced job matching flow reveals several performance bottlenecks causing execution times of up to 5 minutes. This document outlines the current flow, identifies bottlenecks, and provides optimization recommendations.

---

## Current Flow Architecture

### LinkedIn Analysis Route (`app/api/analyze/linkedin/route.ts`)

**Sequential Steps:**
1. ✅ **PDF Text Extraction** (~1-2 seconds)
   - Fast, not a bottleneck

2. 🐌 **LinkedIn Profile Scraping** (~10-30 seconds)
   - Uses Hyperbrowser API
   - Network latency + browser automation overhead

3. ⚡ **Build Enhanced Profile** (~5-10 seconds)
   - Single AI API call
   - Reasonable performance

4. 🐌 **Crawl LinkedIn Jobs** (~30-60 seconds)
   - Hyperbrowser scrape operation
   - Single page scrape

5. 🐌 **Crawl Other Job Sources** (~60-120 seconds)
   - Work at a Startup: up to 10 pages
   - **DUPLICATE:** LinkedIn crawl (up to 5 pages) - ALREADY DONE IN STEP 4
   - Sequential processing (not parallelized)

6. 🐌 **LLM Job Matching** (~30-90 seconds)
   - Batches of 20 jobs per AI call
   - If 100 jobs found: 5 sequential AI calls
   - Each call takes 6-18 seconds

**Total Estimated Time: 135-312 seconds (2.25 - 5.2 minutes)**

---

## Key Performance Bottlenecks

### 🔴 Critical Bottlenecks

1. **Duplicate LinkedIn Crawling**
   - LinkedIn is crawled TWICE:
     - Once in `crawlLinkedInJobs()` (Step 4)
     - Again in `crawlJobSources()` (Step 5)
   - **Impact:** 30-60 seconds wasted
   - **Fix:** Remove LinkedIn from `JOB_SOURCES` array or skip if already crawled

2. **Sequential Job Source Crawling**
   ```typescript
   // Current: Sequential
   for (const source of sourcesToCrawl) {
     const jobs = await crawlSource(source); // Blocks
   }
   ```
   - **Impact:** 60-120 seconds total (additive)
   - **Fix:** Parallelize with `Promise.all()`

3. **Sequential LLM Batch Processing**
   ```typescript
   // Current: Sequential
   for (let i = 0; i < jobs.length; i += batchSize) {
     const matches = await processBatch(batch); // Blocks
   }
   ```
   - **Impact:** 30-90 seconds (5 batches × 6-18 sec each)
   - **Fix:** Parallelize batch processing

### 🟡 Moderate Bottlenecks

4. **Excessive Crawl Depth**
   - Work at a Startup: `maxPages: 10`
   - LinkedIn (duplicate): `maxPages: 5`
   - **Impact:** Each additional page adds ~6-12 seconds
   - **Fix:** Reduce to 3-5 pages max

5. **No Caching**
   - Job listings change slowly (hourly/daily)
   - Same searches executed repeatedly
   - **Impact:** Full re-crawl every time
   - **Fix:** Implement short-term cache (5-15 minutes)

---

## Optimization Recommendations

### Priority 1: Quick Wins (30-40% improvement)

#### 1.1 Remove Duplicate LinkedIn Crawling
```typescript
// In lib/jobs.ts - line 21
const JOB_SOURCES: JobSource[] = [
  {
    name: 'Work at a Startup',
    url: 'https://www.workatastartup.com/jobs',
    depth: 2,
  },
  // REMOVE THIS - already crawled separately
  // {
  //   name: 'LinkedIn Jobs',
  //   url: 'https://www.linkedin.com/jobs/...',
  //   depth: 1,
  // },
];
```
**Expected Savings:** 30-60 seconds

#### 1.2 Parallelize Job Source Crawling
```typescript
// In lib/jobs.ts - crawlJobSources function
export async function crawlJobSources(...) {
  // Change from sequential to parallel
  const crawlPromises = sourcesToCrawl.map(source => 
    crawlSingleSource(source, onProgress)
  );
  
  const results = await Promise.allSettled(crawlPromises);
  const allJobs = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
    
  return deduplicateJobs(allJobs);
}
```
**Expected Savings:** 30-60 seconds (sources run in parallel vs sequential)

### Priority 2: Moderate Impact (20-30% improvement)

#### 2.1 Parallelize LLM Batch Processing
```typescript
// In lib/match.ts - llmMatch function
export async function llmMatch(...) {
  // Process batches in parallel (limit concurrency to avoid rate limits)
  const batchPromises = [];
  for (let i = 0; i < preFilteredJobs.length; i += batchSize) {
    const batch = preFilteredJobs.slice(i, i + batchSize);
    batchPromises.push(processBatch(candidate, batch));
  }
  
  // Process 2-3 batches at a time (rate limit friendly)
  const allMatches = [];
  for (let i = 0; i < batchPromises.length; i += 2) {
    const chunk = await Promise.allSettled(
      batchPromises.slice(i, i + 2)
    );
    allMatches.push(...chunk.filter(r => r.status === 'fulfilled').flatMap(r => r.value));
  }
  
  return allMatches.sort((a, b) => b.score - a.score).slice(0, 50);
}
```
**Expected Savings:** 15-30 seconds

#### 2.2 Reduce Crawl Depth
```typescript
// In lib/jobs.ts
const result = await client.crawl.startAndWait({
  url: searchUrl,
  maxPages: source.name === 'LinkedIn Jobs' ? 3 : 5, // Reduced from 5:10
  scrapeOptions: {
    formats: ['markdown', 'html'],
  },
});
```
**Expected Savings:** 20-40 seconds

### Priority 3: Long-term Optimizations (40%+ improvement)

#### 3.1 Implement Job Caching
```typescript
// New file: lib/job-cache.ts
import NodeCache from 'node-cache';

const jobCache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

export function getCachedJobs(keywords: string[]): JobListing[] | null {
  const cacheKey = keywords.sort().join('-');
  return jobCache.get(cacheKey) || null;
}

export function cacheJobs(keywords: string[], jobs: JobListing[]): void {
  const cacheKey = keywords.sort().join('-');
  jobCache.set(cacheKey, jobs);
}
```
**Expected Savings:** 120-180 seconds on cache hits

#### 3.2 Implement Streaming Responses
```typescript
// Return early matches while processing continues
export async function streamMatches(...) {
  // Send top matches immediately after first batch
  // Continue processing remaining batches in background
}
```
**Expected Savings:** Perceived latency reduction of 50-70%

---

## Recommended Implementation Order

### Phase 1: Immediate (This Sprint)
1. ✅ Remove duplicate LinkedIn crawling from `JOB_SOURCES`
2. ✅ Parallelize job source crawling
3. ✅ Reduce max pages to 3-5

**Expected Total Time After Phase 1:** 75-150 seconds (1.25 - 2.5 minutes)

### Phase 2: Next Sprint
4. ✅ Parallelize LLM batch processing (with rate limit handling)
5. ✅ Implement basic job caching (10-15 minute TTL)

**Expected Total Time After Phase 2:** 30-90 seconds on cache miss, <5 seconds on cache hit

### Phase 3: Future
6. ⭐ Implement streaming/progressive results
7. ⭐ Background job refresh
8. ⭐ Dedicated job database

---

## Testing Recommendations

### Performance Testing
```typescript
// tests/performance/linkedin-flow-perf.test.ts
test('LinkedIn analysis completes within 90 seconds', async () => {
  const startTime = Date.now();
  const result = await analyzeLinkedInProfile(testFile, testUrl);
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(90000); // 90 seconds
  expect(result.matches.length).toBeGreaterThan(0);
});
```

### Load Testing
- Test with varying job counts (10, 50, 100+ jobs)
- Test with multiple concurrent requests
- Monitor Hyperbrowser and OpenAI rate limits

---

## Monitoring Recommendations

Add timing logs to track each step:

```typescript
console.time('linkedin-scrape');
const linkedInData = await scrapeLinkedInProfile(linkedInUrl);
console.timeEnd('linkedin-scrape');

console.time('job-crawl');
const allJobs = await Promise.all([
  crawlLinkedInJobs(...),
  crawlJobSources(...)
]);
console.timeEnd('job-crawl');

console.time('llm-matching');
const matches = await llmMatch(...);
console.timeEnd('llm-matching');
```

---

## Summary

**Current Performance:** 2.25 - 5.2 minutes  
**After Phase 1:** 1.25 - 2.5 minutes (50% improvement)  
**After Phase 2:** 0.5 - 1.5 minutes (70% improvement)  
**After Phase 3:** <30 seconds perceived (streaming)

**Key Actions:**
1. Remove duplicate LinkedIn crawling ⚡ IMMEDIATE IMPACT
2. Parallelize job crawling ⚡ IMMEDIATE IMPACT
3. Parallelize LLM batches 🔧 MODERATE EFFORT
4. Reduce crawl depth 🔧 MODERATE EFFORT
5. Implement caching 📅 PLAN FOR NEXT SPRINT
