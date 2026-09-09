import type { BodyWeightCondition, BodyWeightInput, BodyWeightRecord, BodyWeightResult, HistoryPeriod } from '../src/domain/records.js';
import { createDataSourcePage, findSchemaProperty, firstNumber, firstString, type NotionDataSource, type NotionPage, queryDataSource, retrieveDataSource, updatePageProperties } from './notion.js';
import { historyCutoffDate, parseHistoryPeriod } from './records.js';

const BODY_WEIGHT_LIMIT = 1000;
const CONDITIONS: BodyWeightCondition[] = ['晨起空腹', '练后即刻', '晚间称重'];
const PROPERTY = {
  title: ['Name', '名称', '记录'],
  date: ['日期', 'Date'],
  weight: ['体重kg', 'Weight kg', '体重'],
  condition: ['称重状态', 'Condition', '状态'],
} as const;

const requiredProperty = (schema: NotionDataSource['properties'], names: readonly string[], types: string[]) => {
  const name = findSchemaProperty(schema, names);
  if (!name || !types.includes(schema[name].type ?? '')) throw new Error(`Body Weight 缺少有效属性: ${names[0]}`);
  return name;
};

export const mapBodyWeightPage = (page: NotionPage): BodyWeightRecord | undefined => {
  const date = firstString(page.properties, PROPERTY.date).slice(0, 10);
  const weightKg = firstNumber(page.properties, PROPERTY.weight);
  const condition = firstString(page.properties, PROPERTY.condition) as BodyWeightCondition;
  if (!date || weightKg == null || !CONDITIONS.includes(condition)) return undefined;
  return { id: page.id, date, weightKg, condition };
};

export const validateBodyWeightInput = (body: unknown): BodyWeightInput => {
  if (!body || typeof body !== 'object') throw new Error('请求体不能为空');
  const input = body as Partial<BodyWeightInput>;
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('日期格式无效');
  if (typeof input.weightKg !== 'number' || !Number.isFinite(input.weightKg) || input.weightKg <= 30 || input.weightKg >= 250) throw new Error('体重必须在 30-250kg 之间');
  if (!input.condition || !CONDITIONS.includes(input.condition)) throw new Error('称重状态无效');
  return input as BodyWeightInput;
};

const queryFor = (schema: NotionDataSource['properties'], period: HistoryPeriod) => {
  const dateName = requiredProperty(schema, PROPERTY.date, ['date']);
  const cutoff = historyCutoffDate(period);
  return {
    ...(cutoff ? { filter: { property: dateName, date: { on_or_after: cutoff } } } : {}),
    sorts: [{ property: dateName, direction: 'ascending' }],
  };
};

export const getBodyWeightHistory = async (periodInput?: string): Promise<BodyWeightResult> => {
  const period = parseHistoryPeriod(periodInput);
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_BODY_WEIGHT_DATA_SOURCE_ID;
  if (!token || !dataSourceId) return { period, records: [], warning: 'Body Weight 数据源未配置' };
  const schema = await retrieveDataSource(dataSourceId, token);
  requiredProperty(schema.properties, PROPERTY.weight, ['number']);
  requiredProperty(schema.properties, PROPERTY.condition, ['select', 'status', 'rich_text']);
  const pages = await queryDataSource(dataSourceId, token, queryFor(schema.properties, period), BODY_WEIGHT_LIMIT);
  return { period, records: pages.map(mapBodyWeightPage).filter((record): record is BodyWeightRecord => Boolean(record)) };
};

const propertyValue = (type: string | undefined, value: string | number) => {
  if (type === 'title') return { title: [{ text: { content: String(value) } }] };
  if (type === 'rich_text') return { rich_text: [{ text: { content: String(value) } }] };
  if (type === 'select') return { select: { name: String(value) } };
  if (type === 'status') return { status: { name: String(value) } };
  if (type === 'date') return { date: { start: String(value) } };
  if (type === 'number') return { number: value };
  throw new Error('Body Weight 属性类型不受支持');
};

export const saveBodyWeight = async (input: BodyWeightInput): Promise<BodyWeightRecord> => {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_BODY_WEIGHT_DATA_SOURCE_ID;
  if (!token || !dataSourceId) throw new Error('Body Weight 数据源未配置');
  const schema = await retrieveDataSource(dataSourceId, token);
  const titleName = requiredProperty(schema.properties, PROPERTY.title, ['title']);
  const dateName = requiredProperty(schema.properties, PROPERTY.date, ['date']);
  const weightName = requiredProperty(schema.properties, PROPERTY.weight, ['number']);
  const conditionName = requiredProperty(schema.properties, PROPERTY.condition, ['select', 'status', 'rich_text']);
  const existing = await queryDataSource(dataSourceId, token, {
    filter: { property: dateName, date: { equals: input.date } },
  }, 1);
  const properties = {
    [titleName]: propertyValue('title', `${input.date} ${input.condition}`),
    [dateName]: propertyValue('date', input.date),
    [weightName]: propertyValue('number', input.weightKg),
    [conditionName]: propertyValue(schema.properties[conditionName].type, input.condition),
  };
  const page = existing[0]
    ? await updatePageProperties(existing[0].id, token, properties) as NotionPage
    : await createDataSourcePage(dataSourceId, token, properties);
  return mapBodyWeightPage(page) ?? { id: page.id, ...input };
};
