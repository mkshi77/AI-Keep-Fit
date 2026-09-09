import type { BodyFeedbackHistoryRecord, HistoryPeriod, WorkoutHistoryOverview, WorkoutHistorySession } from '../domain/records';
import type { BodyFeedbackRecord } from '../types';

export type RecordsPeriodLabel = '本周' | '本月' | '3个月' | '全部';

export const RECORDS_PERIODS: Record<RecordsPeriodLabel, HistoryPeriod> = {
  本周: '7d', 本月: '30d', '3个月': '90d', 全部: 'all',
};

export const isoWeekLabel = (value = isoDate(new Date())) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return `W${Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)}`;
};

export interface RecordsPrRecord {
  id: string; exercise: string; muscle: string; metricType: string; value: string; unit: string;
  change: string; date: string; isRecentHighlight: boolean; reps: string; estimated1RM: string;
  previousBest: string; note: string; history: Array<{ date: string; weight: string }>;
}

export interface RecordsTrend {
  name: string; category: string; target: string; points: Array<{ date: string; weight: number; isPR?: boolean }>;
  summary: string; est1RM: string; gain: string; baseline: string;
}

export interface RecordsWeekDay {
  day: string; date: string; routineName: string; sets: number; tonnage: number; completion: string;
  height: number; active: boolean; isPR?: boolean;
  exercises: Array<{ name: string; sets: string; max: string; vol: string; isPR?: boolean }>;
}

export interface RecordsHeatmap {
  rows: Array<Array<{ date: string; value: 0 | 1 | 2; sets: number }>>;
  months: Array<{ label: string; weeks: number }>;
  totalAttendance: number;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const shortDate = (date: string) => date.slice(5).replace('-', '/');
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; };
const maxSet = (sets: Array<{ weight: number; reps: number }>) => sets.reduce((best, set) => set.weight > best.weight ? set : best, { weight: 0, reps: 0 });
const exerciseVolume = (sets: Array<{ weight: number; reps: number }>) => sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

export const buildWeeklyData = (sessions: WorkoutHistorySession[], now = new Date()): RecordsWeekDay[] => {
  const byDate = new Map(sessions.map((session) => [session.date, session]));
  const dates = Array.from({ length: 7 }, (_, index) => addDays(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), index - 6));
  const volumes = dates.map((date) => byDate.get(isoDate(date))?.totalVolume ?? 0);
  const maxVolume = Math.max(...volumes, 1);
  return dates.map((date, index) => {
    const session = byDate.get(isoDate(date));
    return {
      day: ['日', '一', '二', '三', '四', '五', '六'][date.getUTCDay()],
      date: shortDate(isoDate(date)),
      routineName: session?.trainingDay ? `训练日 ${session.trainingDay}` : '休整日',
      sets: session?.completedSets ?? 0,
      tonnage: session?.totalVolume ?? 0,
      completion: `${Math.round((session?.completionRate ?? 0) * 100)}%`,
      height: session ? Math.max(8, Math.round((volumes[index] / maxVolume) * 56)) : 0,
      active: Boolean(session),
      exercises: session?.exercises.map((exercise) => {
        const max = maxSet(exercise.sets);
        return {
          name: exercise.exerciseName || exercise.exerciseId,
          sets: `${exercise.sets.length} 组`,
          max: `${max.weight.toFixed(1)} kg`,
          vol: `${Math.round(exerciseVolume(exercise.sets)).toLocaleString()} kg`,
        };
      }) ?? [],
    };
  });
};

export const buildPrRecords = (sessions: WorkoutHistorySession[], now = new Date()): RecordsPrRecord[] => {
  const byExercise = new Map<string, Array<{ date: string; name: string; muscle: string; weight: number; reps: number }>>();
  sessions.forEach((session) => session.exercises.forEach((exercise) => {
    if (!exercise.sets.length) return;
    const best = maxSet(exercise.sets);
    const points = byExercise.get(exercise.exerciseId) ?? [];
    points.push({ date: session.date, name: exercise.exerciseName || exercise.exerciseId, muscle: exercise.targetMuscle || '未标注', ...best });
    byExercise.set(exercise.exerciseId, points);
  }));
  return [...byExercise.entries()].flatMap<RecordsPrRecord>(([exerciseId, points]) => {
    const sorted = points.sort((left, right) => left.date.localeCompare(right.date));
    const best = sorted.reduce((current, point) => point.weight > current.weight ? point : current, sorted[0]);
    const previous = Math.max(0, ...sorted.filter((point) => point.date < best.date).map((point) => point.weight));
    const ageDays = Math.floor((now.getTime() - new Date(`${best.date}T00:00:00Z`).getTime()) / 86400000);
    return [{
      id: exerciseId, exercise: best.name, muscle: best.muscle, metricType: '重量PR', value: best.weight.toFixed(1), unit: 'kg',
      change: previous ? `${best.weight - previous >= 0 ? '+' : ''}${(best.weight - previous).toFixed(1)}kg` : '首次记录',
      date: shortDate(best.date), isRecentHighlight: ageDays >= 0 && ageDays <= 30, reps: `${best.reps}次`,
      estimated1RM: `${(best.weight * (1 + best.reps / 30)).toFixed(1)} kg`, previousBest: previous ? `${previous.toFixed(1)} kg` : '无',
      note: '基于已完成训练组自动计算。', history: sorted.map((point) => ({ date: shortDate(point.date), weight: `${point.weight.toFixed(1)}kg` })),
    }];
  }).sort((left, right) => Number(right.isRecentHighlight) - Number(left.isRecentHighlight) || right.date.localeCompare(left.date));
};

