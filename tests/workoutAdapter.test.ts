import { describe, expect, it } from 'vitest';
import { adaptExercise } from '../src/adapters/workoutAdapter';

describe('workout adapter', () => {
  it('maps saved sets and uses explicit empty-state copy', () => {
    const exercise = adaptExercise({
      exerciseId: 'row', notionPageId: 'page', name: '划船', planSets: 2, planReps: '8-10', planWeight: 40,
      savedSets: [{ weight: '42.5', reps: '9', completed: true }],
    }, 0);
    expect(exercise.sets[0]).toMatchObject({ weight: 42.5, reps: 9, isCompleted: true });
    expect(exercise.restSeconds).toBe(90);
    expect(exercise.instructions.warmupAdvice).toBe('暂无热身建议');
  });
});
