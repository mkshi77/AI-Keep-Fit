import type { TodayExercise } from '../src/domain/exercise.js';
import type {
  ReplacementOption,
  WorkoutReplacementInput,
  WorkoutRiskSignal,
  WorkoutSafetyResult,
} from '../src/domain/replacementRisk.js';
import type { TodayWorkout } from '../src/domain/workout.js';
import {
  findSchemaProperty,
  firstBoolean,
  firstNumber,
  firstString,
  queryDataSource,
  retrieveDataSource,
  updatePageProperties,
  type NotionDataSource,
  type NotionPage,
} from './notion.js';
import { getBodyFeedbackHistory, getWorkoutHistory } from './records.js';
import { getTodayWorkoutFromNotion, joinWorkoutPages } from './workout.js';

const LIBRARY_LIMIT = 500;
const MAX_OPTIONS_PER_EXERCISE = 5;
const MAX_RISK_SIGNALS = 6;
const RISK_LOOKBACK_DAYS = 14;

const PROPERTY = {
  date: ['日期', '训练日期', 'Date'],
  exerciseId: ['Exercise ID', '动作ID', 'exercise_id'],
  name: ['Name', '动作名称', '动作名', '名称', '动作'],
  targetMuscle: ['Target Muscle', '目标肌群'],
  planSets: ['计划组数', '组数', 'Plan Sets'],
  planReps: ['计划次数', '次数', 'Plan Reps'],
  planWeight: ['计划重量', '计划重量kg', 'Plan Weight'],
  baseline: ['当前基线', '基线', 'Baseline'],
  recommendation: ['Recommendation Tag', '推荐标签', '建议'],
  restSeconds: ['Rest Seconds', '休息秒数', '休息时间'],
  cover: ['Cover', '封面', '教学封面', '缩略图'],
  overview: ['Overview', '动作概述'],
  keyPoints: ['Key Points', '动作要领'],
  commonMistakes: ['Common Mistakes', '常见错误'],
  warmupAdvice: ['Warmup Advice', '热身建议'],
  status: ['Status', '库状态', 'Library Status'],
  enabled: ['启用', 'Enabled'],
} as const;

const normalized = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? '';
const lines = (value: string) => value.split(/\r?\n|；/).map((item) => item.replace(/^[-•\d.、\s]+/, '').trim()).filter(Boolean);

const libraryQuery = (schema: NotionDataSource['properties']) => {
  const enabledName = findSchemaProperty(schema, PROPERTY.enabled);
  return enabledName && schema[enabledName].type === 'checkbox'
    ? { filter: { property: enabledName, checkbox: { equals: true } } }
    : {};
};

const isActiveLibraryPage = (page: NotionPage) => {
  const status = normalized(firstString(page.properties, PROPERTY.status));
  return firstBoolean(page.properties, PROPERTY.enabled) !== false && status !== 'retired' && status !== '停用';
};

const mapReplacementOption = (page: NotionPage): ReplacementOption | undefined => {
  const exerciseId = firstString(page.properties, PROPERTY.exerciseId);
  const name = firstString(page.properties, PROPERTY.name);
  const targetMuscle = firstString(page.properties, PROPERTY.targetMuscle);
  if (!exerciseId || !name || !targetMuscle || !isActiveLibraryPage(page)) return undefined;
  const keyPoints = lines(firstString(page.properties, PROPERTY.keyPoints));
  const commonMistakes = lines(firstString(page.properties, PROPERTY.commonMistakes));
  return {
    exerciseId,
    name,
    targetMuscle,
    planSets: Math.max(1, firstNumber(page.properties, PROPERTY.planSets) ?? 1),
    planReps: firstString(page.properties, PROPERTY.planReps),
    planWeight: firstNumber(page.properties, PROPERTY.planWeight),
    restSeconds: firstNumber(page.properties, PROPERTY.restSeconds),
    baseline: firstString(page.properties, PROPERTY.baseline) || undefined,
    recommendationTag: firstString(page.properties, PROPERTY.recommendation) || undefined,
    cover: firstString(page.properties, PROPERTY.cover) || undefined,
    instructions: {
      overview: firstString(page.properties, PROPERTY.overview) || undefined,
      keyPoints: keyPoints.length ? keyPoints : undefined,
      commonMistakes: commonMistakes.length ? commonMistakes : undefined,
      warmupAdvice: firstString(page.properties, PROPERTY.warmupAdvice) || undefined,
    },
    reason: 'same_target_muscle',
  };
};

