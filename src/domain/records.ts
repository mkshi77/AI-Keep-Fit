import type { BalanceDirection, TrainingDay } from './exercise';

export type HistoryPeriod = '7d' | '30d' | '90d' | '180d' | 'all';
export type WorkoutHistoryExerciseStatus = 'completed' | 'partial' | 'skipped';

export interface WorkoutHistorySet {
  weight: number;
  reps: number;
}

export interface WorkoutHistoryExercise {
  exerciseId: string;
  exerciseName?: string;
  targetMuscle?: string;
  sets: WorkoutHistorySet[];
  rir?: number;
  balanceDirection?: BalanceDirection;
  asymmetrySeverity?: 0 | 1 | 2 | 3;
  discomfort?: number;
  note?: string;
  status: WorkoutHistoryExerciseStatus;
}

export interface WorkoutHistorySession {
  date: string;
  trainingDay?: TrainingDay | null;
  durationMinutes?: number;
  completedSets: number;
  plannedSets: number;
  totalVolume: number;
  completionRate: number;
  exercises: WorkoutHistoryExercise[];
}

export interface WorkoutHistoryResult {
  period: HistoryPeriod;
  sessions: WorkoutHistorySession[];
}

export interface WorkoutHistoryOverview {
  period: 'week';
  sessions: WorkoutHistorySession[];
  completedSets: number;
  plannedSets: number;
  totalVolume: number;
  completionRate: number;
  durationMinutes: number;
}

export interface BodyFeedbackHistoryRecord {
  id: string;
  date: string;
  exerciseId?: string;
  exerciseName?: string;
  bodyPart?: string;
  description?: string;
  score?: number;
  type?: string;
  summary?: string;
}

export interface BodyFeedbackHistoryResult {
  records: BodyFeedbackHistoryRecord[];
  warning?: string;
}

export interface BodyFeedbackInput {
  date: string;
  exerciseId?: string;
  exerciseName?: string;
  bodyPart: string;
  description: string;
  score: number;
  type?: string;
  summary?: string;
}

export type BodyWeightCondition = '晨起空腹' | '练后即刻' | '晚间称重';

export interface BodyWeightRecord {
  id: string;
  date: string;
  weightKg: number;
  condition: BodyWeightCondition;
}

export interface BodyWeightResult {
  period: HistoryPeriod;
  records: BodyWeightRecord[];
  warning?: string;
}

export interface BodyWeightInput {
  date: string;
  weightKg: number;
  condition: BodyWeightCondition;
}

export type { BalanceDirection, TrainingDay };
