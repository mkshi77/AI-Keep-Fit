import { GoogleGenAI } from '@google/genai';
import type {
  CoachFeedbackProposal,
  CoachHistoryMessage,
  CoachRequest,
  CoachResponse,
  CoachWorkoutContext,
} from '../src/domain/coach.js';
import { getBodyFeedbackHistory, getWorkoutHistory } from './records.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 8;

const cleanText = (value: unknown, label: string, max = MAX_MESSAGE_LENGTH, required = true) => {
  if (value == null && !required) return undefined;
  if (typeof value !== 'string') throw new Error(`${label}格式无效`);
  const text = value.trim();
  if ((required && !text) || text.length > max) throw new Error(`${label}格式无效`);
  return text || undefined;
};

const finiteNumber = (value: unknown, label: string, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}格式无效`);
  }
  return value;
};

const validateContext = (value: unknown): CoachWorkoutContext | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'object') throw new Error('训练上下文格式无效');
  const context = value as Record<string, unknown>;
  return {
    exerciseId: cleanText(context.exerciseId, '动作 ID', 120, false),
    exerciseName: cleanText(context.exerciseName, '动作名称', 120, false),
    completedSets: finiteNumber(context.completedSets, '已完成组数', 0, 100),
    plannedSets: finiteNumber(context.plannedSets, '计划组数', 0, 100),
    ...(context.weight == null ? {} : { weight: finiteNumber(context.weight, '训练重量', 0, 1000) }),
    targetReps: cleanText(context.targetReps, '目标次数', 40, false),
  };
};

export const validateCoachRequest = (body: unknown): CoachRequest => {
  if (!body || typeof body !== 'object') throw new Error('请求体不能为空');
  const input = body as Record<string, unknown>;
  const history = Array.isArray(input.history) ? input.history.slice(-MAX_HISTORY_MESSAGES).map<CoachHistoryMessage>((item) => {
    if (!item || typeof item !== 'object') throw new Error('对话历史格式无效');
    const message = item as Record<string, unknown>;
    const role = message.role;
    if (role !== 'user' && role !== 'assistant') throw new Error('对话角色格式无效');
    return { role, text: cleanText(message.text, '对话内容')! };
  }) : [];
  return {
    message: cleanText(input.message, '消息')!,
    history,
    context: validateContext(input.context),
  };
};

const validateProposal = (value: unknown): CoachFeedbackProposal | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'object') throw new Error('AI 返回的身体反馈格式无效');
  const proposal = value as Record<string, unknown>;
  return {
    exerciseId: cleanText(proposal.exerciseId, 'AI 动作 ID', 120, false),
    exerciseName: cleanText(proposal.exerciseName, 'AI 动作名称', 120, false),
    bodyPart: cleanText(proposal.bodyPart, 'AI 身体部位', 120)!,
    score: finiteNumber(proposal.score, 'AI 不适评分', 0, 10),
    note: cleanText(proposal.note, 'AI 反馈备注')!,
  };
};

export const parseCoachResponse = (value: string): CoachResponse => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('AI 返回格式无效');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('AI 返回格式无效');
  const result = parsed as Record<string, unknown>;
  return {
    reply: cleanText(result.reply, 'AI 回复')!,
    proposedFeedback: validateProposal(result.proposedFeedback),
  };
};

export const buildCoachInstruction = (
  context: CoachWorkoutContext | undefined,
  recentHistory: Awaited<ReturnType<typeof getWorkoutHistory>>,
  recentFeedback: Awaited<ReturnType<typeof getBodyFeedbackHistory>>['records'],
) => `你是「Keep Fit AI 教练」，提供简洁、安全、可执行的力量训练建议。
用中文回答，通常 1-3 句话。不得诊断疾病；出现刺痛、麻木、眩晕、胸痛或症状加重时，明确建议立即停止训练并寻求专业医疗帮助。
只使用下面提供的规范化数据，不得臆造训练记录、重量、RIR、动作或身体反馈。
如果用户明确报告身体不适，可附 proposedFeedback；否则必须省略该字段。score 必须是 0-10 数字。
当前训练上下文：${JSON.stringify(context ?? null)}
最近 7 天训练：${JSON.stringify(recentHistory.slice(-7))}
最近身体反馈：${JSON.stringify(recentFeedback.slice(-10))}`;

export const generateCoachResponse = async (input: CoachRequest): Promise<CoachResponse> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('AI Coach 未配置');
  const [recentHistory, bodyFeedback] = await Promise.all([
    getWorkoutHistory('7d'),
    getBodyFeedbackHistory(),
  ]);
  const ai = new GoogleGenAI({ apiKey });
  const contents = [
    ...input.history.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.text }],
    })),
    { role: 'user', parts: [{ text: input.message }] },
  ];
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: buildCoachInstruction(input.context, recentHistory, bodyFeedback.records),
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['reply'],
        properties: {
          reply: { type: 'string' },
          proposedFeedback: {
            type: 'object',
            additionalProperties: false,
            required: ['bodyPart', 'score', 'note'],
            properties: {
              exerciseId: { type: 'string' },
              exerciseName: { type: 'string' },
              bodyPart: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 10 },
              note: { type: 'string' },
            },
          },
        },
      },
    },
  });
  if (!response.text) throw new Error('AI 未返回内容');
  return parseCoachResponse(response.text);
};
