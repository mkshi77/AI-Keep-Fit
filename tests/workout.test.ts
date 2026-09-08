import { describe, expect, it } from 'vitest';
import type { NotionPage, NotionProperty } from '../server/notion';
import { joinWorkoutPages } from '../server/workout';

const text = (value: string): NotionProperty => ({ type: 'rich_text', rich_text: [{ plain_text: value }] });
const title = (value: string): NotionProperty => ({ type: 'title', title: [{ plain_text: value }] });
const number = (value: number): NotionProperty => ({ type: 'number', number: value });

describe('Notion workout mapping', () => {
  it('joins by permanent exercise id and reads Phase 1A fields', () => {
    const training: NotionPage = { id: 'execution-1', properties: {
      Date: { type: 'date', date: { start: '2026-09-08' } }, Day: text('A'), 'Exercise ID': text('bench-press'),
      Order: number(1), 'Plan Sets': number(3), 'Plan Reps': text('8-10'), 'Plan Weight': number(42.5),
    } };
    const library: NotionPage = { id: 'library-1', properties: {
      'Exercise ID': text('bench-press'), Name: title('卧推'), 'Target Muscle': text('胸大肌'), 'Rest Seconds': number(120),
      Overview: text('动作概述'), 'Key Points': text('收紧肩胛\n稳定下放'), 'Common Mistakes': text('耸肩'), 'Warmup Advice': text('空杆热身'),
      Cover: { type: 'url', url: 'https://example.com/bench.jpg' },
    } };
    const workout = joinWorkoutPages('2026-09-08', [training], [library]);
    expect(workout.source).toBe('notion');
    expect(workout.exercises[0]).toMatchObject({ exerciseId: 'bench-press', notionPageId: 'execution-1', targetMuscle: '胸大肌', restSeconds: 120, planWeight: 42.5 });
    expect(workout.exercises[0].instructions?.keyPoints).toEqual(['收紧肩胛', '稳定下放']);
  });
});
