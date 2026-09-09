export interface CoachHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface CoachWorkoutContext {
  exerciseId?: string;
  exerciseName?: string;
  completedSets: number;
  plannedSets: number;
  weight?: number;
  targetReps?: string;
}

export interface CoachRequest {
  message: string;
  history: CoachHistoryMessage[];
  context?: CoachWorkoutContext;
}

export interface CoachFeedbackProposal {
  exerciseId?: string;
  exerciseName?: string;
  bodyPart: string;
  score: number;
  note: string;
}

export interface CoachResponse {
  reply: string;
  proposedFeedback?: CoachFeedbackProposal;
}