const cutoffDate = (date: string) => {
  const cutoff = new Date(`${date}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RISK_LOOKBACK_DAYS);
  return cutoff.toISOString().slice(0, 10);
};

export const deriveRiskAssessment = (
  date: string,
  todayExercises: TodayExercise[],
  bodyFeedback: Awaited<ReturnType<typeof getBodyFeedbackHistory>>['records'],
  history: Awaited<ReturnType<typeof getWorkoutHistory>>,
) => {
  const cutoff = cutoffDate(date);
  const signals: WorkoutRiskSignal[] = [];

  bodyFeedback.forEach((record) => {
    if (record.date < cutoff || record.date > date || record.score == null || record.score < 3) return;
    const subject = record.bodyPart || record.exerciseName || '身体状态';
    signals.push({
      id: `body:${record.id}`,
      source: 'body_feedback',
      date: record.date,
      severity: record.score,
      exerciseId: record.exerciseId,
      exerciseName: record.exerciseName,
      bodyPart: record.bodyPart,
      label: `${subject} ${record.score}/10`,
      message: record.score >= 7
        ? `已记录${subject}不适 ${record.score}/10，建议暂停相关动作并寻求专业评估。`
        : `已记录${subject}不适 ${record.score}/10，训练时降低强度并观察；如加重请立即停止。`,
    });
  });

  history.forEach((session) => {
    if (session.date < cutoff || session.date > date) return;
    session.exercises.forEach((exercise) => {
      const discomfort = exercise.discomfort ?? 0;
      const asymmetry = exercise.asymmetrySeverity ?? 0;
      if (discomfort < 3 && asymmetry < 2) return;
      const severity = Math.max(discomfort, asymmetry === 3 ? 6 : asymmetry === 2 ? 4 : 0);
      const detail = discomfort >= 3 ? `不适 ${discomfort}/10` : `左右差异 ${asymmetry}/3`;
      signals.push({
        id: `history:${session.date}:${exercise.exerciseId}`,
        source: 'workout_history',
        date: session.date,
        severity,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        label: `${exercise.exerciseName} ${detail}`,
        message: `最近一次${exercise.exerciseName}记录了${detail}；再次训练时降低强度并观察。`,
      });
    });
  });

  const selected = signals
    .sort((a, b) => b.severity - a.severity || b.date.localeCompare(a.date))
    .slice(0, MAX_RISK_SIGNALS);
  const todayIds = new Set(todayExercises.map((exercise) => exercise.exerciseId));
  const affectedExerciseIds = [...new Set(selected.flatMap((signal) => signal.exerciseId && todayIds.has(signal.exerciseId) ? [signal.exerciseId] : []))];
  return {
    level: selected.some((signal) => signal.severity >= 7) ? 'stop' as const : selected.length ? 'caution' as const : 'clear' as const,
    signals: selected,
    affectedExerciseIds,
  };
};

export const deriveReplacementOptions = (todayExercises: TodayExercise[], options: ReplacementOption[]) =>
  Object.fromEntries(todayExercises.map((exercise) => [
    exercise.exerciseId,
    options.filter((option) => option.exerciseId !== exercise.exerciseId
      && normalized(option.targetMuscle) === normalized(exercise.targetMuscle)).slice(0, MAX_OPTIONS_PER_EXERCISE),
  ]));

const loadLibrary = async () => {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_EXERCISE_DATA_SOURCE_ID;
  if (!token || !dataSourceId) throw new Error('Exercise Library 数据源未配置');
  const schema = await retrieveDataSource(dataSourceId, token);
  if (!findSchemaProperty(schema.properties, PROPERTY.exerciseId)) throw new Error('Exercise Library 缺少属性: Exercise ID');
  const pages = await queryDataSource(dataSourceId, token, libraryQuery(schema.properties), LIBRARY_LIMIT);
  return { token, dataSourceId, schema, pages: pages.filter(isActiveLibraryPage) };
};

export const getWorkoutSafety = async (date: string): Promise<WorkoutSafetyResult> => {
  const [workout, bodyFeedback, history] = await Promise.all([
    getTodayWorkoutFromNotion(date),
    getBodyFeedbackHistory(),
    getWorkoutHistory('30d'),
  ]);
  if (workout.source !== 'notion') {
    return { date, risk: { level: 'clear', signals: [], affectedExerciseIds: [] }, replacements: {}, warning: workout.warning || '训练数据暂时不可用' };
  }
  try {
    const { pages } = await loadLibrary();
    const options = pages.map(mapReplacementOption).filter((item): item is ReplacementOption => Boolean(item));
    const replacements = deriveReplacementOptions(workout.exercises, options);
    return {
      date,
      risk: deriveRiskAssessment(date, workout.exercises, bodyFeedback.records, history),
      replacements,
      ...(bodyFeedback.warning ? { warning: bodyFeedback.warning } : {}),
    };
  } catch (error) {
    return {
      date,
      risk: deriveRiskAssessment(date, workout.exercises, bodyFeedback.records, history),
      replacements: {},
      warning: error instanceof Error ? error.message : '替代动作暂时不可用',
    };
  }
};

const boundedId = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new Error(`${label}格式无效`);
  return value.trim();
};

export const validateWorkoutReplacement = (body: unknown): WorkoutReplacementInput => {
  if (!body || typeof body !== 'object') throw new Error('请求体不能为空');
  const input = body as Record<string, unknown>;
  const date = boundedId(input.date, '日期');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式无效');
  const originalExerciseId = boundedId(input.originalExerciseId, '原动作 ID');
  const replacementExerciseId = boundedId(input.replacementExerciseId, '替代动作 ID');
  if (originalExerciseId === replacementExerciseId) throw new Error('替代动作不能与原动作相同');
  return { date, originalExerciseId, replacementExerciseId };
};

const propertyValue = (type: string | undefined, value: string | number) => {
  if (type === 'title') return { title: [{ text: { content: String(value) } }] };
  if (type === 'rich_text') return { rich_text: [{ text: { content: String(value) } }] };
  if (type === 'select') return { select: { name: String(value) } };
  if (type === 'status') return { status: { name: String(value) } };
  if (type === 'number') {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numeric)) return { number: numeric };
  }
  throw new Error('训练计划属性类型不受支持');
};

const setIfSupported = (
  properties: Record<string, unknown>,
  schema: NotionDataSource['properties'],
  names: readonly string[],
  value: string | number | undefined,
) => {
  if (value == null || value === '') return;
  const name = findSchemaProperty(schema, names);
  if (!name) return;
  const type = schema[name].type;
  if (!type || !['title', 'rich_text', 'select', 'status', 'number'].includes(type)) return;
  properties[name] = propertyValue(type, value);
};

export const replaceTodayExercise = async (input: WorkoutReplacementInput): Promise<TodayWorkout> => {
  const token = process.env.NOTION_TOKEN;
  const trainingId = process.env.NOTION_TRAINING_DATA_SOURCE_ID;
  if (!token || !trainingId) throw new Error('Training Execution 数据源未配置');
  const [{ pages: libraryPages }, trainingSchema] = await Promise.all([
    loadLibrary(),
    retrieveDataSource(trainingId, token),
  ]);
  const dateName = findSchemaProperty(trainingSchema.properties, PROPERTY.date);
  const exerciseIdName = findSchemaProperty(trainingSchema.properties, PROPERTY.exerciseId);
  if (!dateName || !exerciseIdName) throw new Error('Training Execution 缺少日期或 Exercise ID');
  const trainingPages = await queryDataSource(trainingId, token, {
    filter: { property: dateName, date: { equals: input.date } },
  }, 100);
  const workout = joinWorkoutPages(input.date, trainingPages, libraryPages);
  const original = workout.exercises.find((exercise) => exercise.exerciseId === input.originalExerciseId);
  if (!original) throw new Error('今天的训练中不存在原动作');
  if (original.completed || original.submissionId || original.savedSets?.some((set) => set.completed) || original.savedFeedback) {
    throw new Error('已开始或已完成的动作不能替换');
  }
  if (workout.exercises.some((exercise) => exercise.exerciseId === input.replacementExerciseId)) {
    throw new Error('替代动作已在今天的训练中');
  }
  const replacementPage = libraryPages.find((page) => firstString(page.properties, PROPERTY.exerciseId) === input.replacementExerciseId);
  const replacement = replacementPage ? mapReplacementOption(replacementPage) : undefined;
  if (!replacement) throw new Error('替代动作不存在或未启用');
  if (normalized(replacement.targetMuscle) !== normalized(original.targetMuscle)) throw new Error('替代动作必须属于相同目标肌群');

  const properties: Record<string, unknown> = {
    [exerciseIdName]: propertyValue(trainingSchema.properties[exerciseIdName].type, replacement.exerciseId),
  };
  setIfSupported(properties, trainingSchema.properties, PROPERTY.name, replacement.name);
  setIfSupported(properties, trainingSchema.properties, PROPERTY.targetMuscle, replacement.targetMuscle);
  setIfSupported(properties, trainingSchema.properties, PROPERTY.planSets, replacement.planSets);
  setIfSupported(properties, trainingSchema.properties, PROPERTY.planReps, replacement.planReps);
  setIfSupported(properties, trainingSchema.properties, PROPERTY.planWeight, replacement.planWeight);
  await updatePageProperties(original.notionPageId, token, properties);
  return getTodayWorkoutFromNotion(input.date);
};
