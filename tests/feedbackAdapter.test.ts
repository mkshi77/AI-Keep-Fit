import { describe, expect, it } from 'vitest';
import { balanceDirectionFromUI, balanceDirectionToUI, exerciseFeedbackFromUI } from '../src/adapters/feedbackAdapter';

describe('feedback adapter', () => {
  it('preserves bilateral balance direction through a UI/domain round trip', () => {
    const values = ['无差异', '左侧吃力', '右侧吃力'] as const;
    for (const value of values) {
      const domain = balanceDirectionFromUI(value);
      expect(['none', 'left_weaker', 'right_weaker']).toContain(domain);
      expect(balanceDirectionToUI(domain)).toBe(value);
    }
  });

  it('does not map direction to numeric asymmetry severity', () => {
    const result = exerciseFeedbackFromUI({
      exerciseId: 'bench-press', exerciseName: '卧推', rir: 2,
      bilateralBalance: '左侧吃力', discomfortLevel: 3, note: '',
    });
    expect(result).toEqual({ rir: 2, balanceDirection: 'left_weaker', discomfort: 3 });
    expect(result).not.toHaveProperty('asymmetrySeverity');
  });
});
