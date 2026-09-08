import type {
  BalanceDirection, ExerciseFeedback, TodayExercise, TrainingDay,
  WorkoutCompletionExercise, WorkoutCompletionPayload, WorkoutCompletionResult, WorkoutCompletionStatus,
} from '../src/domain/exercise.js';
import type { TodayWorkout } from '../src/domain/workout.js';
import { findSchemaProperty, firstBoolean, firstNumber, firstProperty, firstString, propertyNumber, propertyString, type NotionDataSource, type NotionPage, queryDataSource, retrieveDataSource, updatePageProperties } from './notion.js';

const MAX_OFFICIAL_SETS = 4;

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
  completed: ['完成', 'Completed'], submissionId: ['Submission ID', '提交ID', 'submission_id'],
  rir: ['末组RIR', 'RIR'], asymmetry: ['左右差异', 'Asymmetry'],
  balanceDirection: ['左右差异方向', '差异方向', 'Balance Direction'],
  discomfort: ['不适0-10', '不适', 'Discomfort'], note: ['动作反馈备注', 'Feedback Note', '备注'],
} as const;

const BALANCE_DIRECTIONS: BalanceDirection[] = ['none', 'left_weaker', 'right_weaker'];
const BALANCE_DIRECTION_LABELS: Record<BalanceDirection, string> = {
  none: '无差异', left_weaker: '左侧吃力', right_weaker: '右侧吃力',
};
const ASYMMETRY_SEVERITY_LABELS: Record<ExerciseFeedback['asymmetrySeverity'], string> = {
  0: '0 无明显差异', 1: '1 轻微', 2: '2 明显', 3: '3 已影响动作',
};

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

const savedBalanceDirection = (value: string): BalanceDirection | undefined => {
  if (value === '无差异') return 'none';
  if (value === '左侧吃力') return 'left_weaker';
  if (value === '右侧吃力') return 'right_weaker';
  return undefined;
};

const savedAsymmetrySeverity = (properties: NotionPage['properties']): ExerciseFeedback['asymmetrySeverity'] | undefined => {
  const property = firstProperty(properties, PROPERTY.asymmetry);
  if (property?.type === 'number') return propertyNumber(property) as ExerciseFeedback['asymmetrySeverity'];
  if (property?.type === 'select' || property?.type === 'status') {
    const severity = Number.parseInt(propertyString(property), 10);
    return [0, 1, 2, 3].includes(severity) ? severity as ExerciseFeedback['asymmetrySeverity'] : undefined;
  }
  return undefined;
};

const savedFeedback = (properties: NotionPage['properties']): ExerciseFeedback => ({
  rir: firstNumber(properties, PROPERTY.rir),
  balanceDirection: savedBalanceDirection(firstString(properties, PROPERTY.balanceDirection)),
  asymmetrySeverity: savedAsymmetrySeverity(properties),
  discomfort: firstNumber(properties, PROPERTY.discomfort),
  note: firstString(properties, PROPERTY.note) || undefined,
});

const hasSavedFeedback = (feedback: ExerciseFeedback) => Object.values(feedback).some((value) => value != null && value !== '');

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
    const feedback = savedFeedback(training.properties);
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
      completed: firstBoolean(training.properties, PROPERTY.completed) ?? false,
      submissionId: firstString(training.properties, PROPERTY.submissionId) || undefined,
      ...(saved.some((set) => set.completed) ? { savedSets: saved } : {}),
      ...(hasSavedFeedback(feedback) ? { savedFeedback: feedback } : {}),
    }];
  });
  if (active.length !== exercises.length) throw new Error('今日训练存在无法按 Exercise ID 与动作库匹配的动作');
  return { date, trainingDay: active.length ? firstString(active[0].properties, PROPERTY.day) as TrainingDay || null : null, isRecoveryDay: active.length === 0, source: 'notion', exercises };
};

