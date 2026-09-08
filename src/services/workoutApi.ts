import type { TodayWorkout } from '../domain/workout';

const parseError = async (response: Response) => {
  const data = await response.json().catch(() => null) as { error?: string } | null;
  return data?.error || '无法读取今日训练';
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
