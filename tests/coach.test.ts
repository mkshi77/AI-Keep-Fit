import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import coachHandler from '../api/coach';
import { buildCoachInstruction, coachModel, parseCoachResponse, validateCoachRequest } from '../server/coach';
import { createSessionCookie } from '../server/auth';
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
  return response as ApiResponse & { statusCode: number; body: unknown };
};

const request = (body: unknown, cookie?: string): ApiRequest => ({
  method: 'POST',
  body,
  headers: {
    origin: 'https://ai.example.com',
    host: 'ai.example.com',
    ...(cookie ? { cookie } : {}),
  },
});

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('APP_ACCESS_PASSWORD', 'test-password');
  vi.stubEnv('GEMINI_API_KEY', '');
});

afterEach(() => vi.unstubAllEnvs());

describe('AI Coach foundation', () => {
  it('uses the supported stable model by default and allows an explicit override', () => {
    expect(coachModel()).toBe('gemini-3.6-flash');
    vi.stubEnv('GEMINI_MODEL', 'gemini-custom');
    expect(coachModel()).toBe('gemini-custom');
  });

  it('normalizes and bounds request history and workout context', () => {
    const history = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: `message ${index}` }));
    const input = validateCoachRequest({
      message: '  下一组需要加重吗？ ',
      history,
      context: { exerciseId: 'row', exerciseName: '划船', completedSets: 2, plannedSets: 4, weight: 40, targetReps: '8-10' },
    });
    expect(input.message).toBe('下一组需要加重吗？');
    expect(input.history).toHaveLength(8);
    expect(input.history[0].text).toBe('message 4');
    expect(input.context).toMatchObject({ exerciseId: 'row', completedSets: 2, plannedSets: 4 });
    expect(() => validateCoachRequest({ message: 'x'.repeat(1001) })).toThrow('消息格式无效');
  });

  it('accepts only a structured, bounded coach response', () => {
    expect(parseCoachResponse(JSON.stringify({
      reply: '保持当前重量。',
      proposedFeedback: { exerciseId: 'row', exerciseName: '划船', bodyPart: '右肩', score: 4, note: '末端轻微不适' },
    }))).toMatchObject({ reply: '保持当前重量。', proposedFeedback: { score: 4, bodyPart: '右肩' } });
    expect(() => parseCoachResponse('not json')).toThrow('AI 返回格式无效');
    expect(() => parseCoachResponse(JSON.stringify({ reply: 'ok', proposedFeedback: { bodyPart: '肩', score: 11, note: 'x' } }))).toThrow('AI 不适评分格式无效');
  });

  it('builds the prompt from normalized records without legacy hardcoded workout facts', () => {
    const prompt = buildCoachInstruction(
      { exerciseId: 'row', exerciseName: '划船', completedSets: 2, plannedSets: 4 },
      [],
      [],
    );
    expect(prompt).toContain('"exerciseId":"row"');
    expect(prompt).not.toContain('史密斯平板卧推');
    expect(prompt).toContain('不得臆造');
  });

  it('enforces auth before invoking the model and reports missing configuration explicitly', async () => {
    const unauthenticated = makeResponse();
    await coachHandler(request({ message: 'test' }), unauthenticated);
    expect(unauthenticated.statusCode).toBe(401);

    const authenticated = makeResponse();
    await coachHandler(request({ message: 'test' }, createSessionCookie('test-password')), authenticated);
    expect(authenticated.statusCode).toBe(503);
    expect(authenticated.body).toEqual({ error: 'AI Coach 未配置' });
  });
});
