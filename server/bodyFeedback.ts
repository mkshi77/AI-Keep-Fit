import type { BodyFeedbackHistoryRecord, BodyFeedbackInput } from '../src/domain/records.js';
import {
  createDataSourcePage,
  findSchemaProperty,
  retrieveDataSource,
  type NotionDataSource,
} from './notion.js';
import { mapBodyFeedbackPage } from './records.js';

const PROPERTY = {
  title: ['Name', '名称', '记录'],
  date: ['日期', 'Date'],
  exerciseId: ['Exercise ID', '动作ID', 'exercise_id'],
  exerciseName: ['动作名称', '动作名'],
  bodyPart: ['部位', 'Body Part'],
  description: ['描述', 'Description'],
  score: ['评分', 'Score'],
  type: ['类型', 'Type'],
  summary: ['AI结构化总结', 'AI Summary'],
} as const;

const requiredProperty = (
  schema: NotionDataSource['properties'],
  names: readonly string[],
  types: string[],
) => {
  const name = findSchemaProperty(schema, names);
  if (!name || !types.includes(schema[name].type ?? '')) {
    throw new Error(`Body Feedback 缺少有效属性: ${names[0]}`);
  }
  return name;
};

const optionalProperty = (
  schema: NotionDataSource['properties'],
  names: readonly string[],
  types: string[],
) => {
  const name = findSchemaProperty(schema, names);
  return name && types.includes(schema[name].type ?? '') ? name : undefined;
};

const propertyValue = (type: string | undefined, value: string | number) => {
  if (type === 'title') return { title: [{ text: { content: String(value) } }] };
  if (type === 'rich_text') return { rich_text: [{ text: { content: String(value) } }] };
  if (type === 'select') return { select: { name: String(value) } };
  if (type === 'status') return { status: { name: String(value) } };
  if (type === 'date') return { date: { start: String(value) } };
  if (type === 'number') return { number: value };
  throw new Error('Body Feedback 属性类型不受支持');
};

const boundedText = (value: unknown, label: string, max: number, required = true) => {
  if (value == null && !required) return undefined;
  if (typeof value !== 'string') throw new Error(`${label}格式无效`);
  const text = value.trim();
  if ((required && !text) || text.length > max) throw new Error(`${label}格式无效`);
  return text || undefined;
};

export const validateBodyFeedbackInput = (body: unknown): BodyFeedbackInput => {
  if (!body || typeof body !== 'object') throw new Error('请求体不能为空');
  const input = body as Record<string, unknown>;
  const date = boundedText(input.date, '日期', 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式无效');
  const score = input.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error('不适评分必须在 0-10 之间');
  }
  return {
    date,
    exerciseId: boundedText(input.exerciseId, '动作 ID', 120, false),
    exerciseName: boundedText(input.exerciseName, '动作名称', 120, false),
    bodyPart: boundedText(input.bodyPart, '身体部位', 120)!,
    description: boundedText(input.description, '描述', 1000)!,
    score,
    type: boundedText(input.type, '反馈类型', 80, false),
    summary: boundedText(input.summary, 'AI 总结', 1000, false),
  };
};

export const saveBodyFeedback = async (input: BodyFeedbackInput): Promise<BodyFeedbackHistoryRecord> => {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_BODY_FEEDBACK_DATA_SOURCE_ID;
  if (!token || !dataSourceId) throw new Error('Body Feedback 数据源未配置');

  const schema = await retrieveDataSource(dataSourceId, token);
  const titleName = requiredProperty(schema.properties, PROPERTY.title, ['title']);
  const dateName = requiredProperty(schema.properties, PROPERTY.date, ['date']);
  const bodyPartName = requiredProperty(schema.properties, PROPERTY.bodyPart, ['rich_text', 'title']);
  const descriptionName = requiredProperty(schema.properties, PROPERTY.description, ['rich_text', 'title']);
  const scoreName = requiredProperty(schema.properties, PROPERTY.score, ['number']);
  const exerciseIdName = optionalProperty(schema.properties, PROPERTY.exerciseId, ['rich_text', 'title']);
  const exerciseNameName = optionalProperty(schema.properties, PROPERTY.exerciseName, ['rich_text', 'title']);
  const typeName = optionalProperty(schema.properties, PROPERTY.type, ['select', 'status', 'rich_text']);
  const summaryName = optionalProperty(schema.properties, PROPERTY.summary, ['rich_text', 'title']);

  const properties: Record<string, unknown> = {
    [titleName]: propertyValue('title', `${input.date} ${input.bodyPart}`),
    [dateName]: propertyValue('date', input.date),
    [bodyPartName]: propertyValue(schema.properties[bodyPartName].type, input.bodyPart),
    [descriptionName]: propertyValue(schema.properties[descriptionName].type, input.description),
    [scoreName]: propertyValue('number', input.score),
  };
  if (exerciseIdName && input.exerciseId) properties[exerciseIdName] = propertyValue(schema.properties[exerciseIdName].type, input.exerciseId);
  if (exerciseNameName && input.exerciseName) properties[exerciseNameName] = propertyValue(schema.properties[exerciseNameName].type, input.exerciseName);
  if (typeName && input.type) properties[typeName] = propertyValue(schema.properties[typeName].type, input.type);
  if (summaryName && input.summary) properties[summaryName] = propertyValue(schema.properties[summaryName].type, input.summary);

  const page = await createDataSourcePage(dataSourceId, token, properties);
  return mapBodyFeedbackPage(page) ?? { id: page.id, ...input };
};
