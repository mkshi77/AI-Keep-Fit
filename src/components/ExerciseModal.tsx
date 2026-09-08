import React from 'react';
import { Exercise } from '../types';

interface ExerciseModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({ exercise, isOpen, onClose }) => {
  if (!isOpen || !exercise) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[350px] bg-[#18181B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="relative h-44 bg-[#0B0B0C] shrink-0 border-b border-white/10">
          <img
            src={exercise.image}
            alt={exercise.name}
            className="w-full h-full object-cover grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-black/40" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#A4FF4F]/20 text-[#A4FF4F] font-semibold">
              {exercise.targetMuscle}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{exercise.name}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-neutral-300 no-scrollbar">
          <div>
            <h4 className="font-semibold text-white mb-1">动作概述</h4>
            <p className="leading-relaxed text-neutral-400">{exercise.instructions.overview}</p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A4FF4F]" />
              动作要领
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-neutral-300">
              {exercise.instructions.keyPoints.map((point, idx) => (
                <li key={idx} className="leading-relaxed">{point}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              常见错误
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-neutral-400">
              {exercise.instructions.commonMistakes.map((mistake, idx) => (
                <li key={idx} className="leading-relaxed">{mistake}</li>
              ))}
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141416] border border-white/5">
            <div className="text-[11px] font-semibold text-[#A4FF4F] mb-1">💡 热身建议</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">{exercise.instructions.warmupAdvice}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#141416]">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#A4FF4F] text-black font-bold text-xs active:scale-98 transition-all"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