export const getTodayWorkoutFromNotion = async (date: string): Promise<TodayWorkout> => {
  const token = process.env.NOTION_TOKEN;
  const trainingId = process.env.NOTION_TRAINING_DATA_SOURCE_ID;
  const exerciseId = process.env.NOTION_EXERCISE_DATA_SOURCE_ID;
  if (!token || !trainingId || !exerciseId) return { date, trainingDay: null, isRecoveryDay: false, source: 'fallback', exercises: [], warning: 'Notion 环境变量未完整配置' };
  try {
    return await fetchTodayWorkoutFromNotion(date, token, trainingId, exerciseId);
  } catch (error) {
    console.error('Notion today workout failed', error);
    return { date, trainingDay: null, isRecoveryDay: false, source: 'fallback', exercises: [], warning: error instanceof Error ? error.message : 'Notion 暂时不可用' };
  }
};

const fetchTodayWorkoutFromNotion = async (date: string, token: string, trainingId: string, exerciseId: string): Promise<TodayWorkout> => {
  const [trainingSchema, librarySchema] = await Promise.all([retrieveDataSource(trainingId, token), retrieveDataSource(exerciseId, token)]);
  for (const names of [PROPERTY.date, PROPERTY.exerciseId, PROPERTY.order]) if (!findSchemaProperty(trainingSchema.properties, names)) throw new Error(`Training Execution 缺少属性: ${names[0]}`);
  if (!findSchemaProperty(librarySchema.properties, PROPERTY.exerciseId)) throw new Error('Exercise Library 缺少属性: Exercise ID');
  const [training, library] = await Promise.all([queryDataSource(trainingId, token, trainingQuery(trainingSchema.properties, date)), queryDataSource(exerciseId, token, libraryQuery(librarySchema.properties))]);
  return joinWorkoutPages(date, training, library);
};

const requiredPageProperties = (schema: NotionDataSource['properties'], names: string[]) => {
  const missing = names.filter((name) => !schema[name]);
  if (missing.length) throw new Error(`Training Execution 缺少属性: ${missing.join(', ')}`);
};

const numericValue = (value: string | undefined) => {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`无效数字: ${value}`);
  return parsed;
};

export const completionProperties = (
  sets: { weight: string; reps: string; completed: boolean }[],
  feedback: ExerciseFeedback,
  schema?: NotionDataSource['properties'],
) => {
  const officialSets = sets.slice(0, MAX_OFFICIAL_SETS);
  const properties: Record<string, unknown> = {};
  for (let index = 0; index < MAX_OFFICIAL_SETS; index += 1) {
    const set = officialSets[index];
    properties[`第${index + 1}组重量kg`] = { number: set?.completed ? numericValue(set.weight) : null };
    properties[`第${index + 1}组次数`] = { number: set?.completed ? numericValue(set.reps) : null };
  }
  properties['末组RIR'] = { number: feedback.rir ?? null };
  if (feedback.asymmetrySeverity != null) {
    const propertyName = schema ? findSchemaProperty(schema, PROPERTY.asymmetry) : undefined;
    const propertyType = propertyName && schema ? schema[propertyName]?.type : undefined;
    if (!propertyName || (propertyType !== 'select' && propertyType !== 'number')) throw new Error('Training Execution 属性 左右差异 必须为 Select 或 Number');
    if (propertyType === 'select') properties[propertyName] = { select: { name: ASYMMETRY_SEVERITY_LABELS[feedback.asymmetrySeverity] } };
    else properties[propertyName] = { number: feedback.asymmetrySeverity };
  }
  properties['不适0-10'] = { number: feedback.discomfort ?? null };
  if (feedback.balanceDirection) properties['左右差异方向'] = { select: { name: BALANCE_DIRECTION_LABELS[feedback.balanceDirection] } };
  if (feedback.note) properties['动作反馈备注'] = { rich_text: [{ text: { content: feedback.note } }] };
  return properties;
};

