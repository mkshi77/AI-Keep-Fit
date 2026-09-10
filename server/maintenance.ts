import { GoogleGenAI } from '@google/genai';
import type { WorkoutReviewRequest, WorkoutReviewResult, WorkoutMaintenanceResult } from '../src/domain/maintenance.js';
import { getWorkoutHistory } from './records.js';
import { coachModel } from './coach.js';

const MAX_REVIEW_EXERCISES = 20;
const MAX_ACTIONS = 3;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const boundedText = (value: unknown, label: string, max = 500) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label}格式无效`);
  return value.trim();
};
const boundedNumber = (value: unknown, label: string, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}格式无效`);
  return value;
};

export const buildWorkoutMaintenance = (
  date: string,
  sessions: Awaited<ReturnType<typeof getWorkoutHistory>>,
): WorkoutMaintenanceResult => {
  const current = new Date(`${date}T12:00:00Z`);
  const monday = addDays(current, -((current.getUTCDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  const byDate = new Map(sessions.map((session) => [session.date, session]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const dayDate = isoDate(addDays(monday, index));
    const session = byDate.get(dayDate);
    return {
      date: dayDate,
      dayLabel: ['一', '二', '三', '四', '五', '六', '日'][index],
      isToday: dayDate === date,
      planned: Boolean(session?.plannedSets),
      completed: Boolean(session?.completedSets),
    };
  });
  const prior = sessions
    .filter((session) => session.date < date && session.completedSets > 0)
    .sort((left, right) => right.date.localeCompare(left.date))[0];
  const insight = prior ? {
    title: `基于 ${prior.date.slice(5).replace('-', '/')} 的训练记录`,
    summary: `上次完成 ${prior.completedSets}/${prior.plannedSets} 组，训练容量 ${Math.round(prior.totalVolume).toLocaleString()} kg。`,
    focus: prior.completionRate < 1
      ? '本次优先稳定完成计划组数，再考虑增加负荷。'
      : '本次先保持动作质量和既定节奏，再根据实际 RIR 调整。',
  } : undefined;
  const weekSessions = sessions.filter((session) => session.date >= isoDate(monday) && session.date <= isoDate(sunday));
  return {
    date,
    weekly: {
      plannedSessions: weekSessions.filter((session) => session.plannedSets > 0).length,
      completedSessions: weekSessions.filter((session) => session.completedSets > 0).length,
      days,
    },
    insight,
  };
};

export const getWorkoutMaintenance = async (date: string) => buildWorkoutMaintenance(date, await getWorkoutHistory('30d'));

export const validateWorkoutReviewRequest = (body: unknown): WorkoutReviewRequest => {
  if (!body || typeof body !== 'object') throw new Error('训练复盘数据不能为空');
  const value = body as Record<string, unknown>;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) throw new Error('训练日期格式无效');
  if (value.trainingDay !== 'A' && value.trainingDay !== 'B' && value.trainingDay !== 'C') throw new Error('训练日格式无效');
  if (!Array.isArray(value.exercises) || value.exercises.length === 0 || value.exercises.length > MAX_REVIEW_EXERCISES) throw new Error('训练动作格式无效');
  const exercises = value.exercises.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('训练动作格式无效');
    const exercise = item as Record<string, unknown>;
    return {
      exerciseId: boundedText(exercise.exerciseId, '动作 ID', 120),
      exerciseName: boundedText(exercise.exerciseName, '动作名称', 120),
      completedSets: boundedNumber(exercise.completedSets, '完成组数', 0, 20),
      plannedSets: boundedNumber(exercise.plannedSets, '计划组数', 1, 20),
      ...(exercise.rir == null ? {} : { rir: boundedNumber(exercise.rir, 'RIR', 0, 10) }),
      ...(exercise.discomfort == null ? {} : { discomfort: boundedNumber(exercise.discomfort, '不适评分', 0, 10) }),
    };
  });
  const result: WorkoutReviewRequest = {
    date: value.date,
    trainingDay: value.trainingDay,
    durationMinutes: boundedNumber(value.durationMinutes, '训练时长', 0, 1440),
    completedSets: boundedNumber(value.completedSets, '完成组数', 1, 400),
    plannedSets: boundedNumber(value.plannedSets, '计划组数', 1, 400),
    totalVolume: boundedNumber(value.totalVolume, '训练容量', 0, 10_000_000),
    exercises,
  };
  if (result.completedSets > result.plannedSets || exercises.reduce((sum, item) => sum + item.completedSets, 0) !== result.completedSets) {
    throw new Error('训练组数不一致');
  }
  return result;
};

export const parseWorkoutReviewResponse = (text: string): Omit<WorkoutReviewResult, 'source'> => {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('AI 训练复盘格式无效'); }
  if (!value || typeof value !== 'object') throw new Error('AI 训练复盘格式无效');
  const result = value as Record<string, unknown>;
  if (!result.futurePlan || typeof result.futurePlan !== 'object') throw new Error('AI 下次计划格式无效');
  const plan = result.futurePlan as Record<string, unknown>;
  if (!Array.isArray(plan.actions) || plan.actions.length === 0 || plan.actions.length > MAX_ACTIONS) throw new Error('AI 下次计划格式无效');
  return {
    review: boundedText(result.review, 'AI 训练复盘', 800),
    futurePlan: {
      title: boundedText(plan.title, 'AI 下次计划标题', 120),
      actions: plan.actions.map((action) => boundedText(action, 'AI 下次计划动作', 200)),
      ...(plan.caution == null ? {} : { caution: boundedText(plan.caution, 'AI 风险提示', 300) }),
    },
  };
};

export const generateWorkoutReview = async (input: WorkoutReviewRequest): Promise<WorkoutReviewResult> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('AI 训练复盘未配置');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: coachModel(),
    contents: [{ role: 'user', parts: [{ text: '请基于提供的数据生成训练复盘与下次训练建议。' }] }],
    config: {
      systemInstruction: `你是 Keep Fit 的训练复盘教练。只使用以下规范化训练数据，不得臆造重量、次数、RIR、伤情或训练记录：${JSON.stringify(input)}。复盘简洁、数据驱动。未来计划只提供 1-3 条建议，不自动修改训练计划，不作医疗诊断；出现较高不适时建议停止相关动作并寻求专业帮助。`,
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object', additionalProperties: false, required: ['review', 'futurePlan'],
        properties: {
          review: { type: 'string' },
          futurePlan: {
            type: 'object', additionalProperties: false, required: ['title', 'actions'],
            properties: {
              title: { type: 'string' },
              actions: { type: 'array', minItems: 1, maxItems: MAX_ACTIONS, items: { type: 'string' } },
              caution: { type: 'string' },
            },
          },
        },
      },
    },
  });
  if (!response.text) throw new Error('AI 未返回训练复盘');
  return { ...parseWorkoutReviewResponse(response.text), source: 'gemini' };
};
