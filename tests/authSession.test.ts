import { beforeEach, describe, expect, it, vi } from 'vitest';
import sessionHandler from '../api/auth/session';
import { createSessionCookie, SESSION_COOKIE_NAME } from '../server/auth';
import type { ApiRequest, ApiResponse } from '../server/http';

const makeResponse = () => {
  const response = {
    headers: [] as Array<[string, string]>,
    statusCode: 0,
    body: undefined as unknown,
    setHeader(name: string, value: string) { this.headers.push([name, value]); },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response as ApiResponse & { headers: Array<[string, string]>; statusCode: number; body: unknown };
};

const request = (method: string, headers: Record<string, string>, body?: unknown): ApiRequest => ({
  method, headers, body,
});

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('APP_ACCESS_PASSWORD', 'test-password');
});

describe('production auth session', () => {
  it('allows a same-origin GET session check without an Origin header', async () => {
    const response = makeResponse();
    await sessionHandler(request('GET', { cookie: createSessionCookie('test-password') }), response);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ authenticated: true });
  });

  it('still requires a valid same-origin header for POST and DELETE', async () => {
    const cookie = createSessionCookie('test-password');
    const post = makeResponse();
    await sessionHandler(request('POST', { cookie }), post);
    expect(post.statusCode).toBe(403);

    const del = makeResponse();
    await sessionHandler(request('DELETE', { cookie }), del);
    expect(del.statusCode).toBe(403);

    const origin = { origin: 'https://ai.example.com', host: 'ai.example.com' };
    const allowedPost = makeResponse();
    await sessionHandler(request('POST', { ...origin, cookie }, { password: 'test-password' }), allowedPost);
    expect(allowedPost.statusCode).toBe(200);
    expect(allowedPost.body).toEqual({ authenticated: true });
    expect(allowedPost.headers.some(([name]) => name === 'Set-Cookie')).toBe(true);

    const allowedDelete = makeResponse();
    await sessionHandler(request('DELETE', { ...origin, cookie }), allowedDelete);
    expect(allowedDelete.statusCode).toBe(200);
    expect(allowedDelete.body).toEqual({ authenticated: false });
    expect(allowedDelete.headers.some(([name]) => name === 'Set-Cookie')).toBe(true);
    expect(allowedDelete.headers.find(([name]) => name === 'Set-Cookie')?.[1]).toContain(`${SESSION_COOKIE_NAME}=;`);
  });
});
