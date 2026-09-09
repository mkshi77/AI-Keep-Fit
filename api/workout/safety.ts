import { authFailure } from '../../server/auth.js';
import { type ApiRequest, type ApiResponse } from '../../server/http.js';
import { getWorkoutSafety } from '../../server/replacementRisk.js';
import { dateInTimeZone } from '../../server/workout.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    return response.status(200).json(await getWorkoutSafety(dateInTimeZone()));
  } catch (error) {
    console.error('Workout safety failed', error instanceof Error ? error.message : 'unknown error');
    return response.status(503).json({ error: '训练风险与替代建议暂时不可用' });
  }
}
