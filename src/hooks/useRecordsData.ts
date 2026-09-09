import { useEffect, useState } from 'react';
import type { BodyFeedbackHistoryResult, WorkoutHistoryOverview, WorkoutHistoryResult } from '../domain/records';
import { RECORDS_PERIODS, type RecordsPeriodLabel } from '../adapters/recordsAdapter';

interface RecordsDataState {
  history?: WorkoutHistoryResult;
  allHistory?: WorkoutHistoryResult;
  overview?: WorkoutHistoryOverview;
  bodyFeedback?: BodyFeedbackHistoryResult;
  loading: boolean;
  error?: string;
}

const fetchJson = async <T>(url: string, signal: AbortSignal): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store', signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `请求失败 (${response.status})`);
  return body as T;
};

export const useRecordsData = (period: RecordsPeriodLabel) => {
  const [state, setState] = useState<RecordsDataState>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: undefined }));
    const historyPromise = fetchJson<WorkoutHistoryResult>(`/api/records/history?period=${RECORDS_PERIODS[period]}`, controller.signal);
    const allHistoryPromise = RECORDS_PERIODS[period] === 'all' ? historyPromise : fetchJson<WorkoutHistoryResult>('/api/records/history?period=all', controller.signal);
    Promise.all([
      historyPromise,
      allHistoryPromise,
      fetchJson<WorkoutHistoryOverview>('/api/records/overview?period=week', controller.signal),
      fetchJson<BodyFeedbackHistoryResult>('/api/records/body-feedback', controller.signal),
    ]).then(([history, allHistory, overview, bodyFeedback]) => {
      setState({ history, allHistory, overview, bodyFeedback, loading: false });
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : '训练记录暂时不可用' }));
    });
    return () => controller.abort();
  }, [period]);
  return state;
};
