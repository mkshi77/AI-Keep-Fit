import type { CoachRequest, CoachResponse } from '../domain/coach';

export const sendCoachMessage = async (input: CoachRequest): Promise<CoachResponse> => {
  const response = await fetch('/api/coach', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || 'AI Coach 暂时不可用');
  }
  return response.json() as Promise<CoachResponse>;
};
