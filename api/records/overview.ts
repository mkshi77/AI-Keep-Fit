import { getWorkoutHistoryOverview } from '../../server/records.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import type { WorkoutHistoryOverview } from '../../src/domain/records.js';
import { authFailure } from '../../server/auth.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: 'Method not allowed' }); }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    const period = new URL(request.url ?? '', 'http://localhost').searchParams.get('period');
    if (period && period !== 'week') throw new Error('无效概览周期');
    const sessions = await getWorkoutHistoryOverview();
    const completedSets = sessions.reduce((sum, session) => sum + session.completedSets, 0);
    const plannedSets = sessions.reduce((sum, session) => sum + session.plannedSets, 0);
    const totalVolume = sessions.reduce((sum, session) => sum + session.totalVolume, 0);
    const durationMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0);
    const overview: WorkoutHistoryOverview = {
      period: 'week',
      sessions,
      completedSets,
      plannedSets,
      totalVolume,
      completionRate: plannedSets ? completedSets / plannedSets : 0,
      durationMinutes,
    };
    return response.status(200).json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : '训练概览暂时不可用';
    const status = message === '无效概览周期' ? 400 : 503;
    console.error('Workout history overview failed', message);
    return response.status(status).json({ error: message });
  }
}
