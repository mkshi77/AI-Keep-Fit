import { getWorkoutHistory } from '../../server/records.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import { authFailure } from '../../server/auth.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: 'Method not allowed' }); }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    const url = new URL(request.url ?? '', 'http://localhost');
    const sessions = await getWorkoutHistory(url.searchParams.get('period') ?? undefined);
    return response.status(200).json({ period: url.searchParams.get('period') ?? '30d', sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : '训练历史暂时不可用';
    const status = message === '无效历史周期' ? 400 : 503;
    console.error('Workout history failed', message);
    return response.status(status).json({ error: message });
  }
}
