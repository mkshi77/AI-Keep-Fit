import { useCallback, useEffect, useState } from 'react';
import type { BodyWeightInput, BodyWeightRecord, HistoryPeriod } from '../domain/records';
import { getBodyWeightRecords, saveBodyWeightRecord } from '../services/recordsApi';

type BodyWeightPeriod = Exclude<HistoryPeriod, 'all'>;

export const useBodyWeightData = (period: BodyWeightPeriod) => {
  const [records, setRecords] = useState<BodyWeightRecord[]>([]);
  const [warning, setWarning] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    getBodyWeightRecords(period, controller.signal).then((result) => {
      setRecords(result.records);
      setWarning(result.warning);
    }).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError(requestError instanceof Error ? requestError.message : '体重记录暂时不可用');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [period]);

  const save = useCallback(async (input: BodyWeightInput) => {
    setSaving(true);
    setError(undefined);
    try {
      const saved = await saveBodyWeightRecord(input);
      setRecords((current) => [...current.filter((record) => record.id !== saved.id && record.date !== saved.date), saved]
        .sort((left, right) => left.date.localeCompare(right.date)));
      setWarning(undefined);
      return saved;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '体重记录暂时不可用';
      setError(message);
      throw requestError;
    } finally {
      setSaving(false);
    }
  }, []);

  return { records, warning, error, loading, saving, save };
};
