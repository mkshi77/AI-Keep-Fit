import type { TodayWorkout } from '../domain/workout';
import type { Exercise, ExerciseFeedbackData, SetRecord } from '../types';

export const WORKOUT_DRAFT_STORAGE_KEY = 'keepfit_workout_draft_v1';

export type WorkoutDraftExerciseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type BilateralBalance = ExerciseFeedbackData['bilateralBalance'];

export interface WorkoutDraftSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutDraftFeedback {
  rir: number;
  bilateralBalance: BilateralBalance;
  discomfortLevel: number;
  note?: string;
}

export interface WorkoutDraftExercise {
  exerciseId: string;
  sets: WorkoutDraftSet[];
  feedback?: WorkoutDraftFeedback;
  status: WorkoutDraftExerciseStatus;
}

export type WorkoutSubmissionStatus = 'idle' | 'submitting' | 'failed' | 'submitted';

export interface WorkoutDraft {
  version: 1;
  date: string;
  trainingDay: TodayWorkout['trainingDay'];
  startedAt: number;
  currentExerciseId: string;
  currentExerciseIndex: number;
  exercises: WorkoutDraftExercise[];
  updatedAt: number;
  submissionId?: string;
  submissionStatus?: WorkoutSubmissionStatus;
  lastSubmissionError?: string;
  submittedAt?: number;
}

export interface WorkoutDraftSummary {
  completedSets: number;
  totalPlannedSets: number;
  totalVolume: number;
  completionRate: number;
  durationMinutes: number;
}

const statusForSets = (sets: WorkoutDraftSet[]): WorkoutDraftExerciseStatus => {
  if (sets.length > 0 && sets.every((set) => set.completed)) return 'completed';
  if (sets.some((set) => set.completed)) return 'in_progress';
  return 'pending';
};

const draftSetsFromExercise = (exercise: Exercise, resetCompleted = false): WorkoutDraftSet[] =>
  exercise.sets.map((set) => ({
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    completed: resetCompleted ? false : set.isCompleted,
  }));

export const createWorkoutDraft = (
  workout: TodayWorkout,
  exercises: Exercise[],
  now = Date.now(),
  resetCompleted = false,
): WorkoutDraft => {
  const draftExercises = exercises.map((exercise) => {
    const sets = draftSetsFromExercise(exercise, resetCompleted);
    return { exerciseId: exercise.id, sets, status: statusForSets(sets) };
  });
  return {
    version: 1,
    date: workout.date,
    trainingDay: workout.trainingDay,
    startedAt: now,
    currentExerciseId: exercises[0]?.id ?? '',
    currentExerciseIndex: 0,
    exercises: draftExercises,
    updatedAt: now,
    submissionStatus: 'idle',
  };
};

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isDraftSet = (value: unknown): value is WorkoutDraftSet => {
  if (!value || typeof value !== 'object') return false;
  const set = value as Partial<WorkoutDraftSet>;
  return Number.isInteger(set.setNumber) && isNumber(set.weight) && isNumber(set.reps) && typeof set.completed === 'boolean';
};

const DRAFT_STATUSES: WorkoutDraftExerciseStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
const BILATERAL_BALANCES: BilateralBalance[] = ['无差异', '左侧吃力', '右侧吃力'];
const SUBMISSION_STATUSES: WorkoutSubmissionStatus[] = ['idle', 'submitting', 'failed', 'submitted'];

const hasValidSubmissionMetadata = (value: Partial<WorkoutDraft>): boolean =>
  (value.submissionId === undefined || (typeof value.submissionId === 'string' && value.submissionId.length > 0 && value.submissionId.length <= 100))
  && (value.submissionStatus === undefined || SUBMISSION_STATUSES.includes(value.submissionStatus as WorkoutSubmissionStatus))
  && (value.lastSubmissionError === undefined || typeof value.lastSubmissionError === 'string')
  && (value.submittedAt === undefined || isNumber(value.submittedAt));
