import fs from 'fs';
import path from 'path';

const RATE_LIMIT_FILE = path.join(process.cwd(), '.rate-limits.json');

interface RateLimitData {
  [source: string]: {
    count: number;
    date: string; // YYYY-MM-DD
  };
}

// Limits per day
const DAILY_LIMITS: Record<string, number> = {
  'LinkedIn Jobs': 20, // Conservative daily limit for scraping
  'Indeed': 30, // Indeed may block frequent requests
  'Google Jobs': 25, // Google has bot detection
  'default': 100
};

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadRateLimits(): RateLimitData {
  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      const data = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading rate limits:', error);
  }
  return {};
}

function saveRateLimits(data: RateLimitData): void {
  try {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving rate limits:', error);
  }
}

export function checkRateLimit(source: string): { allowed: boolean; remaining: number } {
  const data = loadRateLimits();
  const today = getTodayString();
  const limit = DAILY_LIMITS[source] || DAILY_LIMITS['default'];

  if (!data[source] || data[source].date !== today) {
    // Reset or initialize
    return { allowed: true, remaining: limit };
  }

  const used = data[source].count;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

export function incrementRateLimit(source: string): void {
  const data = loadRateLimits();
  const today = getTodayString();

  if (!data[source] || data[source].date !== today) {
    data[source] = { count: 1, date: today };
  } else {
    data[source].count++;
  }

  saveRateLimits(data);
}

export function getRateLimitStats(): RateLimitData {
  return loadRateLimits();
}
