import React from 'react';
import { Exercise } from '../types';
import { ALTERNATIVE_EXERCISES } from '../data/mockData';

interface ReplaceExerciseModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAlternative: (newExercise: Exercise) => void;
}

export const ReplaceExerciseModal: React.FC<ReplaceExerciseModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onSelectAlternative,
}) => {
  if (!isOpen || !exercise) return null;

  const alternatives = ALTERNATIVE_EXERCISES[exercise.id] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div
        className="w-full max-w-sm bg-[#151517] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">替换动作</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              器械被占或身体不适？一键换为同肌群备选方案
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Current Exercise Pill */}
        <div className="my-3 p-2.5 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[11px] text-neutral-500 font-mono font-bold">原动作</span>
            <span className="text-xs font-semibold text-neutral-200 truncate">{exercise.name}</span>
          </div>
          <span className="text-[10px] text-neutral-400 px-2 py-0.5 rounded bg-white/5 shrink-0">
            {exercise.targetMuscle}
          </span>
        </div>

        {/* Alternatives List */}
        <div className="space-y-2.5 my-2 overflow-y-auto max-h-[50vh] pr-1">
          {alternatives.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-500">
              暂无更多备选动作，建议根据个人状态微调重量。
            </div>
          ) : (
            alternatives.map((alt) => {
              return (
                <div
                  key={alt.id}
                  className="p-3 rounded-xl bg-[#1C1C1F] hover:bg-[#232327] border border-white/5 hover:border-[#A4FF4F]/30 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={alt.image}
                          alt={alt.name}
                          className="w-full h-full object-cover grayscale contrast-125"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">{alt.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#A4FF4F]/15 text-[#A4FF4F] font-medium shrink-0">
                            {alt.recommendationTag}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {alt.defaultSets} 组 · {alt.repRange} 次 · {alt.weight} kg
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-tight">
                    {alt.instructions.overview}
                  </p>

                  <button
                    onClick={() => {
                      onSelectAlternative({
                        ...alt,
                        number: exercise.number,
                      });
                      onClose();
                    }}
                    className="mt-1 w-full py-2 bg-[#A4FF4F]/10 hover:bg-[#A4FF4F] text-[#A4FF4F] hover:text-black font-semibold text-xs rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 border border-[#A4FF4F]/20 hover:border-[#A4FF4F]"
                    type="button"
                  >
                    <span>确认替换此动作</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Cancel Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs text-center transition cursor-pointer"
            type="button"
          >
            保持原计划
          </button>
        </div>
      </div>
    </div>
  );
};
