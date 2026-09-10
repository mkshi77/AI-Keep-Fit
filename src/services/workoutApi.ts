import type { TodayWorkout, WorkoutCompletionPayload, WorkoutCompletionResult } from '../domain/workout';
import type { WorkoutReplacementInput, WorkoutSafetyResult } from '../domain/replacementRisk';
import type { WorkoutMaintenanceResult, WorkoutReviewRequest, WorkoutReviewResult } from '../domain/maintenance';

const parseError = async (response: Response) => {
  const data = await response.json().catch(() => null) as { error?: string } | null;
  return data?.error || '训练数据服务暂时不可用';
};

export const getTodayWorkout = async (): Promise<TodayWorkout> => {
  const response = await fetch('/api/workout/today', {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<TodayWorkout>;
};

export const completeWorkout = async (payload: WorkoutCompletionPayload): Promise<WorkoutCompletionResult> => {
  const response = await fetch('/api/workout/complete', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<WorkoutCompletionResult>;
};

export const getWorkoutSafety = async (): Promise<WorkoutSafetyResult> => {
  const response = await fetch('/api/workout/safety', {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<WorkoutSafetyResult>;
};

export const replaceWorkoutExercise = async (input: WorkoutReplacementInput): Promise<TodayWorkout> => {
  const response = await fetch('/api/workout/replace', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<TodayWorkout>;
};

export const getWorkoutMaintenance = async (): Promise<WorkoutMaintenanceResult> => {
  const response = await fetch('/api/workout/maintenance', {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<WorkoutMaintenanceResult>;
};

export const requestWorkoutReview = async (input: WorkoutReviewRequest): Promise<WorkoutReviewResult> => {
  const response = await fetch('/api/workout/review', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<WorkoutReviewResult>;
};
