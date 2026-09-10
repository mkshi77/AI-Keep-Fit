import { dateInTimeZone, getTodayWorkoutFromNotion } from '../../server/workout.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import { authFailure } from '../../server/auth.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: 'Method not allowed' }); }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  return response.status(200).json(await getTodayWorkoutFromNotion(dateInTimeZone()));
}
