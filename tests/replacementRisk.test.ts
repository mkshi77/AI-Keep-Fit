import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodayExercise } from '../src/domain/exercise';
import type { ReplacementOption } from '../src/domain/replacementRisk';
import type { NotionDataSource, NotionPage } from '../server/notion';
import type { ApiRequest, ApiResponse } from '../server/http';

const notion = vi.hoisted(() => ({
  retrieveDataSource: vi.fn(),
  queryDataSource: vi.fn(),
  updatePageProperties: vi.fn(),
}));

vi.mock('../server/notion', async (importOriginal) => ({
  ...await importOriginal<typeof import('../server/notion')>(),
  ...notion,
}));

import {
  deriveReplacementOptions,
  deriveRiskAssessment,
  replaceTodayExercise,
  validateWorkoutReplacement,
} from '../server/replacementRisk';
import safetyHandler from '../api/workout/safety';
import replaceHandler from '../api/workout/replace';

const title = (value: string) => ({ type: 'title', title: [{ plain_text: value }] });
const text = (value: string) => ({ type: 'rich_text', rich_text: [{ plain_text: value }] });
const date = (value: string) => ({ type: 'date', date: { start: value } });
const number = (value: number) => ({ type: 'number', number: value });
const checkbox = (value: boolean) => ({ type: 'checkbox', checkbox: value });

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

const exercise = (exerciseId: string, targetMuscle = '胸大肌'): TodayExercise => ({
  exerciseId,
  notionPageId: `training-${exerciseId}`,
  name: exerciseId,
  targetMuscle,
  planSets: 4,
  planReps: '8-10',
});

const option = (exerciseId: string, targetMuscle = '胸大肌'): ReplacementOption => ({
  exerciseId,
  name: exerciseId,
  targetMuscle,
  planSets: 4,
  planReps: '8-10',
  reason: 'same_target_muscle',
});

const librarySchema: NotionDataSource = { properties: {
  'Exercise ID': { type: 'rich_text' }, Name: { type: 'title' }, 'Target Muscle': { type: 'rich_text' },
  Enabled: { type: 'checkbox' }, 'Plan Sets': { type: 'number' }, 'Plan Reps': { type: 'rich_text' },
  'Plan Weight': { type: 'number' },
} };

const trainingSchema: NotionDataSource = { properties: {
  Date: { type: 'date' }, 'Exercise ID': { type: 'rich_text' }, Name: { type: 'title' },
  'Target Muscle': { type: 'rich_text' }, Order: { type: 'number' }, 'Plan Sets': { type: 'number' },
  'Plan Reps': { type: 'rich_text' }, 'Plan Weight': { type: 'number' }, Completed: { type: 'checkbox' },
} };

const libraryPage = (exerciseId: string, name: string, targetMuscle = '胸大肌'): NotionPage => ({
  id: `library-${exerciseId}`,
  properties: {
    'Exercise ID': text(exerciseId), Name: title(name), 'Target Muscle': text(targetMuscle), Enabled: checkbox(true),
    'Plan Sets': number(4), 'Plan Reps': text('8-10'), 'Plan Weight': number(40),
  },
});

