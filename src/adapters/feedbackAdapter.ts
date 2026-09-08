import type { BalanceDirection, ExerciseFeedback } from '../domain/exercise';
import type { ExerciseFeedbackData } from '../types';

export const balanceDirectionFromUI = (value: ExerciseFeedbackData['bilateralBalance']): BalanceDirection => {
  if (value === '左侧吃力') return 'left_weaker';
  if (value === '右侧吃力') return 'right_weaker';
  return 'none';
};

export const balanceDirectionToUI = (value?: BalanceDirection): ExerciseFeedbackData['bilateralBalance'] | undefined => {
  if (value === 'left_weaker') return '左侧吃力';
  if (value === 'right_weaker') return '右侧吃力';
  if (value === 'none') return '无差异';
  return undefined;
};

export const exerciseFeedbackFromUI = (feedback: ExerciseFeedbackData): ExerciseFeedback => ({
  rir: feedback.rir,
  balanceDirection: balanceDirectionFromUI(feedback.bilateralBalance),
  discomfort: feedback.discomfortLevel,
  note: feedback.note || undefined,
});
