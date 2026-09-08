import React, { useState } from 'react';
import { Exercise, ExerciseFeedbackData } from '../types';
import type { WorkoutDraftFeedback } from '../state/workoutDraft';

interface ExerciseFeedbackViewProps {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises: number;
  initialFeedback?: WorkoutDraftFeedback;
  onSaveFeedbackAndNext: (feedback: ExerciseFeedbackData) => void;
  onGoBackToSets: () => void;
  onExitEarly: () => void;
  onAskCoachWithDiscomfort: (discomfort: { exercise: string; level: number; note: string }) => void;
}

export const ExerciseFeedbackView: React.FC<ExerciseFeedbackViewProps> = ({
  exercise,
  exerciseIndex,
  totalExercises,
  initialFeedback,
  onSaveFeedbackAndNext,
  onGoBackToSets,
  onExitEarly,
  onAskCoachWithDiscomfort,
}) => {
  const [selectedRIR, setSelectedRIR] = useState<number>(initialFeedback?.rir ?? 2);
  const [selectedBalance, setSelectedBalance] = useState<'无差异' | '左侧吃力' | '右侧吃力'>(initialFeedback?.bilateralBalance ?? '无差异');
  const [discomfortScore, setDiscomfortScore] = useState<number>(initialFeedback?.discomfortLevel ?? 0);
  const [noteText, setNoteText] = useState<string>(initialFeedback?.note ?? '');

  const rirDescriptions: Record<number, string> = {
    0: '达到力竭，肌肉神经募集度极高，注意组间及训练后恢复',
    1: '还可做 1 次标准动作，处于高强度有效刺激区间',
    2: '还可做 2 次标准动作，处于超量恢复黄金刺激区间',
    3: '还可做 3 次，负荷偏轻，下次建议考虑微增重量',
    4: '还可做 4 次以上，负荷明显不足，下次建议加大重量',
  };

  const getDiscomfortLabel = (score: number) => {
    if (score === 0) return '0（无不适）';
    if (score <= 3) return `${score}（轻微酸胀）`;
    if (score <= 6) return `${score}（中度不适）`;
    return `${score}（显著疼痛）`;
  };

  // Calculate total tonnage
  const totalTonnage = exercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const handleSubmit = () => {
    onSaveFeedbackAndNext({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rir: selectedRIR,
      bilateralBalance: selectedBalance,
      discomfortLevel: discomfortScore,
      note: noteText,
    });
  };

  const isLastExercise = exerciseIndex >= totalExercises - 1;

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden select-none">
      {/* Navigation Header */}
      <header className="px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              动作完成 <span className="text-[#A4FF4F] font-bold">✓</span>
            </span>
          </div>
          <span className="text-xs text-neutral-400 mt-0.5">
            {exercise.name} · {exercise.sets.length} / {exercise.sets.length} 组完成
          </span>
        </div>
        <button
          onClick={onExitEarly}
          className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
          type="button"
        >
          退出
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full px-5 pb-2">
        <div className="w-full bg-neutral-800 h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-[#A4FF4F] h-full rounded-full transition-all duration-300"
            style={{ width: `${((exerciseIndex + 1) / totalExercises) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-4 no-scrollbar">
        {/* Exercise Recap Card */}
        <section className="flex items-center justify-between bg-[#141416] p-3.5 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/10 relative">
              <img
                alt={exercise.name}
                className="w-full h-full object-cover brightness-[0.75]"
                src={exercise.image}
              />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                  {exercise.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A4FF4F]/10 text-[#A4FF4F] border border-[#A4FF4F]/20">
                  已达成
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 tabular-nums">
                总负荷: {totalTonnage > 0 ? totalTonnage.toLocaleString() : '1,320'} kg · {exercise.sets.length} 组均已达标
              </p>
            </div>
          </div>
          <div className="flex items-center text-neutral-500 text-xs">
            <span className="text-[#A4FF4F] font-mono font-bold text-sm">{exercise.sets.length}</span>
            <span className="text-neutral-500">/{exercise.sets.length} 组</span>
          </div>
        </section>

        {/* Feedback Questions Card */}
        <section className="bg-[#18181B] rounded-2xl p-4 border border-white/5 space-y-4 shadow-lg">
          {/* Card Title */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-white">感觉怎么样？</span>
              <span className="text-xs text-neutral-400 font-normal">动作即时评定</span>
            </div>
            <span className="text-[11px] text-[#A4FF4F] bg-[#A4FF4F]/10 px-2 py-0.5 rounded-full font-medium">
              AI 实时适配中
            </span>
          </div>

          {/* RIR Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">RIR (力竭储备次数)</span>
              <span className="text-[11px] text-neutral-400">目标区间 1-2 次</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((rirVal) => {
                const isSelected = selectedRIR === rirVal;
                const label = rirVal === 4 ? '4+' : rirVal.toString();
                return (
                  <button
                    key={rirVal}
                    onClick={() => setSelectedRIR(rirVal)}
                    className={`py-2 text-xs rounded-xl font-semibold border transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-[#A4FF4F] text-black font-bold border-[#A4FF4F] shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-white/5'
                    }`}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {rirDescriptions[selectedRIR] || rirDescriptions[2]}
            </p>
          </div>

          {/* Left/Right Balance */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <span className="text-xs font-semibold text-neutral-200 block">左右肌力差异感</span>
            <div className="grid grid-cols-3 gap-2">
              {(['无差异', '左侧吃力', '右侧吃力'] as const).map((bal) => {
                const isSelected = selectedBalance === bal;
                return (
                  <button
                    key={bal}
                    onClick={() => setSelectedBalance(bal)}
                    className={`py-2 text-xs rounded-xl font-medium border transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-[#A4FF4F] text-black font-bold border-[#A4FF4F] shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-white/5'
                    }`}
                    type="button"
                  >
                    {bal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discomfort Scale */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">不适程度</span>
              <span className={`text-xs font-semibold tabular-nums ${discomfortScore > 0 ? 'text-amber-400' : 'text-[#A4FF4F]'}`}>
                {getDiscomfortLabel(discomfortScore)}
              </span>
            </div>
            <div className="flex items-center space-x-1 overflow-x-auto py-1 no-scrollbar">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = discomfortScore === score;
                return (
                  <button
                    key={score}
                    onClick={() => setDiscomfortScore(score)}
                    className={`w-7 h-7 shrink-0 text-xs rounded-lg flex items-center justify-center font-bold cursor-pointer transition ${
                      isSelected
                        ? (score === 0 ? 'bg-[#A4FF4F] text-black' : 'bg-amber-400 text-black')
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-white/5'
                    }`}
                    type="button"
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500">若有不适 (&gt;0) 可快捷告知 AI 教练</span>
              <button
                onClick={() =>
                  onAskCoachWithDiscomfort({
                    exercise: exercise.name,
                    level: discomfortScore || 4,
                    note: noteText || '动作终点附近出现轻微牵拉不适',
                  })
                }
                className="text-[11px] text-[#A4FF4F] hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                type="button"
              >
                <span>告诉教练 →</span>
              </button>
            </div>
          </div>

          {/* Optional Note */}
          <div className="pt-2">
            <div className="bg-neutral-900/60 rounded-xl p-3 border border-white/5 flex items-center space-x-2">
              <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="哪里不舒服或需微调？(选填)"
                className="bg-transparent border-0 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-0 w-full p-0"
              />
            </div>
          </div>
        </section>

        {/* Bottom Submission & Back controls */}
        <section className="space-y-2 pt-2 pb-2">
          <button
            id="submit-feedback-btn"
            onClick={handleSubmit}
            aria-label="完成反馈并进入下一动作"
            className="bg-[#A4FF4F] hover:bg-[#90ED3B] text-black font-bold text-base py-3.5 px-6 rounded-xl w-full shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-[#A4FF4F]/20"
            type="button"
          >
            <span>{isLastExercise ? '完成训练 · 查看总结 →' : '完成反馈 · 下一动作 →'}</span>
          </button>
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1 pt-1">
            <button
              onClick={onGoBackToSets}
              className="hover:text-neutral-300 py-1 transition cursor-pointer"
              type="button"
            >
              ← 返回调整组别数据
            </button>
            <button
              onClick={onExitEarly}
              className="hover:text-red-400 py-1 transition cursor-pointer"
              type="button"
            >
              提前结束训练
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