const isDraftFeedback = (value: unknown): value is WorkoutDraftFeedback => {
  if (!value || typeof value !== 'object') return false;
  const feedback = value as Partial<WorkoutDraftFeedback>;
  return isNumber(feedback.rir)
    && BILATERAL_BALANCES.includes(feedback.bilateralBalance as BilateralBalance)
    && isNumber(feedback.discomfortLevel)
    && (feedback.note === undefined || typeof feedback.note === 'string');
};

const isDraftExercise = (value: unknown): value is WorkoutDraftExercise => {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<WorkoutDraftExercise>;
  return typeof exercise.exerciseId === 'string'
    && Array.isArray(exercise.sets)
    && exercise.sets.every(isDraftSet)
    && DRAFT_STATUSES.includes(exercise.status as WorkoutDraftExerciseStatus)
    && (exercise.feedback === undefined || isDraftFeedback(exercise.feedback));
};

export const parseWorkoutDraft = (raw: string | null): WorkoutDraft | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<WorkoutDraft>;
    if (
      value.version !== 1 ||
      typeof value.date !== 'string' ||
      !isNumber(value.startedAt) ||
      !isNumber(value.updatedAt) ||
      typeof value.currentExerciseId !== 'string' ||
      !Number.isInteger(value.currentExerciseIndex) ||
      !Array.isArray(value.exercises) ||
      !value.exercises.every(isDraftExercise) ||
      !hasValidSubmissionMetadata(value)
    ) return null;
    return value as WorkoutDraft;
  } catch {
    return null;
  }
};

export const restoreWorkoutDraft = (
  workout: TodayWorkout,
  exercises: Exercise[],
  stored: WorkoutDraft | null,
  now = Date.now(),
): WorkoutDraft | null => {
  if (!stored || stored.date !== workout.date) return null;
  const storedById = new Map(stored.exercises.map((exercise) => [exercise.exerciseId, exercise]));
  const reconciled = exercises.map((exercise) => {
    const previous = storedById.get(exercise.id);
    const previousSets = new Map(previous?.sets.map((set) => [set.setNumber, set]) ?? []);
    const sets = draftSetsFromExercise(exercise).map((set) => previousSets.get(set.setNumber) ?? set);
    const status = previous?.status === 'skipped'
      ? 'skipped'
      : sets.every((set) => set.completed)
        ? 'completed'
        : previous?.status === 'in_progress'
          ? 'in_progress'
          : statusForSets(sets);
    return {
      exerciseId: exercise.id,
      sets,
      feedback: previous?.feedback,
      status,
    };
  });
  const requestedIndex = exercises.findIndex((exercise) => exercise.id === stored.currentExerciseId);
  const currentExerciseIndex = requestedIndex >= 0 ? requestedIndex : 0;
  return {
    ...stored,
    trainingDay: workout.trainingDay,
    currentExerciseId: exercises[currentExerciseIndex]?.id ?? '',
    currentExerciseIndex,
    exercises: reconciled,
    updatedAt: now,
  };
};

export const loadWorkoutDraft = (
  storage: Pick<Storage, 'getItem'>,
  workout: TodayWorkout,
  exercises: Exercise[],
): WorkoutDraft | null => restoreWorkoutDraft(
  workout,
  exercises,
  parseWorkoutDraft(storage.getItem(WORKOUT_DRAFT_STORAGE_KEY)),
);

