export interface WorkoutSet {
  weight: string;
  reps: string;
  completed: boolean;
}

export interface ExerciseFeedback {
  rir?: number;
  asymmetry?: number;
  discomfort?: number;
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
}
