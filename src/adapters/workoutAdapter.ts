import type { TodayExercise } from '../domain/exercise';
import type { ReplacementOption } from '../domain/replacementRisk';
import type { Exercise, SetRecord } from '../types';

const EMPTY_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%23141416"/%3E%3Ctext x="320" y="190" text-anchor="middle" fill="%2373737a" font-family="sans-serif" font-size="24"%3E暂无动作图片%3C/text%3E%3C/svg%3E';

const firstRep = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const setsFor = (exercise: TodayExercise): SetRecord[] =>
  Array.from({ length: Math.max(1, exercise.planSets) }, (_, index) => {
    const saved = exercise.savedSets?.[index];
    return {
      setNumber: index + 1,
      weight: Number(saved?.weight || exercise.planWeight || 0),
      reps: Number(saved?.reps || firstRep(exercise.planReps)),
      targetReps: exercise.planReps,
      isCompleted: saved?.completed ?? false,
      isCurrent: index === 0 && !saved?.completed,
    };
  });

export const adaptExercise = (exercise: TodayExercise, index: number): Exercise => ({
  id: exercise.exerciseId,
  notionPageId: exercise.notionPageId,
  number: String(index + 1).padStart(2, '0'),
  name: exercise.name,
  targetMuscle: exercise.targetMuscle || '暂无目标肌群',
  defaultSets: Math.max(1, exercise.planSets),
  repRange: exercise.planReps || '待补充',
  weight: Number.isFinite(exercise.planWeight) ? exercise.planWeight! : 0,
  restSeconds: exercise.restSeconds && exercise.restSeconds > 0 ? exercise.restSeconds : 90,
  previousNote: exercise.baseline || '暂无上次训练信息',
  recommendationTag: exercise.recommendationTag || exercise.baseline || '按计划完成',
  image: exercise.cover || EMPTY_IMAGE,
  instructions: {
    overview: exercise.instructions?.overview || '暂无动作概述',
    keyPoints: exercise.instructions?.keyPoints?.length ? exercise.instructions.keyPoints : ['暂无动作要领'],
    commonMistakes: exercise.instructions?.commonMistakes?.length ? exercise.instructions.commonMistakes : ['暂无常见错误'],
    warmupAdvice: exercise.instructions?.warmupAdvice || '暂无热身建议',
  },
  sets: setsFor(exercise),
});

export const adaptTodayWorkout = (exercises: TodayExercise[]) => exercises.map(adaptExercise);

export const adaptReplacementOption = (option: ReplacementOption, index: number): Exercise => adaptExercise({
  exerciseId: option.exerciseId,
  notionPageId: '',
  name: option.name,
  targetMuscle: option.targetMuscle,
  planSets: option.planSets,
  planReps: option.planReps,
  planWeight: option.planWeight,
  restSeconds: option.restSeconds,
  baseline: option.baseline,
  recommendationTag: option.recommendationTag || '同目标肌群',
  cover: option.cover,
  instructions: option.instructions,
}, index);
