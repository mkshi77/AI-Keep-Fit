import { describe, expect, it } from 'vitest';
import type { TodayWorkout } from '../src/domain/workout';
import type { Exercise } from '../src/types';
import { createWorkoutDraft, updateWorkoutDraftFeedback, updateWorkoutDraftSet } from '../src/state/workoutDraft';
import { buildWorkoutCompletionPayload } from '../src/adapters/workoutSubmissionAdapter';

const workout: TodayWorkout = {
  date: '2026-09-08', trainingDay: 'A', isRecoveryDay: false, source: 'notion', exercises: [],
};

const exercise: Exercise = {
  id: 'bench-press', notionPageId: 'notion-1', number: '01', name: '卧推', targetMuscle: '胸',
  defaultSets: 2, repRange: '8-10', weight: 40, restSeconds: 90, previousNote: '', recommendationTag: '', image: '',
  instructions: { overview: '', keyPoints: [], commonMistakes: [], warmupAdvice: '' },
  sets: [
    { setNumber: 1, weight: 40, reps: 8, targetReps: '8-10', isCompleted: false },
    { setNumber: 2, weight: 40, reps: 8, targetReps: '8-10', isCompleted: false },
  ],
};

const createReadyDraft = () => {
  let draft = createWorkoutDraft(workout, [exercise], 60_000, true);
  draft = updateWorkoutDraftSet(draft, 'bench-press', {
    ...exercise.sets[0], weight: 42.5, reps: 9, isCompleted: true,
  }, 61_000);
  draft = updateWorkoutDraftFeedback(draft, 'bench-press', {
    exerciseId: 'bench-press', exerciseName: '卧推', rir: 2,
    bilateralBalance: '右侧吃力', discomfortLevel: 4, note: '末端有牵拉感',
  }, 62_000);
  return { ...draft, submissionId: 'submission-1' };
};

describe('workout submission adapter', () => {
  it('builds the official payload from TodayWorkout and converts set numbers to strings', () => {
    const payload = buildWorkoutCompletionPayload(workout, createReadyDraft(), [exercise], 120_001);
    expect(payload).toMatchObject({
      date: '2026-09-08', trainingDay: 'A', submissionId: 'submission-1', durationMinutes: 1,
    });
    expect(payload.exercises[0]).toMatchObject({
      exerciseId: 'bench-press', notionPageId: 'notion-1', name: '卧推',
      feedback: { rir: 2, balanceDirection: 'right_weaker', discomfort: 4, note: '末端有牵拉感' },
    });
    expect(payload.exercises[0].sets[0]).toEqual({ weight: '42.5', reps: '9', completed: true });
    expect(payload.exercises[0].sets[1]).toEqual({ weight: '40', reps: '8', completed: false });
  });

  it('rejects a fallback plan and preserves the user draft', () => {
    expect(() => buildWorkoutCompletionPayload({ ...workout, source: 'fallback' }, createReadyDraft(), [exercise]))
      .toThrow('当前训练计划不是正式 Notion 计划，无法写回；训练草稿已保留。');
  });

  it('rejects a missing Notion page ID', () => {
    expect(() => buildWorkoutCompletionPayload(workout, createReadyDraft(), [{ ...exercise, notionPageId: undefined }]))
      .toThrow('当前训练计划缺少 Notion 页面 ID，无法写回；训练草稿已保留。');
  });

  it('rejects zero completed sets', () => {
    const draft = { ...createWorkoutDraft(workout, [exercise], 60_000, true), submissionId: 'submission-1' };
    expect(() => buildWorkoutCompletionPayload(workout, draft, [exercise])).toThrow('至少完成一组才能正式提交。');
  });

  it('rejects a missing persistent submission ID', () => {
    const draft = createReadyDraft();
    delete draft.submissionId;
    expect(() => buildWorkoutCompletionPayload(workout, draft, [exercise])).toThrow('缺少 submissionId，无法正式提交。');
  });
});
