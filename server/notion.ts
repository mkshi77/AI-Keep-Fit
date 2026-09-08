const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';

export interface NotionProperty { type?: string; [key: string]: unknown }
export interface NotionPage { id: string; created_time?: string; properties: Record<string, NotionProperty> }
export interface NotionDataSource { properties: Record<string, { id?: string; type?: string }> }

const request = async <T>(path: string, token: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === 'object' && 'message' in body ? String(body.message) : `Notion API 请求失败 (${response.status})`);
  return body as T;
};

export const retrieveDataSource = (id: string, token: string) => request<NotionDataSource>(`/data_sources/${id}`, token);
export const queryDataSource = async (id: string, token: string, body: Record<string, unknown>) => {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const result = await request<{ results: NotionPage[]; has_more?: boolean; next_cursor?: string }>(`/data_sources/${id}/query`, token, {
      method: 'POST', body: JSON.stringify({ ...body, ...(cursor ? { start_cursor: cursor } : {}), page_size: 100 }),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return pages;
};

const text = (value: unknown): string => Array.isArray(value) ? value.map((item) => item && typeof item === 'object' && 'plain_text' in item ? String(item.plain_text ?? '') : '').join('') : '';
export const propertyString = (property?: NotionProperty): string => {
  if (!property?.type) return '';
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') return text(value);
  if ((property.type === 'select' || property.type === 'status') && value && typeof value === 'object' && 'name' in value) return String(value.name ?? '');
  if (property.type === 'url' || property.type === 'string' || property.type === 'number') return String(value ?? '');
  if (property.type === 'date' && value && typeof value === 'object' && 'start' in value) return String(value.start ?? '');
  if (property.type === 'relation' && Array.isArray(value)) return value.map((item) => item && typeof item === 'object' && 'id' in item ? String(item.id) : '').filter(Boolean).join(',');
  if (property.type === 'files' && Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object' && 'external' in first && first.external && typeof first.external === 'object' && 'url' in first.external) return String(first.external.url);
    if (first && typeof first === 'object' && 'file' in first && first.file && typeof first.file === 'object' && 'url' in first.file) return String(first.file.url);
  }
  if (property.type === 'formula' && value && typeof value === 'object' && 'type' in value) return propertyString(value as NotionProperty);
  if (property.type === 'rollup' && value && typeof value === 'object') {
    if ('number' in value) return value.number == null ? '' : String(value.number);
    if ('array' in value && Array.isArray(value.array)) return value.array.map((item) => propertyString(item as NotionProperty)).join(',');
  }
  return '';
};
export const propertyNumber = (property?: NotionProperty) => { const value = Number.parseFloat(propertyString(property)); return Number.isFinite(value) ? value : undefined; };
export const propertyBoolean = (property?: NotionProperty) => property?.type === 'checkbox' ? Boolean(property.checkbox) : undefined;
export const firstProperty = (properties: Record<string, NotionProperty>, names: readonly string[]) => names.map((name) => properties[name]).find(Boolean);
export const firstString = (properties: Record<string, NotionProperty>, names: readonly string[]) => propertyString(firstProperty(properties, names)).trim();
export const firstNumber = (properties: Record<string, NotionProperty>, names: readonly string[]) => propertyNumber(firstProperty(properties, names));
export const firstBoolean = (properties: Record<string, NotionProperty>, names: readonly string[]) => propertyBoolean(firstProperty(properties, names));
export const findSchemaProperty = (schema: NotionDataSource['properties'], names: readonly string[]) => names.find((name) => schema[name]);
