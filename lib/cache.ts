interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();
const MAX_CACHE_SIZE = 50; // Limit to 50 active search results to save memory (VPS constraint)

export function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  // LRU behavior: refresh position
  cache.delete(key);
  cache.set(key, entry);

  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T, ttlSeconds: number): void {
  // Evict oldest if full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { data, expiry });
}

export function generateCacheKey(source: string, params: Record<string, any>): string {
  const paramString = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
  return `${source}|${paramString}`;
}
