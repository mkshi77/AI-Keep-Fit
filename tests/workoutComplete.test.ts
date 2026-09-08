import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionDataSource, NotionPage } from '../server/notion';

const notion = vi.hoisted(() => ({
  retrieveDataSource: vi.fn(),
  queryDataSource: vi.fn(),
  updatePageProperties: vi.fn(),
}));

vi.mock('../server/notion', async (importOriginal) => ({ ...await importOriginal(), ...notion }));

import { completeWorkoutInNotion, exerciseCompletionStatus, validateCompletionPayload } from '../server/workout';
import { retrieveDataSource, updatePageProperties, queryDataSource } from '../server/notion';

const text = (value: string) => ({ type: 'rich_text', rich_text: [{ plain_text: value }] });
const date = (value: string) => ({ type: 'date', date: { start: value } });
const number = (value: number) => ({ type: 'number', number: value });
const checkbox = (value: boolean) => ({ type: 'checkbox', checkbox: value });

const trainingSchema: NotionDataSource = { properties: {
  日期: { type: 'date' }, 'Exercise ID': { type: 'rich_text' }, 顺序: { type: 'number' },
  '第1组重量kg': { type: 'number' }, '第1组次数': { type: 'number' },
  '第2组重量kg': { type: 'number' }, '第2组次数': { type: 'number' },
  '第3组重量kg': { type: 'number' }, '第3组次数': { type: 'number' },
  '第4组重量kg': { type: 'number' }, '第4组次数': { type: 'number' },
  末组RIR: { type: 'number' }, 左右差异: { type: 'number' }, '不适0-10': { type: 'number' },
  左右差异方向: { type: 'select' }, 动作反馈备注: { type: 'rich_text' },
  完成: { type: 'checkbox' }, 'Submission ID': { type: 'rich_text' },
} };

const librarySchema: NotionDataSource = { properties: { 'Exercise ID': { type: 'rich_text' } } };

const libraryPage: NotionPage = { id: 'library-1', properties: {
  'Exercise ID': text('bench-press'), Name: text('卧推'),
} };

const trainingPage = (overrides: Record<string, unknown> = {}): NotionPage => ({
  id: 'execution-1',
  properties: {
    Date: date('2026-09-08'), Day: text('A'), 'Exercise ID': text('bench-press'),
    Order: number(1), 'Plan Sets': number(3), 'Plan Reps': text('8-10'), 'Plan Weight': number(40),
    Completed: checkbox(false),
    ...overrides,
  },
});

const payload = {
  date: '2026-09-08', trainingDay: 'A' as const, submissionId: 'submission-1', durationMinutes: 45,
  exercises: [{
    exerciseId: 'bench-press', notionPageId: 'execution-1', name: '卧推',
    sets: [
      { weight: '42.5', reps: '9', completed: true },
      { weight: '42.5', reps: '9', completed: true },
      { weight: '42.5', reps: '9', completed: true },
      { weight: '', reps: '', completed: false },
    ],
    feedback: {
      rir: 2, balanceDirection: 'left_weaker' as const, discomfort: 3, note: '左侧轻微吃力',
    },
  }],
};

const configureHappyPath = (page: NotionPage = trainingPage()) => {
  notion.retrieveDataSource.mockImplementation(async (id: string) => id === 'training' ? trainingSchema : librarySchema);
  notion.queryDataSource.mockImplementation(async (id: string) => id === 'training' ? [page] : [libraryPage]);
  notion.updatePageProperties.mockResolvedValue({});
};

beforeEach(() => {
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubEnv('NOTION_TRAINING_DATA_SOURCE_ID', 'training');
  vi.stubEnv('NOTION_EXERCISE_DATA_SOURCE_ID', 'exercise');
  vi.clearAllMocks();
  configureHappyPath();
});

describe('workout completion validation', () => {
  it('returns a valid normalized payload', () => {
    expect(validateCompletionPayload(payload)).toEqual(payload);
  });

  it('requires an ID, a valid direction, and unique pages', () => {
    expect(() => validateCompletionPayload({ ...payload, submissionId: '' })).toThrow('提交 ID 无效');
    expect(() => validateCompletionPayload({
      ...payload, exercises: [{ ...payload.exercises[0], feedback: { balanceDirection: 'invalid' as never } }],
    })).toThrow('左右差异方向无效');
    expect(() => validateCompletionPayload({
      ...payload, exercises: [payload.exercises[0], payload.exercises[0]],
    })).toThrow('动作提交数据重复');
  });
});

