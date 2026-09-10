import { authFailure } from '../../server/auth.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import { getWorkoutMaintenance } from '../../server/maintenance.js';
import { dateInTimeZone } from '../../server/workout.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: 'Method not allowed' }); }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    return response.status(200).json(await getWorkoutMaintenance(dateInTimeZone()));
  } catch (error) {
    console.error('Workout maintenance failed', error instanceof Error ? error.message : 'unknown error');
    return response.status(503).json({ error: '训练进度与提示暂时不可用' });
  }
}