beforeEach(() => {
  vi.stubEnv('NOTION_TOKEN', 'token');
  vi.stubEnv('NOTION_EXERCISE_DATA_SOURCE_ID', 'library');
  vi.stubEnv('NOTION_TRAINING_DATA_SOURCE_ID', 'training');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('APP_ACCESS_PASSWORD', 'test-password');
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllEnvs());

describe('replacement and risk engine', () => {
  it('protects safety reads and rejects cross-origin replacement writes', async () => {
    const safetyResponse = makeResponse();
    await safetyHandler({ method: 'GET', headers: {} } as ApiRequest, safetyResponse);
    expect(safetyResponse.statusCode).toBe(401);

    const replaceResponse = makeResponse();
    await replaceHandler({
      method: 'POST',
      headers: { origin: 'https://evil.example', host: 'app.example' },
      body: { date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'press' },
    } as ApiRequest, replaceResponse);
    expect(replaceResponse.statusCode).toBe(403);
  });

  it('returns only enabled same-muscle candidates and preserves formal exercise IDs', () => {
    const replacements = deriveReplacementOptions(
      [exercise('bench')],
      [option('bench'), option('machine-press'), option('row', '背阔肌')],
    );
    expect(replacements.bench).toEqual([expect.objectContaining({ exerciseId: 'machine-press' })]);
  });

  it('derives bounded grounded risks with and without exercise IDs', () => {
    const risk = deriveRiskAssessment(
      '2026-09-09',
      [exercise('bench')],
      [
        { id: 'whole-body', date: '2026-09-08', bodyPart: '全身', score: 4 },
        { id: 'bench-risk', date: '2026-09-09', exerciseId: 'bench', exerciseName: '卧推', bodyPart: '右肩', score: 8 },
      ],
      [],
    );
    expect(risk.level).toBe('stop');
    expect(risk.affectedExerciseIds).toEqual(['bench']);
    expect(risk.signals[0]).toMatchObject({ label: '右肩 8/10', exerciseId: 'bench' });
    expect(risk.signals.some((signal) => signal.bodyPart === '全身')).toBe(true);
  });

  it('validates replacement identifiers and rejects a no-op', () => {
    expect(validateWorkoutReplacement({ date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'press' }))
      .toEqual({ date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'press' });
    expect(() => validateWorkoutReplacement({ date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'bench' }))
      .toThrow('不能与原动作相同');
  });

  it('persists a validated replacement and returns the refreshed normalized workout', async () => {
    const libraryPages = [libraryPage('bench', '卧推'), libraryPage('machine-press', '器械推胸')];
    let trainingPage: NotionPage = {
      id: 'training-bench',
      properties: {
        Date: date('2026-09-09'), 'Exercise ID': text('bench'), Name: title('卧推'), 'Target Muscle': text('胸大肌'),
        Order: number(1), 'Plan Sets': number(4), 'Plan Reps': text('8-10'), 'Plan Weight': number(40), Completed: checkbox(false),
      },
    };
    notion.retrieveDataSource.mockImplementation(async (id: string) => id === 'library' ? librarySchema : trainingSchema);
    notion.queryDataSource.mockImplementation(async (id: string) => id === 'library' ? libraryPages : [trainingPage]);
    notion.updatePageProperties.mockImplementation(async () => {
      trainingPage = {
        ...trainingPage,
        properties: {
          ...trainingPage.properties,
          'Exercise ID': text('machine-press'),
          Name: title('器械推胸'),
        },
      };
      return trainingPage;
    });

    const refreshed = await replaceTodayExercise({
      date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'machine-press',
    });
    expect(notion.updatePageProperties).toHaveBeenCalledOnce();
    expect(refreshed.exercises[0]).toMatchObject({ exerciseId: 'machine-press', name: '器械推胸', targetMuscle: '胸大肌' });
  });

  it('does not replace an exercise after server-side progress exists', async () => {
    const libraryPages = [libraryPage('bench', '卧推'), libraryPage('machine-press', '器械推胸')];
    const trainingPage: NotionPage = {
      id: 'training-bench',
      properties: {
        Date: date('2026-09-09'), 'Exercise ID': text('bench'), Name: title('卧推'), 'Target Muscle': text('胸大肌'),
        Order: number(1), 'Plan Sets': number(4), 'Plan Reps': text('8-10'), 'Plan Weight': number(40), Completed: checkbox(true),
      },
    };
    notion.retrieveDataSource.mockImplementation(async (id: string) => id === 'library' ? librarySchema : trainingSchema);
    notion.queryDataSource.mockImplementation(async (id: string) => id === 'library' ? libraryPages : [trainingPage]);

    await expect(replaceTodayExercise({
      date: '2026-09-09', originalExerciseId: 'bench', replacementExerciseId: 'machine-press',
    })).rejects.toThrow('不能替换');
    expect(notion.updatePageProperties).not.toHaveBeenCalled();
  });
});
