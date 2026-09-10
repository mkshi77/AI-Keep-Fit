import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotionPage } from '../server/notion';

const notion = vi.hoisted(() => ({
  retrieveDataSource: vi.fn(),
  queryDataSource: vi.fn(),
  createDataSourcePage: vi.fn(),
  updatePageProperties: vi.fn(),
}));

vi.mock('../server/notion', async (importOriginal) => ({
  ...await importOriginal<typeof import('../server/notion')>(),
  ...notion,
}));

import { getBodyWeightHistory, mapBodyWeightPage, saveBodyWeight, validateBodyWeightInput } from '../server/bodyWeight';

const page = (id = 'weight-1', weight = 74.2): NotionPage => ({
  id,
  properties: {
    日期: { type: 'date', date: { start: '2026-09-09' } },
    体重kg: { type: 'number', number: weight },
    称重状态: { type: 'select', select: { name: '晨起空腹' } },
  },
});

const schema = { properties: {
  Name: { type: 'title' }, 日期: { type: 'date' }, 体重kg: { type: 'number' }, 称重状态: { type: 'select' },
} };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('body weight records', () => {
  it('maps and validates the dedicated body weight domain', () => {
    expect(mapBodyWeightPage(page())).toEqual({ id: 'weight-1', date: '2026-09-09', weightKg: 74.2, condition: '晨起空腹' });
    expect(validateBodyWeightInput({ date: '2026-09-09', weightKg: 74.2, condition: '晨起空腹' })).toMatchObject({ weightKg: 74.2 });
    expect(() => validateBodyWeightInput({ date: '2026-09-09', weightKg: 10, condition: '晨起空腹' })).toThrow('30-250kg');
  });

  it('returns an explicit empty state when the source is unconfigured', async () => {
    vi.stubEnv('NOTION_TOKEN', 'token');
    await expect(getBodyWeightHistory('30d')).resolves.toEqual({ period: '30d', records: [], warning: 'Body Weight 数据源未配置' });
  });

  it('creates a record when no same-day measurement exists', async () => {
    vi.stubEnv('NOTION_TOKEN', 'token');
    vi.stubEnv('NOTION_BODY_WEIGHT_DATA_SOURCE_ID', 'weights');
    notion.retrieveDataSource.mockResolvedValue(schema);
    notion.queryDataSource.mockResolvedValue([]);
    notion.createDataSourcePage.mockResolvedValue(page());
    await expect(saveBodyWeight({ date: '2026-09-09', weightKg: 74.2, condition: '晨起空腹' })).resolves.toMatchObject({ id: 'weight-1', weightKg: 74.2 });
    expect(notion.createDataSourcePage).toHaveBeenCalledOnce();
    expect(notion.updatePageProperties).not.toHaveBeenCalled();
  });

  it('updates the existing same-day measurement instead of duplicating it', async () => {
    vi.stubEnv('NOTION_TOKEN', 'token');
    vi.stubEnv('NOTION_BODY_WEIGHT_DATA_SOURCE_ID', 'weights');
    notion.retrieveDataSource.mockResolvedValue(schema);
    notion.queryDataSource.mockResolvedValue([page()]);
    notion.updatePageProperties.mockResolvedValue(page('weight-1', 74.0));
    await expect(saveBodyWeight({ date: '2026-09-09', weightKg: 74.0, condition: '晨起空腹' })).resolves.toMatchObject({ id: 'weight-1', weightKg: 74.0 });
    expect(notion.updatePageProperties).toHaveBeenCalledOnce();
    expect(notion.createDataSourcePage).not.toHaveBeenCalled();
  });
});
