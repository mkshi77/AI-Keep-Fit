import type { BalanceDirection, BodyFeedbackHistoryRecord, BodyFeedbackHistoryResult, HistoryPeriod, TrainingDay, WorkoutHistoryExercise, WorkoutHistorySession } from '../src/domain/records.js';
import { findSchemaProperty, firstNumber, firstString, type NotionDataSource, type NotionPage, queryDataSource, retrieveDataSource } from './notion.js';

const HISTORY_LIMIT = 1000;

const PROPERTY = {
  date: ['日期', '训练日期', 'Date'],
  day: ['训练日', '训练日类型', '计划日', 'Day'],
  exerciseId: ['Exercise ID', '动作ID', 'exercise_id'],
  name: ['Name', '动作名称', '动作名', '名称', '动作'],
  targetMuscle: ['Target Muscle', '目标肌群'],
  order: ['顺序', 'Order'],
  planSets: ['计划组数', '组数', 'Plan Sets'],
  duration: ['训练时长分钟', 'Duration Minutes', '训练时长'],
  rir: ['末组RIR', 'RIR'],
  asymmetry: ['左右差异', 'Asymmetry'],
  balanceDirection: ['左右差异方向', '差异方向', 'Balance Direction'],
  discomfort: ['不适0-10', '不适', 'Discomfort'],
  note: ['动作反馈备注', 'Feedback Note', '备注'],
  completed: ['完成', 'Completed'],
  retired: ['retired', 'Retired', '旧计划停用'],
} as const;

const BODY_PROPERTY = {
  date: ['日期', 'Date'],
  exerciseId: ['Exercise ID', '动作ID', 'exercise_id'],
  exerciseName: ['动作名称', '动作名', 'Name'],
  bodyPart: ['部位', 'Body Part'],
  description: ['描述', 'Description'],
  score: ['评分', 'Score'],
  type: ['类型', 'Type'],
  summary: ['AI结构化总结', 'AI Summary'],
} as const;

const BALANCE_DIRECTIONS: Record<string, BalanceDirection> = {
  '无差异': 'none', '左侧吃力': 'left_weaker', '右侧吃力': 'right_weaker',
};

const ASYMMETRY_LABELS: Record<string, 0 | 1 | 2 | 3> = {
  '0 无明显差异': 0, '1 轻微': 1, '2 明显': 2, '3 已影响动作': 3,
};

const subtractDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.APP_TIME_ZONE || 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export const historyCutoffDate = (period: HistoryPeriod, from = today()): string | undefined =>
  period === 'all' ? undefined : subtractDays(from, Number(period.replace('d', '')));

const dateRangeFilter = (schema: NotionDataSource['properties'], period: HistoryPeriod) => {
  const propertyName = findSchemaProperty(schema, PROPERTY.date);
  if (!propertyName || schema[propertyName].type !== 'date') return undefined;
  const cutoff = historyCutoffDate(period);
  return cutoff ? { property: propertyName, date: { on_or_after: cutoff } } : undefined;
};

const completedSets = (properties: NotionPage['properties']) => Array.from({ length: 4 }, (_, index) => {
  const weight = firstNumber(properties, [`第${index + 1}组重量kg`]);
  const reps = firstNumber(properties, [`第${index + 1}组次数`]);
  return weight != null && reps != null && weight >= 0 && reps >= 0 ? { weight, reps } : undefined;
}).filter((set): set is { weight: number; reps: number } => set !== undefined);

const balanceDirection = (properties: NotionPage['properties']): BalanceDirection | undefined => {
  const value = firstString(properties, PROPERTY.balanceDirection);
  if (!value) return undefined;
  if (value in BALANCE_DIRECTIONS) return BALANCE_DIRECTIONS[value];
  if (value === 'none' || value === 'left_weaker' || value === 'right_weaker') return value;
  return undefined;
};

const asymmetrySeverity = (properties: NotionPage['properties']): 0 | 1 | 2 | 3 | undefined => {
  const value = firstString(properties, PROPERTY.asymmetry);
  if (value) {
    if (value in ASYMMETRY_LABELS) return ASYMMETRY_LABELS[value];
    const numeric = Number(value);
    if ([0, 1, 2, 3].includes(numeric)) return numeric as 0 | 1 | 2 | 3;
  }
  const numeric = firstNumber(properties, PROPERTY.asymmetry);
  return numeric != null && [0, 1, 2, 3].includes(numeric) ? numeric as 0 | 1 | 2 | 3 : undefined;
};

const exerciseStatus = (sets: { weight: number; reps: number }[], plannedSets: number): WorkoutHistoryExercise['status'] => {
  if (sets.length >= plannedSets) return 'completed';
  if (sets.length === 0) return 'skipped';
  return 'partial';
};

export const mapWorkoutHistoryPage = (page: NotionPage): WorkoutHistoryExercise | undefined => {
  const exerciseId = firstString(page.properties, PROPERTY.exerciseId);
  if (!exerciseId) return undefined;
  const date = firstString(page.properties, PROPERTY.date);
  if (!date) return undefined;
  const sets = completedSets(page.properties);
  const plannedSets = Math.max(firstNumber(page.properties, PROPERTY.planSets) ?? sets.length, 1);
  return {
    exerciseId,
    exerciseName: firstString(page.properties, PROPERTY.name) || undefined,
    targetMuscle: firstString(page.properties, PROPERTY.targetMuscle) || undefined,
    sets,
    rir: firstNumber(page.properties, PROPERTY.rir),
    balanceDirection: balanceDirection(page.properties),
    asymmetrySeverity: asymmetrySeverity(page.properties),
    discomfort: firstNumber(page.properties, PROPERTY.discomfort),
    note: firstString(page.properties, PROPERTY.note) || undefined,
    status: exerciseStatus(sets, plannedSets),
  };
};