export const buildTrends = (sessions: WorkoutHistorySession[]): Record<string, RecordsTrend> => {
  const records = buildPrRecords(sessions);
  return Object.fromEntries(records.map((record) => {
    const points = record.history.map((point) => ({ date: point.date, weight: Number.parseFloat(point.weight) }));
    let runningMax = 0;
    const marked = points.map((point) => { const isPR = point.weight > runningMax; runningMax = Math.max(runningMax, point.weight); return { ...point, ...(isPR ? { isPR: true } : {}) }; });
    const first = points[0]?.weight ?? 0;
    const latest = points.at(-1)?.weight ?? 0;
    return [record.id, {
      name: record.exercise, category: record.muscle, target: record.muscle, points: marked,
      summary: points.map((point) => point.weight.toFixed(1)).join(' → ') + ' kg', est1RM: record.estimated1RM,
      gain: first ? `${latest >= first ? '+' : ''}${(((latest - first) / first) * 100).toFixed(1)}%` : '0.0%', baseline: `${first.toFixed(1)} kg`,
    }];
  }));
};

export const summarizeSessions = (sessions: WorkoutHistorySession[]) => ({
  sessions: sessions.length,
  completedSets: sessions.reduce((sum, session) => sum + session.completedSets, 0),
  durationMinutes: sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
  completionRate: sessions.reduce((sum, session) => sum + session.plannedSets, 0)
    ? sessions.reduce((sum, session) => sum + session.completedSets, 0) / sessions.reduce((sum, session) => sum + session.plannedSets, 0) : 0,
});

export const overviewSummary = (overview?: WorkoutHistoryOverview) => overview ? ({
  sessions: overview.sessions.length, completedSets: overview.completedSets, durationMinutes: overview.durationMinutes, completionRate: overview.completionRate,
}) : summarizeSessions([]);

export const buildHeatmap = (sessions: WorkoutHistorySession[], now = new Date()): RecordsHeatmap => {
  const current = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const monday = addDays(current, -((current.getUTCDay() + 6) % 7));
  const start = addDays(monday, -23 * 7);
  const byDate = new Map(sessions.map((session) => [session.date, session]));
  const maxVolume = Math.max(0, ...sessions.map((session) => session.totalVolume));
  const rows = Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, week) => {
    const date = isoDate(addDays(start, week * 7 + day));
    const session = byDate.get(date);
    return { date, value: session ? (session.totalVolume === maxVolume && maxVolume > 0 ? 2 : 1) : 0, sets: session?.completedSets ?? 0 } as const;
  }));
  const months: RecordsHeatmap['months'] = [];
  Array.from({ length: 24 }, (_, week) => addDays(start, week * 7)).forEach((date) => {
    const label = `${date.getUTCMonth() + 1}月`;
    const last = months.at(-1);
    if (last?.label === label) last.weeks += 1; else months.push({ label, weeks: 1 });
  });
  const end = addDays(start, 24 * 7);
  return { rows, months, totalAttendance: sessions.filter((session) => session.date >= isoDate(start) && session.date < isoDate(end)).length };
};

export const mapRemoteBodyFeedback = (records: BodyFeedbackHistoryRecord[]): BodyFeedbackRecord[] => records.map((record) => {
  const score = record.score ?? 0;
  return { id: record.id, part: record.bodyPart || record.exerciseName || '全身', date: shortDate(record.date), description: record.description || record.summary || '暂无描述', score: `${score}/10`, scoreColor: score >= 7 ? 'red' : score >= 4 ? 'amber' : 'green' };
});
