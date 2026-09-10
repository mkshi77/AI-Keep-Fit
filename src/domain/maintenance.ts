import type { TrainingDay } from './exercise';

export interface WeeklyProgressDay {
  date: string;
  dayLabel: string;
  isToday: boolean;
  planned: boolean;
  completed: boolean;
}

export interface WorkoutMaintenanceResult {
  date: string;
  weekly: {
    plannedSessions: number;
    completedSessions: number;
    days: WeeklyProgressDay[];
  };
  insight?: {
    title: string;
    summary: string;
    focus: string;
  };
}

export interface WorkoutReviewRequest {
  date: string;
  trainingDay: TrainingDay;
  durationMinutes: number;
  completedSets: number;
  plannedSets: number;
  totalVolume: number;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    completedSets: number;
    plannedSets: number;
    rir?: number;
    discomfort?: number;
  }>;
}

export interface WorkoutReviewResult {
  review: string;
  futurePlan: {
    title: string;
    actions: string[];
    caution?: string;
  };
  source: 'gemini';
}
