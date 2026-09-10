import { getBodyWeightHistory, saveBodyWeight, validateBodyWeightInput } from '../../server/bodyWeight.js';
import { authFailure } from '../../server/auth.js';
import { isAllowedBrowserOrigin, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { dateInTimeZone } from '../../server/workout.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (!['GET', 'POST'].includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const auth = authFailure(request);
  if (auth) return response.status(auth.status).json(auth);
  if (request.method === 'POST' && !isAllowedBrowserOrigin(request)) return response.status(403).json({ error: '不允许的请求来源' });
  try {
    if (request.method === 'GET') {
      const period = new URL(request.url ?? '', 'http://localhost').searchParams.get('period') ?? undefined;
      return response.status(200).json(await getBodyWeightHistory(period));
    }
    const input = validateBodyWeightInput(request.body);
    if (input.date !== dateInTimeZone()) return response.status(400).json({ error: '只允许记录今天的体重' });
    return response.status(200).json(await saveBodyWeight(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : '体重数据暂时不可用';
    const status = /未配置|缺少|不受支持/.test(message) ? 503 : 400;
    console.error('Body weight request failed', message);
    return response.status(status).json({ error: message });
  }
}
