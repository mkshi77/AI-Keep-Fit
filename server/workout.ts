import type { TodayExercise } from '../src/domain/exercise.js';
import type { TodayWorkout } from '../src/domain/workout.js';
import { findSchemaProperty, firstBoolean, firstNumber, firstString, type NotionDataSource, type NotionPage, queryDataSource, retrieveDataSource } from './notion.js';

const PROPERTY = {
  date: ['日期', '训练日期', 'Date'], day: ['训练日', '训练日类型', '计划日', 'Day'],
  exerciseId: ['Exercise ID', '动作ID', 'exercise_id'], name: ['Name', '动作名称', '动作名', '名称', '动作'],
  order: ['顺序', 'Order'], planSets: ['计划组数', '组数', 'Plan Sets'], planReps: ['计划次数', '次数', 'Plan Reps'],
  planWeight: ['计划重量', '计划重量kg', 'Plan Weight'], baseline: ['当前基线', '基线', 'Baseline'],
  recommendation: ['Recommendation Tag', '推荐标签', '建议'], targetMuscle: ['Target Muscle', '目标肌群'],
  restSeconds: ['Rest Seconds', '休息秒数', '休息时间'], cover: ['Cover', '封面', '教学封面', '缩略图'],
  video: ['Video', '视频', '本地视频'], youtube: ['YouTube', '中文教学', 'youtube'],
  overview: ['Overview', '动作概述'], keyPoints: ['Key Points', '动作要领'], commonMistakes: ['Common Mistakes', '常见错误'],
  warmupAdvice: ['Warmup Advice', '热身建议'], status: ['Status', '库状态', 'Library Status'], enabled: ['启用', 'Enabled'],
  version: ['Version', '版本'], updatedAt: ['Updated At', '更新时间'], changeNote: ['Change Note', '变更说明'],
  retired: ['retired', 'Retired', '旧计划停用'], planStatus: ['计划状态', '训练状态', '执行状态', '状态', 'Plan Status'],
  rir: ['末组RIR', 'RIR'], asymmetry: ['左右差异', 'Asymmetry'], discomfort: ['不适0-10', '不适', 'Discomfort'],
} as const;

export const dateInTimeZone = (timeZone = process.env.APP_TIME_ZONE || 'Asia/Shanghai') => new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const filterFor = (name: string, type: string | undefined, operator: 'equals' | 'does_not_equal', value: string | boolean) => {
  if (type === 'checkbox' && typeof value === 'boolean') return { property: name, checkbox: { [operator]: value } };
  if (type === 'date' && typeof value === 'string') return { property: name, date: { [operator]: value } };
  if (type && ['select', 'status', 'rich_text', 'title'].includes(type) && typeof value === 'string') return { property: name, [type]: { [operator]: value } };
};

const trainingQuery = (schema: NotionDataSource['properties'], date: string) => {
  const filters: Record<string, unknown>[] = [];
  const dateName = findSchemaProperty(schema, PROPERTY.date);
  if (dateName) filters.push(filterFor(dateName, schema[dateName].type, 'equals', date)!);
  const retiredName = findSchemaProperty(schema, PROPERTY.retired);
  if (retiredName && schema[retiredName].type === 'checkbox') filters.push({ property: retiredName, checkbox: { equals: false } });
  const orderName = findSchemaProperty(schema, PROPERTY.order);
  return { ...(filters.length === 1 ? { filter: filters[0] } : filters.length ? { filter: { and: filters } } : {}), ...(orderName ? { sorts: [{ property: orderName, direction: 'ascending' }] } : {}) };
};

const libraryQuery = (schema: NotionDataSource['properties']) => {
  const enabledName = findSchemaProperty(schema, PROPERTY.enabled);
  return enabledName && schema[enabledName].type === 'checkbox' ? { filter: { property: enabledName, checkbox: { equals: true } } } : {};
};

const lines = (value: string) => value.split(/\r?\n|；|;/).map((item) => item.replace(/^[-•\d.、\s]+/, '').trim()).filter(Boolean);
const savedSets = (properties: NotionPage['properties'], count: number) => Array.from({ length: count }, (_, index) => {
  const number = index + 1;
  const weight = firstNumber(properties, [`第${number}组重量kg`]);
  const reps = firstNumber(properties, [`第${number}组次数`]);
  return { weight: weight == null ? '' : String(weight), reps: reps == null ? '' : String(reps), completed: weight != null || reps != null };
});

