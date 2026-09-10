import type { TodayWorkout, WorkoutCompletionPayload } from '../domain/workout';
import type { WorkoutReviewRequest } from '../domain/maintenance';
import type { Exercise } from '../types';
import type { WorkoutDraft } from '../state/workoutDraft';
import { exerciseFeedbackFromUI } from './feedbackAdapter';

const plannedById = (exercises: Exercise[]) => new Map(exercises.map((exercise) => [exercise.id, exercise]));

export const buildWorkoutCompletionPayload = (
  workout: TodayWorkout,
  draft: WorkoutDraft,
  plannedExercises: Exercise[],
  now = Date.now(),
): WorkoutCompletionPayload => {
  if (workout.source !== 'notion') throw new Error('当前训练计划不是正式 Notion 计划，无法写回；训练草稿已保留。');
  if (workout.trainingDay !== 'A' && workout.trainingDay !== 'B' && workout.trainingDay !== 'C') throw new Error('训练日无效，无法正式提交。');
  if (!draft.exercises.some((exercise) => exercise.sets.some((set) => set.completed))) throw new Error('至少完成一组才能正式提交。');
  if (!draft.submissionId) throw new Error('缺少 submissionId，无法正式提交。');
  const planned = plannedById(plannedExercises);
  if (plannedExercises.some((exercise) => !exercise.notionPageId)) throw new Error('当前训练计划缺少 Notion 页面 ID，无法写回；训练草稿已保留。');
  const exercises = draft.exercises.map((draftExercise) => {
    const exercise = planned.get(draftExercise.exerciseId);
    if (!exercise?.notionPageId) throw new Error(`动作 ${draftExercise.exerciseId} 缺少 Notion 页面 ID，无法写回；训练草稿已保留。`);
    return {
      exerciseId: draftExercise.exerciseId,
      notionPageId: exercise.notionPageId,
      name: exercise.name,
      sets: draftExercise.sets.map((set) => ({
        weight: String(set.weight),
        reps: String(set.reps),
        completed: set.completed,
      })),
      feedback: draftExercise.feedback ? exerciseFeedbackFromUI({
        exerciseId: draftExercise.exerciseId,
        exerciseName: exercise.name,
        rir: draftExercise.feedback.rir,
        bilateralBalance: draftExercise.feedback.bilateralBalance,
        discomfortLevel: draftExercise.feedback.discomfortLevel,
        note: draftExercise.feedback.note,
      }) : {},
    };
  });
  return {
    date: workout.date,
    trainingDay: workout.trainingDay,
    submissionId: draft.submissionId,
    durationMinutes: Math.max(0, Math.floor((now - draft.startedAt) / 60000)),
    exercises,
  };
};

export const buildWorkoutReviewRequest = (payload: WorkoutCompletionPayload): WorkoutReviewRequest => {
  const exercises = payload.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    completedSets: exercise.sets.filter((set) => set.completed).length,
    plannedSets: exercise.sets.length,
    ...(exercise.feedback.rir == null ? {} : { rir: exercise.feedback.rir }),
    ...(exercise.feedback.discomfort == null ? {} : { discomfort: exercise.feedback.discomfort }),
  }));
  const completedSets = exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0);
  return {
    date: payload.date,
    trainingDay: payload.trainingDay,
    durationMinutes: payload.durationMinutes ?? 0,
    completedSets,
    plannedSets: exercises.reduce((sum, exercise) => sum + exercise.plannedSets, 0),
    totalVolume: payload.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => {
      if (!set.completed) return sum;
      return sum + Number(set.weight) * Number(set.reps);
    }, 0), 0),
    exercises,
  };
};
