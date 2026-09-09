import { saveBodyFeedback, validateBodyFeedbackInput } from '../../server/bodyFeedback.js';
import { authFailure } from '../../server/auth.js';
import { isAllowedBrowserOrigin, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { getBodyFeedbackHistory } from '../../server/records.js';
import { dateInTimeZone } from '../../server/workout.js';
import type { BodyFeedbackInput } from '../../src/domain/records.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (!['GET', 'POST'].includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (request.method === 'GET') return response.status(200).json(await getBodyFeedbackHistory());
  if (!isAllowedBrowserOrigin(request)) return response.status(403).json({ error: '不允许的请求来源' });
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  let input: BodyFeedbackInput;
  try {
    input = validateBodyFeedbackInput(request.body);
  } catch (error) {
    return response.status(400).json({ error: error instanceof Error ? error.message : '请求格式无效' });
  }
  if (input.date !== dateInTimeZone()) return response.status(400).json({ error: '只允许记录今天的身体反馈' });
  try {
    return response.status(201).json(await saveBodyFeedback(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : '身体反馈写入失败';
    console.error('Body feedback request failed', message);
    return response.status(503).json({ error: /未配置|缺少|不受支持/.test(message) ? message : '身体反馈写入失败' });
  }
}
