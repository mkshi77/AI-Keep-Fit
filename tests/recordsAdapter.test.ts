import { describe, expect, it } from 'vitest';
import type { WorkoutHistorySession } from '../src/domain/records';
import { buildBodyWeightDataset, buildHeatmap, buildPrRecords, buildTrends, buildWeeklyData, isoWeekLabel, mapRemoteBodyFeedback, summarizeSessions } from '../src/adapters/recordsAdapter';

const sessions: WorkoutHistorySession[] = [{
  date: '2026-09-08', trainingDay: 'A', durationMinutes: 45, completedSets: 2, plannedSets: 3,
  totalVolume: 800, completionRate: 2 / 3,
  exercises: [{ exerciseId: 'bench', exerciseName: '卧推', targetMuscle: '胸部', sets: [{ weight: 40, reps: 10 }, { weight: 42.5, reps: 8 }], status: 'partial' }],
}, {
  date: '2026-09-09', trainingDay: 'A', durationMinutes: 40, completedSets: 3, plannedSets: 3,
  totalVolume: 1000, completionRate: 1,
  exercises: [{ exerciseId: 'bench', exerciseName: '卧推', targetMuscle: '胸部', sets: [{ weight: 45, reps: 8 }], status: 'completed' }],
}];

describe('records adapter', () => {
  it('builds weekly rows and aggregate metrics from history', () => {
    const week = buildWeeklyData(sessions, new Date('2026-09-09T12:00:00Z'));
    expect(week).toHaveLength(7);
    expect(week.at(-1)).toMatchObject({ date: '09/09', sets: 3, tonnage: 1000, active: true });
    expect(summarizeSessions(sessions)).toMatchObject({ sessions: 2, completedSets: 5, durationMinutes: 85, completionRate: 5 / 6 });
  });

  it('derives PR and trend records from completed sets', () => {
    const prs = buildPrRecords(sessions, new Date('2026-09-09T12:00:00Z'));
    expect(prs[0]).toMatchObject({ id: 'bench', value: '45.0', previousBest: '42.5 kg', reps: '8次' });
    expect(buildTrends(sessions).bench.points.map((point) => point.weight)).toEqual([42.5, 45]);
  });

  it('builds a bounded 24-week heatmap', () => {
    const heatmap = buildHeatmap(sessions, new Date('2026-09-09T12:00:00Z'));
    expect(heatmap.rows).toHaveLength(7);
    expect(heatmap.rows.every((row) => row.length === 24)).toBe(true);
    expect(heatmap.totalAttendance).toBe(2);
    expect(isoWeekLabel('2026-09-09')).toBe('W37');
  });

  it('maps server body feedback to the existing view model', () => {
    expect(mapRemoteBodyFeedback([{ id: 'fb', date: '2026-09-09', bodyPart: '肩', description: '紧张', score: 5 }])[0])
      .toMatchObject({ part: '肩', date: '09/09', score: '5/10', scoreColor: 'amber' });
  });

  it('builds body weight chart bounds from persisted records', () => {
    const dataset = buildBodyWeightDataset([
      { id: 'w1', date: '2026-09-08', weightKg: 74.4, condition: '晨起空腹' },
      { id: 'w2', date: '2026-09-09', weightKg: 74.1, condition: '晨起空腹' },
    ], '30d');
    expect(dataset).toMatchObject({ label: '近 30 天', baseline: 74.4 });
    expect(dataset.points.map((point) => point.weight)).toEqual([74.4, 74.1]);
    expect(dataset.yMin).toBeLessThan(74.1);
    expect(dataset.yMax).toBeGreaterThan(74.4);
  });
});
