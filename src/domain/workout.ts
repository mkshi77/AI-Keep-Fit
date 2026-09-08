import type { TodayExercise, TrainingDay } from './exercise';

export type { TrainingDay, WorkoutCompletionPayload, WorkoutCompletionResult } from './exercise';

export interface TodayWorkout {
  date: string;
  trainingDay: TrainingDay | null;
  isRecoveryDay: boolean;
  source: 'notion' | 'fallback';
  exercises: TodayExercise[];
  warning?: string;
}
