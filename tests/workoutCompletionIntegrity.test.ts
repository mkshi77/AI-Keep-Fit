import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionDataSource, NotionPage } from '../server/notion';

const notion = vi.hoisted(() => ({
  retrieveDataSource: vi.fn(),
  queryDataSource: vi.fn(),
  updatePageProperties: vi.fn(),
}));

vi.mock('../server/notion', async (importOriginal) => ({ ...await importOriginal(), ...notion }));

import { completeWorkoutInNotion, getTodayWorkoutFromNotion, validateCompletionPayload } from '../server/workout';
import { queryDataSource, retrieveDataSource, updatePageProperties } from '../server/notion';

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

const libraryPage = (id: string, exerciseId: string): NotionPage => ({
  id, properties: { 'Exercise ID': text(exerciseId), Name: text(exerciseId) },
});

const trainingPage = (id: string, exerciseId: string, overrides: Record<string, unknown> = {}): NotionPage => ({
  id,
  properties: {
    Date: date('2026-09-08'), Day: text('A'), 'Exercise ID': text(exerciseId),
    顺序: number(id === 'execution-1' ? 1 : 2), 'Plan Sets': number(3), 'Plan Reps': text('8-10'),
    'Plan Weight': number(42.5), Completed: checkbox(false),
    ...overrides,
  },
});

const sets = [
  { weight: '42.5', reps: '9', completed: true },
  { weight: '42.5', reps: '9', completed: false },
  { weight: '42.5', reps: '9', completed: false },
];

const partialPayload = {
  date: '2026-09-08', trainingDay: 'A' as const, submissionId: 'submission-1', durationMinutes: 45,
  exercises: [{
    exerciseId: 'bench-press', notionPageId: 'execution-1', name: '卧推', sets,
    feedback: { rir: 2, balanceDirection: 'left_weaker' as const, discomfort: 3, note: '左侧轻微吃力' },
  }],
};

const configure = (training: NotionPage[], schema: NotionDataSource = trainingSchema) => {
  notion.retrieveDataSource.mockImplementation(async (id: string) => id === 'training' ? schema : librarySchema);
  notion.queryDataSource.mockImplementation(async (id: string) => id === 'training' ? training : [
    libraryPage('library-1', 'bench-press'), libraryPage('library-2', 'row'),
  ]);
  notion.updatePageProperties.mockResolvedValue({});
};

beforeEach(() => {
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubEnv('NOTION_TRAINING_DATA_SOURCE_ID', 'training');
  vi.stubEnv('NOTION_EXERCISE_DATA_SOURCE_ID', 'exercise');
  vi.clearAllMocks();
  configure([trainingPage('execution-1', 'bench-press')]);
});

describe('workout submission integrity fixes', () => {
  it('writes only completed sets and preserves a partial result after re-reading Notion', async () => {
    const page = trainingPage('execution-1', 'bench-press');
    configure([page]);
    const result = await completeWorkoutInNotion(partialPayload);
    expect(result).toMatchObject({ updated: 1, workoutCompleted: false, exercises: [{ status: 'partial' }] });
    const setUpdate = vi.mocked(updatePageProperties).mock.calls
      .map(([, , properties]) => properties as Record<string, unknown>)
      .find((properties) => properties['第1组重量kg']);
    expect(setUpdate).toMatchObject({
      '第1组重量kg': { number: 42.5 }, '第1组次数': { number: 9 },
      '第2组重量kg': { number: null }, '第2组次数': { number: null },
      '第3组重量kg': { number: null }, '第3组次数': { number: null },
    });
    Object.assign(page.properties, Object.fromEntries(Object.entries(setUpdate).map(([name, value]) => [name, { type: trainingSchema.properties[name]?.type, ...(value as object) }])));
    configure([page]);
    const latest = await getTodayWorkoutFromNotion('2026-09-08');
    expect(latest.exercises[0].savedSets).toEqual([
      { weight: '42.5', reps: '9', completed: true },
      { weight: '', reps: '', completed: false },
      { weight: '', reps: '', completed: false },
    ]);
    expect(latest.exercises[0].completed).toBe(false);
  });

  it('rejects completed sets without valid weight and positive integer reps', () => {
    const emptySet = [{ weight: '', reps: '', completed: true }];
    expect(() => validateCompletionPayload({
      ...partialPayload, exercises: [{ ...partialPayload.exercises[0], sets: emptySet }],
    })).toThrow('完成组必须包含有效重量');
    expect(() => validateCompletionPayload({
      ...partialPayload,
      exercises: [{ ...partialPayload.exercises[0], sets: [{ weight: '0', reps: '1.5', completed: true }] }],
    })).toThrow('完成组必须包含有效次数');
    expect(validateCompletionPayload({
      ...partialPayload,
      exercises: [{ ...partialPayload.exercises[0], sets: [{ weight: '0', reps: '1', completed: true }] }],
    })).toMatchObject({ exercises: [{ sets: [{ weight: '0', reps: '1', completed: true }] }] });
  });

  it('requires the Submission ID property to be Rich Text before any write-back', async () => {
    const invalidTypes = [
      undefined,
      number(1),
      checkbox(false),
    ];
    for (const property of invalidTypes) {
      const schema: NotionDataSource = { properties: { ...trainingSchema.properties } };
      if (property) schema.properties['Submission ID'] = property;
      else delete schema.properties['Submission ID'];
      vi.clearAllMocks();
      configure([trainingPage('execution-1', 'bench-press')], schema);
      await expect(completeWorkoutInNotion(partialPayload))
        .rejects.toThrow('Training Execution 属性 Submission ID 必须为 Rich Text');
      expect(updatePageProperties).not.toHaveBeenCalled();
    }

    vi.clearAllMocks();
    configure([trainingPage('execution-1', 'bench-press')]);
    await expect(completeWorkoutInNotion(partialPayload)).resolves.toMatchObject({ updated: 1 });
    expect(updatePageProperties).toHaveBeenCalled();
  });

  it('counts prior same-submission completed pages in a mixed retry', async () => {
    const first = trainingPage('execution-1', 'bench-press', {
      Completed: checkbox(true), 'Submission ID': text('submission-1'),
    });
    const second = trainingPage('execution-2', 'row', {
      'Submission ID': text('submission-1'),
    });
    configure([first, second]);
    const mixedPayload = {
      ...partialPayload,
      exercises: [
        partialPayload.exercises[0],
        {
          exerciseId: 'row', notionPageId: 'execution-2', name: 'row',
          sets: [
            { weight: '40', reps: '10', completed: true },
            { weight: '40', reps: '10', completed: true },
            { weight: '40', reps: '10', completed: true },
          ],
          feedback: { rir: 3, discomfort: 2 },
        },
      ],
    };
    const result = await completeWorkoutInNotion(mixedPayload);
    expect(result).toMatchObject({ updated: 1, workoutCompleted: true });
    expect(vi.mocked(updatePageProperties).mock.calls.map(([pageId]) => pageId))
      .toEqual(['execution-2', 'execution-2']);
  });
});
