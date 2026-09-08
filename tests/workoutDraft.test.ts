import { describe, expect, it } from 'vitest';
import type { TodayWorkout } from '../src/domain/workout';
import type { Exercise } from '../src/types';
import {
  applyWorkoutDraft,
  createWorkoutDraft,
  parseWorkoutDraft,
  restoreWorkoutDraft,
  setWorkoutDraftCurrentExercise,
  setWorkoutDraftExerciseStatus,
  summarizeWorkoutDraft,
  updateWorkoutDraftFeedback,
  updateWorkoutDraftSet,
} from '../src/state/workoutDraft';

const workout: TodayWorkout = {
  date: '2026-09-08', trainingDay: 'A', isRecoveryDay: false, source: 'notion', exercises: [],
};

const exercises: Exercise[] = [{
  id: 'bench-press', notionPageId: 'notion-1', number: '01', name: '卧推', targetMuscle: '胸',
  defaultSets: 2, repRange: '8-10', weight: 40, restSeconds: 90, previousNote: '', recommendationTag: '', image: '',
  instructions: { overview: '', keyPoints: [], commonMistakes: [], warmupAdvice: '' },
  sets: [
    { setNumber: 1, weight: 40, reps: 8, targetReps: '8-10', isCompleted: false },
    { setNumber: 2, weight: 40, reps: 8, targetReps: '8-10', isCompleted: false },
  ],
}];

describe('workout draft', () => {
  it('initializes from the adapted TodayWorkout plan', () => {
    const draft = createWorkoutDraft(workout, exercises, 1_000);
    expect(draft).toMatchObject({ date: workout.date, trainingDay: 'A', startedAt: 1_000, currentExerciseId: 'bench-press' });
    expect(draft.exercises[0].sets).toEqual([
      { setNumber: 1, weight: 40, reps: 8, completed: false },
      { setNumber: 2, weight: 40, reps: 8, completed: false },
    ]);
  });

  it('restores a same-day draft by exercise id and set number', () => {
    const updated = updateWorkoutDraftSet(createWorkoutDraft(workout, exercises, 1_000), 'bench-press', {
      ...exercises[0].sets[0], weight: 42.5, reps: 9, isCompleted: true,
    }, 2_000);
    const draft = setWorkoutDraftCurrentExercise(updated, 'bench-press', 0, 2_500);
    const restored = restoreWorkoutDraft(workout, exercises, draft, 3_000);
    expect(applyWorkoutDraft(exercises, restored)[0].sets[0]).toMatchObject({ weight: 42.5, reps: 9, isCompleted: true });
    expect(restored).toMatchObject({ currentExerciseId: 'bench-press', currentExerciseIndex: 0 });
  });

  it('ignores a draft from another date', () => {
    const draft = createWorkoutDraft({ ...workout, date: '2026-09-07' }, exercises, 1_000);
    expect(restoreWorkoutDraft(workout, exercises, draft)).toBeNull();
  });

  it('reconciles plan reordering by exercise id instead of array index', () => {
    const row = { ...exercises[0], id: 'row', name: '划船', number: '02' };
    const initialPlan = [exercises[0], row];
    const rowSet = { ...row.sets[0], weight: 55, reps: 12, isCompleted: true };
    const updated = updateWorkoutDraftSet(createWorkoutDraft(workout, initialPlan), 'row', rowSet);
    const restored = restoreWorkoutDraft(workout, [row, exercises[0]], updated);
    expect(applyWorkoutDraft([row, exercises[0]], restored)[0].sets[0]).toMatchObject({ weight: 55, reps: 12, isCompleted: true });
  });

  it('updates set fields and calculates partial completion using completed sets only', () => {
    const draft = updateWorkoutDraftSet(createWorkoutDraft(workout, exercises, 1_000), 'bench-press', {
      ...exercises[0].sets[0], weight: 42.5, reps: 10, isCompleted: true,
    }, 2_000);
    expect(draft.exercises[0].sets[0]).toEqual({ setNumber: 1, weight: 42.5, reps: 10, completed: true });
    expect(summarizeWorkoutDraft(draft, 181_000)).toEqual({
      completedSets: 1, totalPlannedSets: 2, totalVolume: 425, completionRate: 50, durationMinutes: 3,
    });
  });

  it('keeps AI-Keep-Fit bilateral balance semantics without numeric mapping', () => {
    const draft = updateWorkoutDraftFeedback(createWorkoutDraft(workout, exercises), 'bench-press', {
      exerciseId: 'bench-press', exerciseName: '卧推', rir: 2, bilateralBalance: '左侧吃力', discomfortLevel: 3, note: '轻微',
    });
    expect(draft.exercises[0].feedback).toEqual({ rir: 2, bilateralBalance: '左侧吃力', discomfortLevel: 3, note: '轻微' });
  });

  it('marks a skipped exercise without fabricating completed sets', () => {
    const draft = setWorkoutDraftExerciseStatus(createWorkoutDraft(workout, exercises), 'bench-press', 'skipped');
    expect(draft.exercises[0].status).toBe('skipped');
    expect(draft.exercises[0].sets.every((set) => !set.completed)).toBe(true);
  });

  it('rejects incompatible unversioned local data', () => {
    expect(parseWorkoutDraft(JSON.stringify({ date: workout.date, exercises: {} }))).toBeNull();
  });
});
