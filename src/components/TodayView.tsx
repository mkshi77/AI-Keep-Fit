import React, { useState } from 'react';
import { Exercise, BodyFeedbackRecord } from '../types';
import { ExerciseModal } from './ExerciseModal';
import { ReplaceExerciseModal } from './ReplaceExerciseModal';

interface TodayViewProps {
  exercises: Exercise[];
  bodyFeedbacks?: BodyFeedbackRecord[];
  onStartWorkout: () => void;
  isTodayCompleted?: boolean;
  onViewSummary?: () => void;
  onRestartWorkout?: () => void;
  onReplaceExercise?: (oldExerciseId: string, newExercise: Exercise) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  exercises,
  bodyFeedbacks = [],
  onStartWorkout,
  isTodayCompleted = false,
  onViewSummary,
  onRestartWorkout,
  onReplaceExercise,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [replacingExercise, setReplacingExercise] = useState<Exercise | null>(null);

  // Check if any recent body feedback has discomfort (score >= 3/10)
  const hasInjuryFeedback = bodyFeedbacks.some((fb) =>
    fb.score.includes('4') || fb.score.includes('5') || fb.score.includes('6')
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-5 pt-1 pb-28 select-none relative">
      <div className="flex flex-col gap-3.5 flex-1">
        {/* Date & Title */}
        <div className="flex flex-col mt-1 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400 font-medium">09月7日 · 周一</div>
            {isTodayCompleted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#A4FF4F]/15 text-[#A4FF4F] border border-[#A4FF4F]/30">
                <svg className="w-3 h-3 text-[#A4FF4F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                今日已完成
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mt-1 leading-tight tracking-tight">今天训练</h1>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-neutral-300">3 个动作 · 12 组 · 约 45 分钟</p>
            <span className="text-xs text-neutral-500 font-normal">胸 · 背 · 腿</span>
          </div>
        </div>

        {/* 7-Day Weekly Streak Track */}
        <div className="bg-[#141416] p-3 rounded-2xl border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <span className="text-[#A4FF4F]">🔥</span>
              <span>本周目标 4 次 · {isTodayCompleted ? '已完成 3 次' : '已完成 2 次'}</span>
            </div>
            <span className="text-[11px] text-[#A4FF4F] font-semibold">
              {isTodayCompleted ? '今日已打卡 ✓' : '待今日打卡'}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 pt-0.5">
            {[
              { day: '一', date: '07', done: isTodayCompleted, isToday: true },
              { day: '二', date: '08', done: false, isToday: false },
              { day: '三', date: '09', done: true, isToday: false },
              { day: '四', date: '10', done: false, isToday: false },
              { day: '五', date: '11', done: true, isToday: false },
              { day: '六', date: '12', done: false, isToday: false },
              { day: '日', date: '13', done: false, isToday: false },
            ].map((d) => (
              <div
                key={d.day}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                  d.isToday
                    ? 'bg-white/10 ring-1 ring-[#A4FF4F]/50'
                    : d.done
                    ? 'bg-[#18181B]'
                    : 'bg-transparent'
                }`}
              >
                <span className="text-[10px] text-neutral-400 font-medium">{d.day}</span>
                <div
                  className={`w-5 h-5 rounded-full mt-1 flex items-center justify-center text-[10px] font-bold ${
                    d.done
                      ? 'bg-[#A4FF4F] text-black shadow-sm shadow-[#A4FF4F]/30'
                      : d.isToday
                      ? 'border border-[#A4FF4F] text-[#A4FF4F]'
                      : 'text-neutral-500'
                  }`}
                >
                  {d.done ? '✓' : d.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI 避让联动提醒 (如果记录中有不适反馈且今日未完成) */}
        {hasInjuryFeedback && !isTodayCompleted && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 text-xs">🛡️</span>
                <span className="text-xs font-bold text-amber-300">AI 智能防护避让提醒</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                已关联右肩不适 (4/10)
              </span>
            </div>
            <p className="text-[12px] text-neutral-300 leading-relaxed">
              检测到你上次记录了「右肩前侧轻微不适」。今日卧推建议微收握距，或一键替换为更护肩的中立握推胸。
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setReplacingExercise(exercises[0])}
                className="text-[11px] py-1 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold transition active:scale-95 cursor-pointer"
                type="button"
              >
                一键换为中立握推胸 →
              </button>
              <span className="text-[11px] text-neutral-400">或正常热身观察</span>
            </div>
          </div>
        )}

        {/* AI 教练提醒 / 练后总结 Card */}
        {isTodayCompleted ? (
          <div className="p-4 rounded-xl bg-[#161618] border border-[#A4FF4F]/25 flex flex-col gap-2.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A4FF4F]" />
                <span className="text-xs text-[#A4FF4F] font-semibold tracking-tight">AI 练后点评</span>
              </div>
              <span className="text-[10px] text-[#A4FF4F] font-medium px-2 py-0.5 rounded-full bg-[#A4FF4F]/10 border border-[#A4FF4F]/20">
                训练已达成
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] text-neutral-200 leading-relaxed font-normal">
                今日训练已圆满达成！3 个动作共 12 组均已保质完成，动作离心控制与节奏稳定。
              </p>
              <p className="text-[12px] text-neutral-400 leading-relaxed font-normal flex items-center gap-1.5">
                <span className="text-[#A4FF4F] font-bold leading-none">•</span> 建议重点做好胸背与腿部静态拉伸，并在 1 小时内适量补充蛋白质与水分。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#161618] border border-[#1E1E22] flex flex-col gap-2.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A4FF4F] animate-pulse" />
                <span className="text-xs text-[#A4FF4F] font-semibold tracking-tight">AI 教练重点提醒</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium px-1.5 py-0.5 rounded bg-[#1C1C20]">
                针对今日状态
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] text-neutral-200 leading-relaxed font-normal">
                上次卧推整体轨迹稳定，最后两组均达成预期 RIR 2。今天优先保证负荷质量，把目标次数做扎实。
              </p>
              <p className="text-[12px] text-neutral-400 leading-relaxed font-normal flex items-center gap-1.5">
                <span className="text-[#A4FF4F] font-bold leading-none">•</span> 下降段保持 2 秒离心控制，背阔肌收紧保持稳定承托。
              </p>
            </div>
          </div>
        )}

        {/* 今日动作 Header */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">今日动作</h2>
            <span className="text-xs text-neutral-500">
              {isTodayCompleted ? '3 个动作全部完成' : '3 个动作 · 支持替换'}
            </span>
          </div>

          {/* Exercises List */}
          <div className="flex flex-col gap-3">
            {exercises.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setSelectedExercise(item)}
                className={`p-3.5 rounded-xl bg-[#141416] border flex items-center justify-between active:bg-[#1C1C1E] transition-colors cursor-pointer group ${
                  isTodayCompleted ? 'border-[#A4FF4F]/20' : 'border-[#1E1E22]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="text-xs text-neutral-500 font-bold shrink-0 w-4 text-center font-mono">
                    {item.number}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-[#0B0B0C] border border-[#1E1E22] overflow-hidden shrink-0 flex items-center justify-center relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-300"
                    />
                    {isTodayCompleted && (
                      <div className="absolute inset-0 bg-[#A4FF4F]/20 flex items-center justify-center backdrop-blur-[0.5px]">
                        <svg className="w-5 h-5 text-[#A4FF4F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 justify-center flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-white truncate tracking-tight">
                        {item.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C20] text-neutral-400 font-medium shrink-0">
                        {item.targetMuscle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-neutral-300 font-normal truncate tabular-nums">
                        {item.defaultSets} 组 · {item.repRange} 次 · {item.weight} kg
                      </span>
                      {isTodayCompleted ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 text-[#A4FF4F] bg-[#A4FF4F]/10 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          已完成
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            index === 0
                              ? 'text-[#A4FF4F] bg-[#A4FF4F]/10'
                              : index === 1
                              ? 'text-[#A4FF4F] bg-[#A4FF4F]/10'
                              : 'text-neutral-400 bg-[#1C1C20]'
                          }`}
                        >
                          {item.recommendationTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 pl-1">
                  {!isTodayCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplacingExercise(item);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-[#A4FF4F] bg-[#1C1C20] hover:bg-[#25252A] px-2 py-1 rounded-md transition-colors cursor-pointer"
                      type="button"
                    >
                      换动作
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExercise(item);
                    }}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 bg-[#1C1C20] px-2 py-1 rounded-md transition-colors cursor-pointer"
                    type="button"
                  >
                    说明
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Workout Button or Completed State (Ensures ample breathing room above bottom nav) */}
      <div className="pt-4 pb-6 mt-4 flex flex-col gap-3">
        {isTodayCompleted ? (
          <div className="flex flex-col gap-2.5">
            {/* Completed status card */}
            <div className="w-full py-3 px-4 rounded-2xl bg-[#141812] border border-[#A4FF4F]/40 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#A4FF4F]/20 flex items-center justify-center text-[#A4FF4F]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-bold text-white tracking-tight">今日训练已圆满完成</span>
                  <span className="text-[11px] text-neutral-400 block font-normal">3 个动作 · 12 组全部结清</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#A4FF4F] bg-[#A4FF4F]/15 px-2 py-0.5 rounded-full">
                100% 达成
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {onViewSummary && (
                <button
                  id="view-summary-btn"
                  onClick={onViewSummary}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#A4FF4F] hover:bg-[#94ED42] active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#A4FF4F]/20"
                  type="button"
                >
                  <span>查看训练总结与PR</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {onRestartWorkout && (
                <button
                  id="restart-workout-btn"
                  onClick={onRestartWorkout}
                  className="py-3.5 px-4 rounded-xl bg-[#1C1C1E] hover:bg-[#252528] text-neutral-300 hover:text-white font-medium text-xs border border-white/10 transition-all cursor-pointer shrink-0"
                  type="button"
                >
                  重新训练
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            id="start-workout-btn"
            onClick={onStartWorkout}
            className="w-full py-3.5 rounded-xl bg-[#A4FF4F] hover:bg-[#94ED42] active:scale-[0.98] text-black font-bold text-[16px] text-center transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-[#A4FF4F]/20"
            type="button"
          >
            开始训练 →
          </button>
        )}
      </div>

      {/* Exercise Info Modal */}
      <ExerciseModal
        exercise={selectedExercise}
        isOpen={Boolean(selectedExercise)}
        onClose={() => setSelectedExercise(null)}
      />

      {/* Replace Exercise Modal */}
      <ReplaceExerciseModal
        exercise={replacingExercise}
        isOpen={Boolean(replacingExercise)}
        onClose={() => setReplacingExercise(null)}
        onSelectAlternative={(newEx) => {
          if (replacingExercise && onReplaceExercise) {
            onReplaceExercise(replacingExercise.id, newEx);
          }
        }}
      />
    </div>
  );
};
