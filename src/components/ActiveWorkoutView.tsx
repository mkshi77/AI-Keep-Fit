import React, { useState } from 'react';
import { Exercise, SetRecord } from '../types';
import { ExerciseModal } from './ExerciseModal';
import { ReplaceExerciseModal } from './ReplaceExerciseModal';
import { ConfirmModal } from './ConfirmModal';
import { soundManager } from '../utils/sound';

interface ActiveWorkoutViewProps {
  exercises: Exercise[];
  currentExerciseIndex: number;
  onPrevExercise: () => void;
  onNextExercise: () => void;
  onSkipExercise: () => void;
  onUpdateSet: (updatedSet: SetRecord) => void;
  onCompleteSet: (updatedSet: SetRecord) => void;
  onExitWorkout: () => void;
  onFinishWorkoutEarly: () => void;
  onReplaceExercise?: (oldExerciseId: string, newExercise: Exercise) => void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  exercises,
  currentExerciseIndex,
  onPrevExercise,
  onNextExercise,
  onSkipExercise,
  onUpdateSet,
  onCompleteSet,
  onExitWorkout,
  onFinishWorkoutEarly,
  onReplaceExercise,
}) => {
  const currentExercise = exercises[currentExerciseIndex] || exercises[0];

  // Find currently active set (first uncompleted set or last set)
  const currentSetIndex = currentExercise.sets.findIndex((s) => !s.isCompleted);
  const activeSetNumber = currentSetIndex === -1 ? currentExercise.sets.length : currentSetIndex + 1;
  const activeSet = currentExercise.sets[activeSetNumber - 1] || currentExercise.sets[0];

  const currentWeight = activeSet.weight;
  const currentReps = activeSet.reps;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [isConfirmSkipOpen, setIsConfirmSkipOpen] = useState(false);

  const handleAdjustWeight = (delta: number) => {
    onUpdateSet({ ...activeSet, weight: Math.max(0, Math.round((currentWeight + delta) * 10) / 10) });
    soundManager.vibrate(25);
  };

  const handleAdjustReps = (delta: number) => {
    onUpdateSet({ ...activeSet, reps: Math.max(1, currentReps + delta) });
    soundManager.vibrate(25);
  };

  const handleFinishCurrentSet = () => {
    soundManager.playBeep(880, 0.1);
    soundManager.vibrate([60, 30, 60]);
    onCompleteSet({
      ...activeSet,
      weight: currentWeight,
      reps: currentReps,
      isCompleted: true,
    });
  };

  const totalExercises = exercises.length;
  const progressRatio = (currentExerciseIndex + 1) / totalExercises;

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden select-none">
      {/* Navigation Header */}
      <header className="px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={onExitWorkout}
            aria-label="返回上一页"
            className="p-1 -ml-1 text-neutral-300 active:opacity-60 transition-opacity cursor-pointer"
            type="button"
          >
            <svg className="w-5 h-5 stroke-current stroke-[2.2] fill-none" viewBox="0 0 24 24">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-neutral-300">
            训练 · 动作 {currentExerciseIndex + 1}/{totalExercises}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReplaceModalOpen(true)}
            className="text-xs text-neutral-400 hover:text-[#A4FF4F] px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
            type="button"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>换动作</span>
          </button>
          <button
            onClick={onExitWorkout}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
            type="button"
          >
            退出
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full px-5 pb-2">
        <div className="w-full bg-neutral-800 h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-[#A4FF4F] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-3.5 no-scrollbar">
        {/* Exercise Context Card */}
        <section
          id="exercise-context-card"
          className="flex items-center justify-between bg-[#141416] p-3 rounded-xl border border-white/5"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10 relative">
              <img
                alt={currentExercise.name}
                className="w-full h-full object-cover brightness-[0.75]"
                src={currentExercise.image}
              />
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold text-white tracking-tight leading-tight truncate">
                {currentExercise.name}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5 tabular-nums">
                {currentWeight} kg · {currentExercise.defaultSets} × {currentExercise.repRange} · 间歇 {currentExercise.restSeconds} 秒
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer"
              type="button"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>说明</span>
            </button>
          </div>
        </section>

        {/* Current Set Hero */}
        <section
          id="current-set-hero"
          className="bg-[#18181B] rounded-2xl p-4 border border-white/5 text-center shadow-lg"
        >
          {/* Hero Badge */}
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#A4FF4F]/10 border border-[#A4FF4F]/25 mb-3">
            <span className="text-xs font-semibold text-[#A4FF4F] tracking-wide">
              第 {activeSetNumber} 组 / 共 {currentExercise.sets.length} 组
            </span>
          </div>

          {/* Stepper Controls Grid */}
          <div className="grid grid-cols-2 gap-3 divide-x divide-white/10">
            {/* Weight Control */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-full">
                <button
                  onClick={() => handleAdjustWeight(-2.5)}
                  aria-label="减少2.5kg重量"
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  type="button"
                >
                  -2.5
                </button>
                <span className="text-3xl font-extrabold text-white tabular-nums mx-2 leading-none">
                  {currentWeight} <span className="text-sm font-semibold text-neutral-400">kg</span>
                </span>
                <button
                  onClick={() => handleAdjustWeight(2.5)}
                  aria-label="增加2.5kg重量"
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  type="button"
                >
                  +2.5
                </button>
              </div>
              {/* Extra step chips */}
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => handleAdjustWeight(-5)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer font-mono"
                  type="button"
                >
                  -5
                </button>
                <span className="text-[11px] text-neutral-500 font-medium">重量调节</span>
                <button
                  onClick={() => handleAdjustWeight(5)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer font-mono"
                  type="button"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Reps Control */}
            <div className="flex flex-col items-center pl-3">
              <div className="flex items-center justify-center w-full">
                <button
                  onClick={() => handleAdjustReps(-1)}
                  aria-label="减少1次"
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  type="button"
                >
                  -1
                </button>
                <span className="text-3xl font-extrabold text-white tabular-nums mx-2 leading-none">
                  {currentReps} <span className="text-sm font-semibold text-neutral-400">次</span>
                </span>
                <button
                  onClick={() => handleAdjustReps(1)}
                  aria-label="增加1次"
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  type="button"
                >
                  +1
                </button>
              </div>
              {/* Extra step chips */}
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => handleAdjustReps(-2)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer font-mono"
                  type="button"
                >
                  -2
                </button>
                <span className="text-[11px] text-neutral-500 font-medium">
                  目标 ({currentExercise.repRange})
                </span>
                <button
                  onClick={() => handleAdjustReps(2)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer font-mono"
                  type="button"
                >
                  +2
                </button>
              </div>
            </div>
          </div>

          {/* Primary Hero CTA */}
          <button
            id="btn-complete-set"
            onClick={handleFinishCurrentSet}
            aria-label="完成本组并进入休息"
            className="bg-[#A4FF4F] hover:bg-[#90ED3B] text-black font-bold text-base py-3.5 px-6 rounded-xl w-full shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center space-x-2 cursor-pointer shadow-[#A4FF4F]/20"
            type="button"
          >
            <svg className="w-5 h-5 stroke-black stroke-[2.5] fill-none" viewBox="0 0 24 24">
              <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>完成本组</span>
          </button>
        </section>

        {/* Sets Compact List */}
        <section
          id="sets-compact-list"
          className="space-y-1.5 bg-[#141416] p-3 rounded-xl border border-white/5"
        >
          <div className="text-[11px] font-semibold text-neutral-400 px-1 pb-1 tracking-wider flex items-center justify-between">
            <span>全部组别状态</span>
            <span className="text-[10px] text-neutral-500">点选可直接微调</span>
          </div>
          {currentExercise.sets.map((set, idx) => {
            const isCompleted = set.isCompleted;
            const isCurrent = idx === activeSetNumber - 1;

            if (isCompleted) {
              return (
                <div
                  key={set.setNumber}
                  className="flex items-center justify-between py-2 px-3 bg-neutral-900/60 rounded-lg border border-white/5"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-neutral-400 text-xs font-medium">第 {set.setNumber} 组</span>
                    <span className="text-neutral-200 text-xs font-mono tabular-nums">
                      {set.weight} kg × {set.reps}
                    </span>
                  </div>
                  <span className="text-[#A4FF4F] text-xs font-medium flex items-center space-x-1">
                    <span>✓ 完成</span>
                  </span>
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div
                  key={set.setNumber}
                  className="flex items-center justify-between py-2 px-3 bg-[#A4FF4F]/5 rounded-lg border border-[#A4FF4F]/30"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-[#A4FF4F] text-xs font-bold">第 {set.setNumber} 组</span>
                    <span className="text-white text-xs font-mono font-semibold tabular-nums">
                      {currentWeight} kg × {currentReps}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#A4FF4F] bg-[#A4FF4F]/20 px-2 py-0.5 rounded">
                    进行中
                  </span>
                </div>
              );
            }

            return (
              <div
                key={set.setNumber}
                className="flex items-center justify-between py-2 px-3 bg-neutral-900/40 rounded-lg border border-white/5"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-neutral-500 text-xs">第 {set.setNumber} 组</span>
                  <span className="text-neutral-500 text-xs font-mono tabular-nums">
                    {set.weight} kg × {set.targetReps}
                  </span>
                </div>
                <span className="text-neutral-500 text-xs">待完成</span>
              </div>
            );
          })}
        </section>

        {/* Secondary Navigation Actions */}
        <section
          id="secondary-actions"
          className="pt-1 pb-1 grid grid-cols-4 gap-2 text-center text-xs text-neutral-400"
        >
          <button
            onClick={onPrevExercise}
            disabled={currentExerciseIndex === 0}
            className={`py-2 px-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-white/5 transition active:scale-95 cursor-pointer ${
              currentExerciseIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            type="button"
          >
            上一动作
          </button>
          <button
            onClick={() => setIsConfirmSkipOpen(true)}
            className="py-2 px-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-white/5 transition active:scale-95 cursor-pointer"
            type="button"
          >
            跳过动作
          </button>
          <button
            onClick={onNextExercise}
            className="py-2 px-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-white/5 transition active:scale-95 cursor-pointer"
            type="button"
          >
            下一动作
          </button>
          <button
            onClick={() => setIsConfirmExitOpen(true)}
            className="py-2 px-1 bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-300 rounded-xl border border-white/5 transition active:scale-95 cursor-pointer"
            type="button"
          >
            结束训练
          </button>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmExitOpen}
        title="确认结束训练？"
        description="还有未完成的组数，确定现在结束本次训练吗？"
        confirmText="结束并保存当前完成内容"
        cancelText="继续训练"
        onConfirm={onFinishWorkoutEarly}
        onCancel={() => setIsConfirmExitOpen(false)}
      />

      <ConfirmModal
        isOpen={isConfirmSkipOpen}
        title="确认跳过这个动作？"
        description="已填写和已完成的组会保留，未完成组不会被标记为完成。"
        confirmText="确认跳过"
        cancelText="继续当前动作"
        onConfirm={() => {
          setIsConfirmSkipOpen(false);
          onSkipExercise();
        }}
        onCancel={() => setIsConfirmSkipOpen(false)}
      />

      {/* Exercise Modal */}
      <ExerciseModal
        exercise={currentExercise}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Replace Exercise Modal */}
      <ReplaceExerciseModal
        exercise={currentExercise}
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        onSelectAlternative={(newEx) => {
          if (onReplaceExercise) {
            onReplaceExercise(currentExercise.id, newEx);
          }
        }}
      />
    </div>
  );
};
