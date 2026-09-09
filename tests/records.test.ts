import { describe, expect, it, vi } from 'vitest';
import type { NotionPage } from '../server/notion';
import { queryDataSource } from '../server/notion';
import { aggregateWorkoutHistory, getWorkoutHistory, historyCutoffDate, mapBodyFeedbackPage, mapWorkoutHistoryPage } from '../server/records';

const date = (value: string) => ({ type: 'date', date: { start: value } });
const text = (value: string) => ({ type: 'rich_text', rich_text: [{ plain_text: value }] });
const select = (value: string) => ({ type: 'select', select: { name: value } });
const number = (value: number) => ({ type: 'number', number: value });
const checkbox = (value: boolean) => ({ type: 'checkbox', checkbox: value });

const executionPage = (id: string, overrides: Record<string, unknown> = {}): NotionPage => ({
  id,
  properties: {
    Date: date('2026-09-08'), Day: text('A'), 'Exercise ID': text('bench-press'),
    Name: text('卧推'), 'Target Muscle': text('胸大肌'), Order: number(1), 'Plan Sets': number(3),
    '训练时长分钟': number(45),
    '第1组重量kg': number(42.5), '第1组次数': number(9),
    '第2组重量kg': number(42.5), '第2组次数': number(9),
    末组RIR: number(2), 左右差异: select('2 明显'), 左右差异方向: select('左侧吃力'),
    '不适0-10': number(3), 动作反馈备注: text('Phase 1C smoke test'), 完成: checkbox(false),
    ...overrides,
  },
});
describe('Phase 2A history foundation', () => {
  it('maps a partial exercise without counting incomplete sets', () => {
    const exercise = mapWorkoutHistoryPage(executionPage('execution-1', {
      '第3组重量kg': number(42.5), '第3组次数': undefined,
    }));
    expect(exercise).toMatchObject({
      exerciseId: 'bench-press', exerciseName: '卧推', targetMuscle: '胸大肌',
      status: 'partial', asymmetrySeverity: 2, balanceDirection: 'left_weaker', discomfort: 3,
    });
    expect(exercise?.sets).toHaveLength(2);
  });

  it('aggregates volume and session duration once per date', () => {
    const sessions = aggregateWorkoutHistory([
      executionPage('execution-1'),
      executionPage('execution-2', { 'Exercise ID': text('row'), Order: number(2), '训练时长分钟': number(45) }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ date: '2026-09-08', trainingDay: 'A', durationMinutes: 45, completedSets: 4, plannedSets: 6, totalVolume: 1530, completionRate: 4 / 6 });
    expect(sessions[0].exercises.map((exercise) => exercise.exerciseId)).toEqual(['bench-press', 'row']);
  });

  it('classifies skipped and completed exercises', () => {
    const skipped = mapWorkoutHistoryPage(executionPage('execution-1', {
      '第1组重量kg': undefined, '第1组次数': undefined, '第2组重量kg': undefined, '第2组次数': undefined,
    }));
    const completed = mapWorkoutHistoryPage(executionPage('execution-1', {
      '第3组重量kg': number(42.5), '第3组次数': number(9),
    }));
    expect(skipped?.status).toBe('skipped');
    expect(completed?.status).toBe('completed');
  });

  it('supports production severity select and legacy number', () => {
    const fromSelect = mapWorkoutHistoryPage(executionPage('execution-1'));
    const fromNumber = mapWorkoutHistoryPage(executionPage('execution-1', { 左右差异: number(3) }));
    expect(fromSelect?.asymmetrySeverity).toBe(2);
    expect(fromNumber?.asymmetrySeverity).toBe(3);
  });

  it('rejects invalid history period', async () => {
    vi.stubEnv('NOTION_TOKEN', 'token');
    vi.stubEnv('NOTION_TRAINING_DATA_SOURCE_ID', 'training');
    await expect(getWorkoutHistory('10d')).rejects.toThrow('无效历史周期');
    vi.unstubAllEnvs();
  });

  it('returns bounded cutoff dates', () => {
    expect(historyCutoffDate('7d', '2026-09-08')).toBe('2026-09-01');
    expect(historyCutoffDate('all', '2026-09-08')).toBeUndefined();
  });

  it('maps body feedback with and without an exercise ID', () => {
    const wholeBody = mapBodyFeedbackPage(executionPage('feedback-1', {
      'Exercise ID': undefined, 部位: text('全身'), 描述: text('恢复良好'), 评分: number(8),
    }));
    const exercise = mapBodyFeedbackPage(executionPage('feedback-2', {
      'Exercise ID': text('bench-press'), 动作名称: text('卧推'), 部位: text('肩'), 描述: text('轻微紧张'),
    }));
    expect(wholeBody).toMatchObject({ id: 'feedback-1', date: '2026-09-08', bodyPart: '全身', score: 8 });
    expect(wholeBody?.exerciseId).toBeUndefined();
    expect(exercise).toMatchObject({ exerciseId: 'bench-press', exerciseName: '卧推', bodyPart: '肩' });
  });

  it('bounds paginated Notion reads', async () => {
    const page = (id: string): NotionPage => ({ id, properties: {} });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: Array.from({ length: 100 }, (_, index) => page(`page-${index}`)), has_more: true, next_cursor: 'next' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: Array.from({ length: 100 }, (_, index) => page(`next-${index}`)), has_more: true, next_cursor: 'ignored' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const pages = await queryDataSource('training', 'token', {}, 101);
    expect(pages).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
