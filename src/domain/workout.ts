import type { TodayExercise } from './exercise';

export type TrainingDay = 'A' | 'B' | 'C' | string;

export interface TodayWorkout {
  date: string;
  trainingDay: TrainingDay | null;
  isRecoveryDay: boolean;
  source: 'notion' | 'fallback';
  exercises: TodayExercise[];
  warning?: string;
}