export const exerciseCompletionStatus = (
  sets: { weight: string; reps: string; completed: boolean }[],
  planSets: number,
): WorkoutCompletionStatus => {
  const officialSetCount = Math.min(Math.max(planSets, 1), MAX_OFFICIAL_SETS);
  const completedCount = sets.slice(0, officialSetCount).filter((set) => set.completed).length;
  if (completedCount === 0) return 'skipped';
  return completedCount >= officialSetCount ? 'completed' : 'partial';
};

export const validateCompletionPayload = (body: unknown): WorkoutCompletionPayload => {
  if (!body || typeof body !== 'object') throw new Error('请求体不能为空');
  const candidate = body as Partial<WorkoutCompletionPayload>;
  if (!candidate.date || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) throw new Error('日期格式无效');
  if (!candidate.trainingDay || !['A', 'B', 'C'].includes(candidate.trainingDay)) throw new Error('训练日必须是 A、B 或 C');
  if (typeof candidate.submissionId !== 'string' || candidate.submissionId.length === 0 || candidate.submissionId.length > 100) throw new Error('提交 ID 无效');
  if (candidate.durationMinutes != null && (!Number.isInteger(candidate.durationMinutes) || candidate.durationMinutes < 0 || candidate.durationMinutes > 1440)) throw new Error('训练时长无效');
  if (!Array.isArray(candidate.exercises) || candidate.exercises.length === 0) throw new Error('至少提交一个动作');
  if (!candidate.exercises.some((exercise) => Array.isArray(exercise.sets) && exercise.sets.some((set) => set?.completed))) throw new Error('至少完成一组才能提交');
  const seenPages = new Set<string>();
  candidate.exercises.forEach((exercise) => {
    if (!exercise || typeof exercise !== 'object') throw new Error('动作提交数据不完整');
    const item = exercise as WorkoutCompletionExercise;
    if (!item.exerciseId || !item.notionPageId || !Array.isArray(item.sets) || !item.feedback || typeof item.feedback !== 'object') throw new Error('动作提交数据不完整');
    if (seenPages.has(item.notionPageId)) throw new Error('动作提交数据重复');
    seenPages.add(item.notionPageId);
    item.sets.forEach((set) => {
      if (!set || typeof set !== 'object' || typeof set.weight !== 'string' || typeof set.reps !== 'string' || typeof set.completed !== 'boolean') throw new Error('组数据格式无效');
      if (set.weight.length > 20 || set.reps.length > 20) throw new Error('组数据长度超出限制');
      if (set.completed) {
        const weight = numericValue(set.weight);
        const reps = numericValue(set.reps);
        if (weight == null) throw new Error('完成组必须包含有效重量');
        if (reps == null || reps <= 0 || !Number.isInteger(reps)) throw new Error('完成组必须包含有效次数');
      }
    });
    if (item.feedback.rir != null && (item.feedback.rir < 0 || item.feedback.rir > 10)) throw new Error('RIR 超出范围');
    if (item.feedback.balanceDirection && !BALANCE_DIRECTIONS.includes(item.feedback.balanceDirection)) throw new Error('左右差异方向无效');
    if (item.feedback.asymmetrySeverity != null && ![0, 1, 2, 3].includes(item.feedback.asymmetrySeverity)) throw new Error('左右差异程度超出范围');
    if (item.feedback.discomfort != null && (item.feedback.discomfort < 0 || item.feedback.discomfort > 10)) throw new Error('不适评分超出范围');
    if (item.feedback.note != null && (typeof item.feedback.note !== 'string' || item.feedback.note.length > 500)) throw new Error('动作反馈备注超出长度');
  });
  return candidate as WorkoutCompletionPayload;
};