export const aggregateWorkoutHistory = (pages: NotionPage[]): WorkoutHistorySession[] => {
  const byDate = new Map<string, {
    exercises: Array<{ exercise: WorkoutHistoryExercise; page: NotionPage; order: number }>;
    trainingDay?: TrainingDay | null;
    durationMinutes?: number;
  }>();
  for (const page of pages) {
    const exercise = mapWorkoutHistoryPage(page);
    if (!exercise) continue;
    const date = firstString(page.properties, PROPERTY.date).slice(0, 10);
    const entry = byDate.get(date) ?? { exercises: [] };
    entry.exercises.push({ exercise, page, order: firstNumber(page.properties, PROPERTY.order) ?? 999 });
    if (!entry.trainingDay) entry.trainingDay = (firstString(page.properties, PROPERTY.day) as TrainingDay || null);
    if (entry.durationMinutes == null) entry.durationMinutes = firstNumber(page.properties, PROPERTY.duration);
    byDate.set(date, entry);
  }
  return [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, entry]) => {
    const rows = entry.exercises.sort((left, right) => left.order - right.order);
    const exercises = rows.map(({ exercise }) => exercise);
    const completedSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const plannedSets = rows.reduce((sum, { exercise, page }) =>
      sum + Math.max(firstNumber(page.properties, PROPERTY.planSets) ?? exercise.sets.length, 1), 0);
    const totalVolume = exercises.reduce((sessionTotal, exercise) =>
      sessionTotal + exercise.sets.reduce((exerciseTotal, set) => exerciseTotal + set.weight * set.reps, 0), 0);
    return {
      date,
      trainingDay: entry.trainingDay ?? null,
      durationMinutes: entry.durationMinutes,
      completedSets,
      plannedSets,
      totalVolume,
      completionRate: plannedSets ? completedSets / plannedSets : 0,
      exercises,
    };
  });
};

export const mapBodyFeedbackPage = (page: NotionPage): BodyFeedbackHistoryRecord | undefined => {
  const date = firstString(page.properties, BODY_PROPERTY.date);
  if (!date) return undefined;
  const exerciseId = firstString(page.properties, BODY_PROPERTY.exerciseId) || undefined;
  return {
    id: page.id,
    date: date.slice(0, 10),
    exerciseId,
    exerciseName: firstString(page.properties, BODY_PROPERTY.exerciseName) || undefined,
    bodyPart: firstString(page.properties, BODY_PROPERTY.bodyPart) || undefined,
    description: firstString(page.properties, BODY_PROPERTY.description) || undefined,
    score: firstNumber(page.properties, BODY_PROPERTY.score),
    type: firstString(page.properties, BODY_PROPERTY.type) || undefined,
    summary: firstString(page.properties, BODY_PROPERTY.summary) || undefined,
  };
};

const parsePeriod = (value: string | undefined): HistoryPeriod => {
  if (value === 'all') return 'all';
  if (value === undefined || value === '') return '30d';
  if (!['7d', '30d', '90d', '180d'].includes(value)) throw new Error('无效历史周期');
  return value as HistoryPeriod;
};

export const getWorkoutHistory = async (periodInput: string | undefined): Promise<WorkoutHistorySession[]> => {
  const period = parsePeriod(periodInput);
  const token = process.env.NOTION_TOKEN;
  const trainingId = process.env.NOTION_TRAINING_DATA_SOURCE_ID;
  if (!token || !trainingId) return [];
  const schema = await retrieveDataSource(trainingId, token);
  const filters: Record<string, unknown>[] = [];
  const dateFilter = dateRangeFilter(schema.properties, period);
  if (dateFilter) filters.push(dateFilter);
  const retiredName = findSchemaProperty(schema.properties, PROPERTY.retired);
  if (retiredName && schema.properties[retiredName].type === 'checkbox') filters.push({ property: retiredName, checkbox: { equals: false } });
  const dateName = findSchemaProperty(schema.properties, PROPERTY.date);
  const orderName = findSchemaProperty(schema.properties, PROPERTY.order);
  const sorts = [
    ...(dateName ? [{ property: dateName, direction: 'ascending' }] : []),
    ...(orderName ? [{ property: orderName, direction: 'ascending' }] : []),
  ];
  const pages = await queryDataSource(trainingId, token, {
    ...(filters.length === 1 ? { filter: filters[0] } : filters.length ? { filter: { and: filters } } : {}),
    ...(sorts.length ? { sorts } : {}),
  }, HISTORY_LIMIT);
  return aggregateWorkoutHistory(pages).slice(0, HISTORY_LIMIT);
};

export const getWorkoutHistoryOverview = async (): Promise<WorkoutHistorySession[]> => getWorkoutHistory('7d');

export const getBodyFeedbackHistory = async (): Promise<BodyFeedbackHistoryResult> => {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_BODY_FEEDBACK_DATA_SOURCE_ID;
  if (!token || !dataSourceId) return { records: [], warning: 'Body Feedback 数据源未配置' };
  try {
    const pages = await queryDataSource(dataSourceId, token, {}, HISTORY_LIMIT);
    return { records: pages.map(mapBodyFeedbackPage).filter((record): record is BodyFeedbackHistoryRecord => Boolean(record)) };
  } catch (error) {
    return { records: [], warning: error instanceof Error ? error.message : 'Body Feedback 暂时不可用' };
  }
};