export const saveWorkoutDraft = (storage: Pick<Storage, 'setItem'>, draft: WorkoutDraft) => {
  storage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

export const applyWorkoutDraft = (exercises: Exercise[], draft: WorkoutDraft | null): Exercise[] => {
  if (!draft) return exercises;
  const draftById = new Map(draft.exercises.map((exercise) => [exercise.exerciseId, exercise]));
  return exercises.map((exercise) => {
    const draftExercise = draftById.get(exercise.id);
    if (!draftExercise) return exercise;
    const draftSets = new Map(draftExercise.sets.map((set) => [set.setNumber, set]));
    const sets = exercise.sets.map((set) => {
      const saved = draftSets.get(set.setNumber);
      return saved ? { ...set, weight: saved.weight, reps: saved.reps, isCompleted: saved.completed } : set;
    });
    const currentIndex = sets.findIndex((set) => !set.isCompleted);
    return {
      ...exercise,
      sets: sets.map((set, index) => ({ ...set, isCurrent: currentIndex >= 0 && index === currentIndex })),
    };
  });
};

export const updateWorkoutDraftSet = (
  draft: WorkoutDraft,
  exerciseId: string,
  updatedSet: SetRecord,
  now = Date.now(),
): WorkoutDraft => ({
  ...draft,
  exercises: draft.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) return exercise;
    const sets = exercise.sets.map((set) => set.setNumber === updatedSet.setNumber ? {
      setNumber: updatedSet.setNumber,
      weight: updatedSet.weight,
      reps: updatedSet.reps,
      completed: updatedSet.isCompleted,
    } : set);
    return { ...exercise, sets, status: sets.every((set) => set.completed) ? 'completed' : 'in_progress' };
  }),
  updatedAt: now,
});

export const updateWorkoutDraftFeedback = (
  draft: WorkoutDraft,
  exerciseId: string,
  feedback: ExerciseFeedbackData,
  now = Date.now(),
): WorkoutDraft => ({
  ...draft,
  exercises: draft.exercises.map((exercise) => exercise.exerciseId === exerciseId ? {
    ...exercise,
    status: 'completed',
    feedback: {
      rir: feedback.rir,
      bilateralBalance: feedback.bilateralBalance,
      discomfortLevel: feedback.discomfortLevel,
      ...(feedback.note ? { note: feedback.note } : {}),
    },
  } : exercise),
  updatedAt: now,
});

export const setWorkoutDraftExerciseStatus = (
  draft: WorkoutDraft,
  exerciseId: string,
  status: WorkoutDraftExerciseStatus,
  now = Date.now(),
): WorkoutDraft => ({
  ...draft,
  exercises: draft.exercises.map((exercise) => exercise.exerciseId === exerciseId ? { ...exercise, status } : exercise),
  updatedAt: now,
});

export const setWorkoutDraftCurrentExercise = (
  draft: WorkoutDraft,
  exerciseId: string,
  currentExerciseIndex: number,
  now = Date.now(),
): WorkoutDraft => ({ ...draft, currentExerciseId: exerciseId, currentExerciseIndex, updatedAt: now });

export const setWorkoutDraftSubmission = (
  draft: WorkoutDraft,
  submissionId: string,
  now = Date.now(),
): WorkoutDraft => ({
  ...draft,
  submissionId,
  submissionStatus: 'idle',
  lastSubmissionError: undefined,
  updatedAt: now,
});

export const setWorkoutDraftSubmissionStatus = (
  draft: WorkoutDraft,
  status: WorkoutSubmissionStatus,
  data: { lastSubmissionError?: string; submittedAt?: number } = {},
  now = Date.now(),
): WorkoutDraft => ({
  ...draft,
  submissionStatus: status,
  ...(status === 'failed' ? { lastSubmissionError: data.lastSubmissionError } : {}),
  ...(status === 'submitted' && data.submittedAt ? { submittedAt: data.submittedAt } : {}),
  updatedAt: now,
});

export const clearWorkoutDraft = (storage: Pick<Storage, 'removeItem'>) => {
  storage.removeItem(WORKOUT_DRAFT_STORAGE_KEY);
};

export const summarizeWorkoutDraft = (draft: WorkoutDraft | null, now = Date.now()): WorkoutDraftSummary => {
  if (!draft) return { completedSets: 0, totalPlannedSets: 0, totalVolume: 0, completionRate: 0, durationMinutes: 0 };
  const sets = draft.exercises.flatMap((exercise) => exercise.sets);
  const completed = sets.filter((set) => set.completed);
  return {
    completedSets: completed.length,
    totalPlannedSets: sets.length,
    totalVolume: completed.reduce((sum, set) => sum + set.weight * set.reps, 0),
    completionRate: sets.length ? Math.round((completed.length / sets.length) * 100) : 0,
    durationMinutes: Math.max(0, Math.floor((now - draft.startedAt) / 60000)),
  };
};
