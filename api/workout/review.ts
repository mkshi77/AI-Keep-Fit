import { authFailure } from '../../server/auth.js';
import { isAllowedBrowserOrigin, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { generateWorkoutReview, validateWorkoutReviewRequest } from '../../server/maintenance.js';
import { dateInTimeZone } from '../../server/workout.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  if (!isAllowedBrowserOrigin(request)) return response.status(403).json({ error: '不允许的请求来源' });
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    const input = validateWorkoutReviewRequest(request.body);
    if (input.date !== dateInTimeZone()) return response.status(400).json({ error: '只允许复盘今天的训练' });
    return response.status(200).json(await generateWorkoutReview(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 训练复盘暂时不可用';
    console.error('Workout review failed', message);
    return response.status(/格式|不一致|只允许/.test(message) ? 400 : 503).json({ error: /未配置/.test(message) ? message : 'AI 训练复盘暂时不可用' });
  }
}