describe('exercise completion status', () => {
  it('distinguishes skipped, partial, and completed against the official set count', () => {
    const sets = [
      { weight: '40', reps: '8', completed: false },
      { weight: '40', reps: '8', completed: true },
      { weight: '40', reps: '8', completed: true },
    ];
    expect(exerciseCompletionStatus([{ weight: '40', reps: '8', completed: true }], 1)).toBe('completed');
    expect(exerciseCompletionStatus(sets, 3)).toBe('partial');
    expect(exerciseCompletionStatus(sets.filter((set) => !set.completed), 3)).toBe('skipped');
  });
});

describe('Notion workout write-back', () => {
  it('writes sets and feedback first, then the completion flag and submission ID', async () => {
    const result = await completeWorkoutInNotion(payload);
    expect(result).toMatchObject({
      success: true, updated: 1, submissionId: 'submission-1', workoutCompleted: true,
      exercises: [{ exerciseId: 'bench-press', notionPageId: 'execution-1', status: 'completed' }],
    });
    const updates = vi.mocked(updatePageProperties).mock.calls.map(([, , properties]) => properties) as Record<string, unknown>[];
    const setUpdate = updates.find((properties) => properties['第1组重量kg']);
    const statusUpdate = updates.find((properties) => properties['完成']);
    expect(setUpdate).toMatchObject({
      '第1组重量kg': { number: 42.5 }, '第1组次数': { number: 9 },
      '第2组重量kg': { number: 42.5 }, '第2组次数': { number: 9 },
      '第3组重量kg': { number: 42.5 }, '第3组次数': { number: 9 },
      末组RIR: { number: 2 }, '不适0-10': { number: 3 },
      左右差异方向: { select: { name: '左侧吃力' } },
      动作反馈备注: { rich_text: [{ text: { content: '左侧轻微吃力' } }] },
    });
    expect(setUpdate?.['左右差异']).toEqual({ number: null });
    expect(statusUpdate).toMatchObject({ 完成: { checkbox: true }, 'Submission ID': { rich_text: [{ text: { content: 'submission-1' } }] } });
  });

  it('marks partial work without the completed checkbox', async () => {
    const partialPayload = {
      ...payload,
      exercises: [{ ...payload.exercises[0], sets: payload.exercises[0].sets.slice(0, 1) }],
    };
    const result = await completeWorkoutInNotion(partialPayload);
    expect(result).toMatchObject({ updated: 1, workoutCompleted: false, exercises: [{ status: 'partial' }] });
    const updates = vi.mocked(updatePageProperties).mock.calls.map(([, , properties]) => properties) as Record<string, unknown>[];
    expect(updates.find((properties) => properties['完成'])).toMatchObject({ 完成: { checkbox: false } });
  });

  it('does not rewrite an already completed same-submission page', async () => {
    configureHappyPath(trainingPage({ Completed: checkbox(true), 'Submission ID': text('submission-1') }));
    const result = await completeWorkoutInNotion(payload);
    expect(result).toMatchObject({ updated: 0, submissionId: 'submission-1', workoutCompleted: true, exercises: [] });
    expect(updatePageProperties).not.toHaveBeenCalled();
  });

  it('retries the same submission ID when the prior completion flag failed', async () => {
    configureHappyPath(trainingPage({ 'Submission ID': text('submission-1') }));
    const result = await completeWorkoutInNotion(payload);
    expect(result).toMatchObject({ updated: 1, workoutCompleted: true });
    const updates = vi.mocked(updatePageProperties).mock.calls.map(([, , properties]) => properties) as Record<string, unknown>[];
    expect(updates.find((properties) => properties['完成'])).toMatchObject({ 完成: { checkbox: true } });
  });
  it('rejects a page outside today’s valid plan', async () => {
    await expect(completeWorkoutInNotion({
      ...payload, exercises: [{ ...payload.exercises[0], notionPageId: 'wrong-page' }],
    })).rejects.toThrow('动作 bench-press 不属于今日有效计划');
    expect(updatePageProperties).not.toHaveBeenCalled();
  });

  it('reports optional Notion schema gaps instead of silently dropping feedback', async () => {
    configureHappyPath();
    notion.retrieveDataSource.mockImplementation(async (id: string) => id === 'training' ? {
      properties: Object.fromEntries(Object.entries(trainingSchema.properties).filter(([name]) => !['左右差异方向', '动作反馈备注'].includes(name))),
    } : librarySchema);
    await expect(completeWorkoutInNotion(payload)).rejects.toThrow('缺少属性: 左右差异方向, 动作反馈备注');
    expect(updatePageProperties).not.toHaveBeenCalled();
  });
});