export const joinWorkoutPages = (date: string, trainingPages: NotionPage[], libraryPages: NotionPage[]): TodayWorkout => {
  const libraryById = new Map<string, NotionPage>();
  libraryPages.forEach((page) => {
    const id = firstString(page.properties, PROPERTY.exerciseId);
    const status = firstString(page.properties, PROPERTY.status).toLowerCase();
    if (id && firstBoolean(page.properties, PROPERTY.enabled) !== false && status !== 'retired' && status !== '停用') libraryById.set(id, page);
  });
  const byId = new Map<string, NotionPage>();
  trainingPages.forEach((page) => {
    const id = firstString(page.properties, PROPERTY.exerciseId);
    const pageDate = firstString(page.properties, PROPERTY.date).slice(0, 10);
    const inactive = firstBoolean(page.properties, PROPERTY.retired) || Object.values(page.properties).some((property) => JSON.stringify(property).includes('旧计划停用'));
    if (id && (!pageDate || pageDate === date) && !inactive) byId.set(id, page);
  });
  const active = [...byId.values()].sort((a, b) => (firstNumber(a.properties, PROPERTY.order) ?? 999) - (firstNumber(b.properties, PROPERTY.order) ?? 999));
  const exercises = active.flatMap<TodayExercise>((training) => {
    const exerciseId = firstString(training.properties, PROPERTY.exerciseId);
    const library = libraryById.get(exerciseId);
    if (!library) return [];
    const planSets = Math.max(1, firstNumber(training.properties, PROPERTY.planSets) ?? firstNumber(library.properties, PROPERTY.planSets) ?? 1);
    const planReps = firstString(training.properties, PROPERTY.planReps) || firstString(library.properties, PROPERTY.planReps) || '';
    const saved = savedSets(training.properties, planSets);
    const keyPoints = lines(firstString(library.properties, PROPERTY.keyPoints));
    const mistakes = lines(firstString(library.properties, PROPERTY.commonMistakes));
    return [{
      exerciseId, notionPageId: training.id,
      name: firstString(library.properties, PROPERTY.name) || firstString(training.properties, PROPERTY.name) || exerciseId,
      targetMuscle: firstString(library.properties, PROPERTY.targetMuscle) || undefined,
      planSets, planReps,
      planWeight: firstNumber(training.properties, PROPERTY.planWeight) ?? firstNumber(library.properties, PROPERTY.planWeight),
      restSeconds: firstNumber(library.properties, PROPERTY.restSeconds),
      baseline: firstString(library.properties, PROPERTY.baseline) || firstString(training.properties, PROPERTY.baseline) || undefined,
      recommendationTag: firstString(library.properties, PROPERTY.recommendation) || undefined,
      cover: firstString(library.properties, PROPERTY.cover) || undefined,
      video: firstString(library.properties, PROPERTY.video) || undefined,
      youtube: firstString(library.properties, PROPERTY.youtube) || undefined,
      status: firstString(library.properties, PROPERTY.status) || undefined,
      version: firstString(library.properties, PROPERTY.version) || undefined,
      updatedAt: firstString(library.properties, PROPERTY.updatedAt) || undefined,
      changeNote: firstString(library.properties, PROPERTY.changeNote) || undefined,
      instructions: {
        overview: firstString(library.properties, PROPERTY.overview) || undefined,
        keyPoints: keyPoints.length ? keyPoints : undefined,
        commonMistakes: mistakes.length ? mistakes : undefined,
        warmupAdvice: firstString(library.properties, PROPERTY.warmupAdvice) || undefined,
      },
      ...(saved.some((set) => set.completed) ? { savedSets: saved } : {}),
      savedFeedback: {
        rir: firstNumber(training.properties, PROPERTY.rir),
        asymmetry: firstNumber(training.properties, PROPERTY.asymmetry),
        discomfort: firstNumber(training.properties, PROPERTY.discomfort),
      },
    }];
  });
  if (active.length !== exercises.length) throw new Error('今日训练存在无法按 Exercise ID 与动作库匹配的动作');
  return { date, trainingDay: active.length ? firstString(active[0].properties, PROPERTY.day) || null : null, isRecoveryDay: active.length === 0, source: 'notion', exercises };
};

export const getTodayWorkoutFromNotion = async (date: string): Promise<TodayWorkout> => {
  const token = process.env.NOTION_TOKEN;
  const trainingId = process.env.NOTION_TRAINING_DATA_SOURCE_ID;
  const exerciseId = process.env.NOTION_EXERCISE_DATA_SOURCE_ID;
  if (!token || !trainingId || !exerciseId) return { date, trainingDay: null, isRecoveryDay: false, source: 'fallback', exercises: [], warning: 'Notion 环境变量未完整配置' };
  try {
    const [trainingSchema, librarySchema] = await Promise.all([retrieveDataSource(trainingId, token), retrieveDataSource(exerciseId, token)]);
    for (const names of [PROPERTY.date, PROPERTY.exerciseId, PROPERTY.order]) if (!findSchemaProperty(trainingSchema.properties, names)) throw new Error(`Training Execution 缺少属性: ${names[0]}`);
    if (!findSchemaProperty(librarySchema.properties, PROPERTY.exerciseId)) throw new Error('Exercise Library 缺少属性: Exercise ID');
    const [training, library] = await Promise.all([queryDataSource(trainingId, token, trainingQuery(trainingSchema.properties, date)), queryDataSource(exerciseId, token, libraryQuery(librarySchema.properties))]);
    return joinWorkoutPages(date, training, library);
  } catch (error) {
    console.error('Notion today workout failed', error);
    return { date, trainingDay: null, isRecoveryDay: false, source: 'fallback', exercises: [], warning: error instanceof Error ? error.message : 'Notion 暂时不可用' };
  }
};