export const completeWorkoutInNotion = async (payload: WorkoutCompletionPayload): Promise<WorkoutCompletionResult> => {
  const token = process.env.NOTION_TOKEN;
  const trainingId = process.env.NOTION_TRAINING_DATA_SOURCE_ID;
  const exerciseId = process.env.NOTION_EXERCISE_DATA_SOURCE_ID;
  if (!token || !trainingId || !exerciseId) throw new Error('NOTION_TOKEN 未配置，训练草稿尚未正式写入');
  const [schema, today] = await Promise.all([
    retrieveDataSource(trainingId, token),
    fetchTodayWorkoutFromNotion(payload.date, token, trainingId, exerciseId),
  ]);
  if (today.source !== 'notion') throw new Error('Notion 今日计划不可用，无法安全写回');
  const submissionPropertyName = findSchemaProperty(schema.properties, PROPERTY.submissionId);
  const submissionProperty = submissionPropertyName ? schema.properties[submissionPropertyName] : undefined;
  if (!submissionPropertyName || !submissionProperty || submissionProperty.type !== 'rich_text') throw new Error('Training Execution 属性 Submission ID 必须为 Rich Text');
  const requiredProperties = [
    '第1组重量kg', '第1组次数', '第2组重量kg', '第2组次数', '第3组重量kg', '第3组次数', '第4组重量kg', '第4组次数',
    '末组RIR', '不适0-10', '完成', 'Submission ID',
  ];
  if (payload.exercises.some((exercise) => exercise.feedback.asymmetrySeverity != null)) requiredProperties.push('左右差异');
  if (payload.exercises.some((exercise) => exercise.feedback.balanceDirection)) requiredProperties.push('左右差异方向');
  if (payload.exercises.some((exercise) => exercise.feedback.note)) requiredProperties.push('动作反馈备注');
  requiredPageProperties(schema.properties, requiredProperties);
  if (payload.exercises.some((exercise) => exercise.feedback.asymmetrySeverity != null)) {
    const asymmetryPropertyName = findSchemaProperty(schema.properties, PROPERTY.asymmetry);
    const asymmetryPropertyType = asymmetryPropertyName ? schema.properties[asymmetryPropertyName]?.type : undefined;
    if (asymmetryPropertyType !== 'select' && asymmetryPropertyType !== 'number') throw new Error('Training Execution 属性 左右差异 必须为 Select 或 Number');
  }
  const todayByPage = new Map(today.exercises.map((exercise) => [exercise.notionPageId, exercise]));
  const statuses: Array<{ exerciseId: string; notionPageId: string; status: WorkoutCompletionStatus }> = [];
  const priorCompletedStatuses: typeof statuses = [];
  for (const exercise of payload.exercises) {
    const planned = todayByPage.get(exercise.notionPageId);
    if (planned?.exerciseId !== exercise.exerciseId) throw new Error(`动作 ${exercise.exerciseId} 不属于今日有效计划`);
    if (payload.submissionId && planned.submissionId === payload.submissionId && planned.completed) {
      priorCompletedStatuses.push({ exerciseId: exercise.exerciseId, notionPageId: exercise.notionPageId, status: 'completed' });
      continue;
    }
    statuses.push({ exerciseId: exercise.exerciseId, notionPageId: exercise.notionPageId, status: exerciseCompletionStatus(exercise.sets, planned.planSets) });
  }
  if (!statuses.length) {
    return { success: true, updated: 0, submissionId: payload.submissionId, workoutCompleted: today.exercises.every((exercise) => exercise.completed), exercises: [] };
  }
  await Promise.all(statuses.map((status) => {
    const exercise = payload.exercises.find((item) => item.notionPageId === status.notionPageId)!;
    return updatePageProperties(status.notionPageId, token, completionProperties(exercise.sets, exercise.feedback, schema.properties));
  }));
  await Promise.all(statuses.map((status) => {
    const properties: Record<string, unknown> = { 完成: { checkbox: status.status === 'completed' } };
    if (submissionPropertyName && payload.submissionId && submissionProperty?.type === 'rich_text') properties[submissionPropertyName] = { rich_text: [{ text: { content: payload.submissionId } }] };
    return updatePageProperties(status.notionPageId, token, properties);
  }));
  const finalStatuses = [...priorCompletedStatuses, ...statuses];
  const workoutCompleted = finalStatuses.length === today.exercises.length && finalStatuses.every((status) => status.status === 'completed');
  return { success: true, updated: statuses.length, submissionId: payload.submissionId, workoutCompleted, exercises: statuses };
};
