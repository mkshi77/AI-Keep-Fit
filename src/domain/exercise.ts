export type TrainingDay = 'A' | 'B' | 'C';

export interface WorkoutSet {
  weight: string;
  reps: string;
  completed: boolean;
}

export type BalanceDirection = 'none' | 'left_weaker' | 'right_weaker';

export interface ExerciseFeedback {
  rir?: number;
  balanceDirection?: BalanceDirection;
  asymmetrySeverity?: 0 | 1 | 2 | 3;
  discomfort?: number;
  note?: string;
}

export interface ExerciseInstructions {
  overview?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  warmupAdvice?: string;
}

export interface TodayExercise {
  exerciseId: string;
  notionPageId: string;
  name: string;
  targetMuscle?: string;
  planSets: number;
  planReps: string;
  planWeight?: number;
  restSeconds?: number;
  baseline?: string;
  recommendationTag?: string;
  cover?: string;
  video?: string;
  youtube?: string;
  status?: string;
  version?: string;
  updatedAt?: string;
  changeNote?: string;
  instructions?: ExerciseInstructions;
  savedSets?: WorkoutSet[];
  savedFeedback?: ExerciseFeedback;
  completed?: boolean;
  submissionId?: string;
}

export interface WorkoutCompletionExercise {
  exerciseId: string;
  notionPageId: string;
  name: string;
  sets: WorkoutSet[];
  feedback: ExerciseFeedback;
}

export interface WorkoutCompletionPayload {
  date: string;
  trainingDay: TrainingDay;
  submissionId?: string;
  durationMinutes?: number;
  exercises: WorkoutCompletionExercise[];
}

export type WorkoutCompletionStatus = 'completed' | 'partial' | 'skipped';

export interface WorkoutCompletionResult {
  success: true;
  updated: number;
  submissionId: string | null;
  workoutCompleted: boolean;
  exercises: Array<{
    exerciseId: string;
    notionPageId: string;
    status: WorkoutCompletionStatus;
  }>;
}
