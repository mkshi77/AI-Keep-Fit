import type { ExerciseInstructions } from './exercise';

export type WorkoutRiskLevel = 'clear' | 'caution' | 'stop';
export type WorkoutRiskSource = 'body_feedback' | 'workout_history';

export interface WorkoutRiskSignal {
  id: string;
  source: WorkoutRiskSource;
  date: string;
  severity: number;
  exerciseId?: string;
  exerciseName?: string;
  bodyPart?: string;
  label: string;
  message: string;
}

export interface ReplacementOption {
  exerciseId: string;
  name: string;
  targetMuscle: string;
  planSets: number;
  planReps: string;
  planWeight?: number;
  restSeconds?: number;
  baseline?: string;
  recommendationTag?: string;
  cover?: string;
  instructions?: ExerciseInstructions;
  reason: 'same_target_muscle';
}

export interface WorkoutSafetyResult {
  date: string;
  risk: {
    level: WorkoutRiskLevel;
    signals: WorkoutRiskSignal[];
    affectedExerciseIds: string[];
  };
  replacements: Record<string, ReplacementOption[]>;
  warning?: string;
}

export interface WorkoutReplacementInput {
  date: string;
  originalExerciseId: string;
  replacementExerciseId: string;
}
