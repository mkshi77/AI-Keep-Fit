import { describe, expect, it } from 'vitest';
import { buildWorkoutReviewRequest } from '../src/adapters/workoutSubmissionAdapter';
import { buildWorkoutMaintenance, parseWorkoutReviewResponse, validateWorkoutReviewRequest } from '../server/maintenance';
import type { WorkoutHistorySession } from '../src/domain/records';
import type { WorkoutCompletionPayload } from '../src/domain/workout';

const session = (date: string, completedSets: number, plannedSets: number): WorkoutHistorySession => ({
  date,
  trainingDay: 'A',
  durationMinutes: 0,
  completedSets,
  plannedSets,
  totalVolume: completedSets * 500,
  completionRate: completedSets / plannedSets,
  exercises: [],
});

describe('AI maintenance and future plan foundation', () => {
  it('builds the current week from normalized sessions without fixed dates or goals', () => {
    const result = buildWorkoutMaintenance('2026-09-10', [
      session('2026-09-07', 8, 8),
      session('2026-09-10', 0, 10),
      session('2026-09-04', 5, 8),
    ]);
    expect(result.weekly).toMatchObject({ plannedSessions: 2, completedSessions: 1 });
    expect(result.weekly.days.map((day) => day.date)).toEqual([
      '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
    ]);
    expect(result.insight?.summary).toContain('8/8');
  });

  it('validates internally consistent review data', () => {
    const value = validateWorkoutReviewRequest({
      date: '2026-09-10', trainingDay: 'B', durationMinutes: 45,
      completedSets: 3, plannedSets: 4, totalVolume: 1200,
      exercises: [{ exerciseId: 'row', exerciseName: '划船', completedSets: 3, plannedSets: 4, rir: 2, discomfort: 0 }],
    });
    expect(value.exercises[0].exerciseId).toBe('row');
    expect(() => validateWorkoutReviewRequest({ ...value, completedSets: 4 })).toThrow('训练组数不一致');
  });

  it('rejects malformed or unbounded AI future-plan output', () => {
    expect(parseWorkoutReviewResponse(JSON.stringify({
      review: '完成稳定。',
      futurePlan: { title: '下次训练', actions: ['保持当前负荷', '观察实际 RIR'] },
    }))).toEqual({ review: '完成稳定。', futurePlan: { title: '下次训练', actions: ['保持当前负荷', '观察实际 RIR'] } });
    expect(() => parseWorkoutReviewResponse(JSON.stringify({ review: 'ok', futurePlan: { title: 'x', actions: ['1', '2', '3', '4'] } }))).toThrow('AI 下次计划格式无效');
  });

  it('derives review inputs only from completed draft sets', () => {
    const payload: WorkoutCompletionPayload = {
      date: '2026-09-10', trainingDay: 'C', durationMinutes: 30, submissionId: 'submission',
      exercises: [{
        exerciseId: 'squat', notionPageId: 'page', name: '深蹲',
        sets: [{ weight: '80', reps: '5', completed: true }, { weight: '80', reps: '5', completed: false }],
        feedback: { rir: 2, discomfort: 1 },
      }],
    };
    expect(buildWorkoutReviewRequest(payload)).toEqual({
      date: '2026-09-10', trainingDay: 'C', durationMinutes: 30,
      completedSets: 1, plannedSets: 2, totalVolume: 400,
      exercises: [{ exerciseId: 'squat', exerciseName: '深蹲', completedSets: 1, plannedSets: 2, rir: 2, discomfort: 1 }],
    });
  });
});
