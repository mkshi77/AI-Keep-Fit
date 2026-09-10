import { authFailure } from '../../server/auth.js';
import { isAllowedBrowserOrigin, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { replaceTodayExercise, validateWorkoutReplacement } from '../../server/replacementRisk.js';
import { dateInTimeZone } from '../../server/workout.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAllowedBrowserOrigin(request)) return response.status(403).json({ error: '不允许的请求来源' });
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  try {
    const input = validateWorkoutReplacement(request.body);
    if (input.date !== dateInTimeZone()) return response.status(400).json({ error: '只允许替换今天的训练动作' });
    return response.status(200).json(await replaceTodayExercise(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : '动作替换失败';
    console.error('Workout replacement failed', message);
    return response.status(/未配置|缺少|暂时不可用/.test(message) ? 503 : 400).json({ error: message });
  }
}
