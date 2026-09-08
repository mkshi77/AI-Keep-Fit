export type TabType = 'today' | 'records' | 'coach';

export type WorkoutScreen = 'overview' | 'active' | 'rest' | 'feedback' | 'summary';

export type ScreenType = 
  | 'today' 
  | 'workout' 
  | 'rest' 
  | 'exercise-feedback' 
  | 'workout-summary' 
  | 'records' 
  | 'coach';

export interface SetRecord {
  setNumber: number;
  weight: number;
  reps: number;
  targetReps: string;
  isCompleted: boolean;
  isCurrent?: boolean;
}

export interface Exercise {
  id: string;
  number: string;
  name: string;
  targetMuscle: string;
  defaultSets: number;
  repRange: string;
  weight: number;
  restSeconds: number;
  previousNote: string;
  recommendationTag: string;
  image: string;
  instructions: {
    overview: string;
    keyPoints: string[];
    commonMistakes: string[];
    warmupAdvice: string;
  };
  sets: SetRecord[];
}

export interface ExerciseFeedbackData {
  exerciseId: string;
  exerciseName: string;
  rir: number;
  bilateralBalance: '无差异' | '左侧吃力' | '右侧吃力';
  discomfortLevel: number;
  note?: string;
}

export interface BodyFeedbackRecord {
  id: string;
  part: string;
  date: string;
  description: string;
  score: string;
  scoreColor: 'amber' | 'green' | 'red';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  time: string;
  text: string;
  proposedFeedback?: {
    exercise: string;
    location: string;
    discomfortLevel: string;
    note: string;
  };
  isFeedbackRecorded?: boolean;
}
