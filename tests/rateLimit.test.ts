import { beforeEach, describe, expect, it } from 'vitest';
import { consumeRateLimit, resetRateLimits } from '../server/rateLimit';
import type { ApiRequest } from '../server/http';

beforeEach(resetRateLimits);

describe('AI request rate limits', () => {
  it('bounds requests per hashed client and scope', () => {
    const request = { headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' } } satisfies ApiRequest;
    expect(consumeRateLimit(request, 'coach', 2, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(request, 'coach', 2, 1_001).allowed).toBe(true);
    const rejected = consumeRateLimit(request, 'coach', 2, 1_002);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBe(60);
    expect(consumeRateLimit(request, 'review', 1, 1_002).allowed).toBe(true);
  });

  it('starts a fresh bucket after the window expires', () => {
    const request = { headers: {} } satisfies ApiRequest;
    expect(consumeRateLimit(request, 'coach', 1, 0).allowed).toBe(true);
    expect(consumeRateLimit(request, 'coach', 1, 60_000).allowed).toBe(true);
  });
});
