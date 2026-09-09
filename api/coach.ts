import { authFailure } from '../server/auth.js';
import { generateCoachResponse, validateCoachRequest } from '../server/coach.js';
import { isAllowedBrowserOrigin, type ApiRequest, type ApiResponse } from '../server/http.js';
import type { CoachRequest } from '../src/domain/coach.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAllowedBrowserOrigin(request)) return response.status(403).json({ error: '不允许的请求来源' });
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  let input: CoachRequest;
  try {
    input = validateCoachRequest(request.body);
  } catch (error) {
    return response.status(400).json({ error: error instanceof Error ? error.message : '请求格式无效' });
  }
  try {
    return response.status(200).json(await generateCoachResponse(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI Coach 暂时不可用';
    console.error('AI Coach request failed', message);
    return response.status(503).json({ error: message === 'AI Coach 未配置' ? message : 'AI Coach 暂时不可用' });
  }
}
