import { createHash } from 'node:crypto';
import type { ApiRequest } from './http.js';

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 1_000;

const header = (request: ApiRequest, name: string) => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const clientKey = (request: ApiRequest, scope: string) => {
  const forwarded = header(request, 'x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || header(request, 'x-real-ip') || 'unknown';
  return `${scope}:${createHash('sha256').update(address).digest('hex').slice(0, 24)}`;
};

export const consumeRateLimit = (
  request: ApiRequest,
  scope: string,
  limit: number,
  now = Date.now(),
) => {
  if (buckets.size >= MAX_BUCKETS) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }
  const key = clientKey(request, scope);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
};

export const resetRateLimits = () => buckets.clear();
