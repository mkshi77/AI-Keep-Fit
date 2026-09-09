import { afterEach, describe, expect, it, vi } from 'vitest';
import bodyFeedbackHandler from '../api/records/body-feedback';
import type { NotionPage } from '../server/notion';
import type { ApiRequest, ApiResponse } from '../server/http';

const notion = vi.hoisted(() => ({
  retrieveDataSource: vi.fn(),
  createDataSourcePage: vi.fn(),
}));

vi.mock('../server/notion', async (importOriginal) => ({
  ...await importOriginal<typeof import('../server/notion')>(),
  ...notion,
}));

import { saveBodyFeedback, validateBodyFeedbackInput } from '../server/bodyFeedback';

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

const schema = { properties: {
  Name: { type: 'title' }, 日期: { type: 'date' }, 'Exercise ID': { type: 'rich_text' },
  动作名称: { type: 'rich_text' }, 部位: { type: 'rich_text' }, 描述: { type: 'rich_text' },
  评分: { type: 'number' }, 类型: { type: 'select' }, AI结构化总结: { type: 'rich_text' },
} };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('body feedback persistence', () => {
  it('does not expose body feedback history without an authenticated session', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('APP_ACCESS_PASSWORD', 'test-password');
    const response = makeResponse();
    await bodyFeedbackHandler({ method: 'GET', headers: {} } as ApiRequest, response);
    expect(response.statusCode).toBe(401);
  });

  it('validates feedback with and without a formal exercise ID', () => {
    expect(validateBodyFeedbackInput({ date: '2026-09-09', bodyPart: '全身', description: '恢复良好', score: 1 }).exerciseId).toBeUndefined();
    expect(validateBodyFeedbackInput({ date: '2026-09-09', exerciseId: 'row', bodyPart: '右肩', description: '轻微紧张', score: 4 })).toMatchObject({ exerciseId: 'row', score: 4 });
    expect(() => validateBodyFeedbackInput({ date: '2026-09-09', bodyPart: '肩', description: '痛', score: 12 })).toThrow('0-10');
  });

  it('writes a normalized feedback record to the dedicated source', async () => {
    vi.stubEnv('NOTION_TOKEN', 'token');
    vi.stubEnv('NOTION_BODY_FEEDBACK_DATA_SOURCE_ID', 'feedback');
    notion.retrieveDataSource.mockResolvedValue(schema);
    notion.createDataSourcePage.mockResolvedValue({ id: 'feedback-1', properties: {} } satisfies NotionPage);
    const page: NotionPage = { id: 'feedback-1', properties: {} };
    notion.createDataSourcePage.mockResolvedValue(page);
    const saved = await saveBodyFeedback({
      date: '2026-09-09', exerciseId: 'row', exerciseName: '划船', bodyPart: '右肩', description: '末端轻微不适', score: 4, type: 'AI Coach',
    });
    expect(saved).toMatchObject({ id: 'feedback-1', exerciseId: 'row', bodyPart: '右肩', score: 4 });
    expect(notion.createDataSourcePage).toHaveBeenCalledOnce();
    expect(notion.createDataSourcePage.mock.calls[0][2]).toMatchObject({
      'Exercise ID': { rich_text: [{ text: { content: 'row' } }] },
      评分: { number: 4 },
    });
  });
});
