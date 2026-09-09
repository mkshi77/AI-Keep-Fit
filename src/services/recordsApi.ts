import type { BodyWeightInput, BodyWeightRecord, BodyWeightResult, HistoryPeriod } from '../domain/records';

const parseError = async (response: Response) => {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || '记录数据服务暂时不可用';
};

export const getBodyWeightRecords = async (period: Exclude<HistoryPeriod, 'all'>, signal?: AbortSignal): Promise<BodyWeightResult> => {
  const response = await fetch(`/api/records/body-weight?period=${period}`, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<BodyWeightResult>;
};

export const saveBodyWeightRecord = async (input: BodyWeightInput): Promise<BodyWeightRecord> => {
  const response = await fetch('/api/records/body-weight', {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<BodyWeightRecord>;
};
