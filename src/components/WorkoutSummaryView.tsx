import React, { useState } from 'react';
import { Exercise } from '../types';
import type { WorkoutCompletionResult } from '../domain/workout';
import type { WorkoutDraftSummary } from '../state/workoutDraft';

interface WorkoutSummaryViewProps {
  exercises: Exercise[];
  summary: WorkoutDraftSummary;
  submissionState: {
    status: 'idle' | 'submitting' | 'failed' | 'submitted';
    error?: string;
    result?: WorkoutCompletionResult;
  };
  onSubmitWorkout: () => void;
  onReturnToday: () => void;
  onAskCoach: () => void;
  onSaveBodyFeedback?: (record: { part: string; level: number; note: string }) => void;
}

export const WorkoutSummaryView: React.FC<WorkoutSummaryViewProps> = ({
  exercises,
  summary,
  submissionState,
  onSubmitWorkout,
  onReturnToday,
  onAskCoach,
  onSaveBodyFeedback,
}) => {
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'great' | 'issue'>('great');
  const [selectedPart, setSelectedPart] = useState<string>('右肩前侧');
  const [discomfortScore, setDiscomfortScore] = useState<number>(3);
  const [discomfortNote, setDiscomfortNote] = useState<string>('');

  const { completedSets, totalVolume, completionRate, durationMinutes } = summary;
  const submissionResult = submissionState.status === 'submitted' ? submissionState.result : undefined;
  const syncLabels: Record<typeof submissionState.status, string> = {
    idle: '待同步',
    submitting: '正在同步...',
    failed: '同步失败',
    submitted: '已同步',
  };
  const syncDescription = submissionState.status === 'failed'
    ? (submissionState.error || '训练草稿已保留，可以重试。')
    : submissionState.status === 'submitted'
      ? (submissionResult?.workoutCompleted ? '训练数据已写回 Notion。' : '部分完成数据已写回 Notion。')
      : submissionState.status === 'submitting'
        ? '正在安全写回 Notion，请勿关闭页面。'
        : '确认完成训练后，将数据同步到 Notion。';
  const headline = submissionState.status === 'submitted' && !submissionResult?.workoutCompleted
    ? '训练已结束'
    : completionRate < 100 ? '训练已结束' : '训练完成';
  const submitLabel = submissionState.status === 'submitted'
    ? '已同步'
    : submissionState.status === 'submitting'
      ? '正在保存...'
      : submissionState.status === 'failed'
        ? '重试同步'
        : completedSets === 0 ? '无可同步组' : '同步训练数据';

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden select-none relative">
      {/* Scrollable Summary Content */}
      <main className="flex-1 px-4 pt-4 pb-24 overflow-y-auto space-y-3.5 no-scrollbar">
        {/* Hero Completion Badge & Confetti */}
        <section className="flex flex-col items-center justify-center pt-2 pb-1 relative">
          {/* Subtle Confetti Elements */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <span className="absolute -top-1 left-24 w-1.5 h-4 bg-[#A4FF4F]/40 rounded-full rotate-45 transform animate-bounce" />
            <span className="absolute top-4 right-20 w-3 h-1.5 bg-[#A4FF4F]/50 rounded-full -rotate-12 transform" />
            <span className="absolute bottom-12 left-16 w-2 h-2 bg-white/20 rounded-full" />
            <span className="absolute top-10 left-12 w-2.5 h-1 bg-white/40 -rotate-45 transform" />
            <span className="absolute bottom-10 right-16 w-2 h-3 bg-[#A4FF4F]/30 rounded-sm rotate-12 transform" />
          </div>

          {/* Checkmark Circle Badge */}
          <div className="w-16 h-16 rounded-full bg-[#A4FF4F] flex items-center justify-center shadow-lg shadow-[#A4FF4F]/25 mb-1 transition-transform hover:scale-105">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Headline & Motto */}
          <h1 className="text-2xl font-bold tracking-tight text-white mt-3">{headline}</h1>
          <p className="text-sm text-neutral-300 mt-1 font-normal tracking-wide">今天长了一点 · 状态极佳</p>
        </section>

        {/* TODO: Phase Records / PR — do not compute or display fake PRs here. */}
        <section className="bg-[#141416] rounded-2xl p-3.5 border border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#A4FF4F]/10 flex items-center justify-center text-xl shrink-0">🏆</div>
            <div>
              <p className="text-xs font-bold text-[#A4FF4F]">PR 记录</p>
              <p className="text-xs text-neutral-300 mt-0.5">Phase Records / PR 接入后显示，当前为占位。</p>
            </div>
          </div>
        </section>

        {/* Notion sync state */}
        <section className={`bg-[#141416] rounded-2xl p-3.5 border ${submissionState.status === 'submitted' ? 'border-[#A4FF4F]/30' : submissionState.status === 'failed' ? 'border-red-400/30' : 'border-white/[0.04]'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-bold ${submissionState.status === 'submitted' ? 'text-[#A4FF4F]' : submissionState.status === 'failed' ? 'text-red-400' : 'text-white'}`}>
                {syncLabels[submissionState.status]}
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">{syncDescription}</p>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${submissionState.status === 'submitted' ? 'bg-[#A4FF4F]/20 text-[#A4FF4F]' : submissionState.status === 'failed' ? 'bg-red-400/15 text-red-400' : 'bg-white/10 text-neutral-300'}`}>Notion</span>
          </div>
        </section>

        {/* Core Metrics Grid - 4 Metrics */}
        <section className="grid grid-cols-4 gap-2">
          <div className="bg-[#141416] rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center border border-white/[0.04]">
            <div className="flex items-baseline space-x-0.5">
              <span className="text-lg font-extrabold text-white tracking-tight leading-none tabular-nums">
                {completedSets}
              </span>
              <span className="text-[10px] text-neutral-400">组</span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1">完成组数</span>
          </div>

          <div className="bg-[#141416] rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center border border-white/[0.04]">
            <div className="flex items-baseline space-x-0.5">
              <span className="text-lg font-extrabold text-[#A4FF4F] tracking-tight leading-none tabular-nums">
                {totalVolume.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#A4FF4F]/80">kg</span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1">总训练容量</span>
          </div>

          <div className="bg-[#141416] rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center border border-white/[0.04]">
            <div className="flex items-baseline space-x-0.5">
              <span className="text-lg font-extrabold text-white tracking-tight leading-none tabular-nums">
                {durationMinutes}
              </span>
              <span className="text-[10px] text-neutral-400">分</span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1">训练时长</span>
          </div>

          <div className="bg-[#141416] rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center border border-white/[0.04]">
            <div className="flex items-baseline">
              <span className="text-lg font-extrabold text-[#A4FF4F] tracking-tight leading-none tabular-nums">
                {completionRate}%
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1">完成率</span>
          </div>
        </section>

        {/* Phase 1C placeholder: the existing AI review copy is not generated from the draft yet. */}
        <section className="bg-[#141416] rounded-2xl p-4 border border-white/[0.04] relative">
          <div className="flex items-center space-x-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-[#A4FF4F]/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-[#A4FF4F] fill-current" viewBox="0 0 24 24">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#A4FF4F] tracking-wide">AI 教练点评</span>
          </div>
          <p className="text-sm leading-relaxed text-neutral-200 font-normal whitespace-pre-line">
            今天卧推输出比较稳定 💪
            {'\n'}RIR 基本保持在目标范围，总容量突破 {totalVolume.toLocaleString()} kg。
            {'\n'}划船动作发力充沛，最后一组降重合理，
            {'\n'}下次先保持当前节奏，不急着大幅增加重量。
          </p>
        </section>

        {/* Phase 1C placeholder: this body check-in remains local UI state and is not a formal submission. */}
        <section className="bg-[#141416] rounded-2xl p-4 border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-base">🩺</span>
              <div>
                <span className="text-xs font-bold text-white">练后身体感觉确认</span>
                <span className="text-[10px] text-neutral-400 block">用于下堂课防伤自适应调整</span>
              </div>
            </div>
            {feedbackSaved && (
              <span className="text-[11px] text-[#A4FF4F] font-semibold bg-[#A4FF4F]/10 px-2 py-0.5 rounded-full">
                ✓ 已同步至健康档案
              </span>
            )}
          </div>

          {!feedbackSaved ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('great');
                    onSaveBodyFeedback?.({
                      part: '全身状态良好',
                      level: 0,
                      note: '无明显关节或代偿酸痛，发力顺畅',
                    });
                    setFeedbackSaved(true);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedStatus === 'great'
                      ? 'bg-[#1C2416] border-[#A4FF4F]/50 text-white'
                      : 'bg-[#18181B] border-white/5 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>👍</span>
                    <span className="text-xs font-semibold text-white">一切良好，无明显酸痛</span>
                  </div>
                  <span className="text-xs text-[#A4FF4F]">✓</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('issue')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedStatus === 'issue'
                      ? 'bg-[#2A1D16] border-amber-500/50 text-white'
                      : 'bg-[#18181B] border-white/5 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="text-xs font-semibold text-white">个别部位微酸 / 不适</span>
                  </div>
                  <span className="text-xs text-amber-400">选择部位</span>
                </button>
              </div>

              {selectedStatus === 'issue' && (
                <div className="p-3 rounded-xl bg-[#18181B] border border-white/5 space-y-2.5">
                  <div>
                    <span className="text-[11px] text-neutral-400 font-medium block mb-1.5">点击不适部位：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['右肩前侧', '左肩', '腰部/下背', '左膝关节', '手腕', '手肘'].map((part) => (
                        <button
                          key={part}
                          type="button"
                          onClick={() => setSelectedPart(part)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            selectedPart === part
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                              : 'bg-[#202024] border-white/5 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-neutral-400">酸痛程度 (1-10分):</span>
                      <span className="font-mono text-amber-400 font-bold">{discomfortScore} / 10 级</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={discomfortScore}
                      onChange={(e) => setDiscomfortScore(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-[#26262B] rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={discomfortNote}
                      onChange={(e) => setDiscomfortNote(e.target.value)}
                      placeholder="补充简短感受（如：推到顶峰时轻微夹挤）"
                      className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onSaveBodyFeedback?.({
                          part: selectedPart,
                          level: discomfortScore,
                          note: discomfortNote.trim() || `感觉 ${discomfortScore}/10 级微酸，需注意动作轨迹`,
                        });
                        setFeedbackSaved(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                    >
                      确认记录
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#18181B] border border-white/5 flex items-center justify-between">
              <span className="text-xs text-neutral-300">
                已记录：{selectedStatus === 'great' ? '全身状态良好' : `${selectedPart} (${discomfortScore}/10分)`}
              </span>
              <button
                type="button"
                onClick={() => setFeedbackSaved(false)}
                className="text-xs text-neutral-500 hover:text-white underline cursor-pointer"
              >
                修改
              </button>
            </div>
          )}
        </section>

        {/* Exercises Data List */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-neutral-400 mb-2 ml-0.5">主要数据</h2>
          <div className="space-y-2">
            {exercises.map((ex, idx) => {
              const completedExerciseSets = ex.sets.filter((set) => set.isCompleted);
              const maxWeight = completedExerciseSets.length ? Math.max(...completedExerciseSets.map((set) => set.weight)) : 0;
              const completedCount = completedExerciseSets.length;
              const exVolume = completedExerciseSets.reduce((sum, item) => sum + item.weight * item.reps, 0);

              return (
                <article
                  key={ex.id}
                  className="bg-[#141416] rounded-2xl p-3 flex items-center justify-between border border-white/[0.04] transition-colors active:bg-[#1C1C1E]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1C1C1E] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {idx === 0 ? (
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M3 10h18M7 15h10M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : idx === 1 ? (
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white tracking-tight">{ex.name}</span>
                      <span className="text-xs text-[#8E8E93] mt-0.5 tabular-nums">
                        {completedCount} 组 · 峰值 {maxWeight} kg · 容量 {exVolume.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mr-1">
                    {idx === 1 && (
                      <span className="text-[10px] bg-[#A4FF4F]/20 text-[#A4FF4F] px-1.5 py-0.5 rounded font-medium">
                        PR
                      </span>
                    )}
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Action Bar */}
      <footer className="absolute bottom-0 left-0 right-0 bg-[#0B0B0C]/90 backdrop-blur-md px-4 pb-7 pt-3 border-t border-white/[0.03] flex items-center space-x-2 z-30">
        <button
          onClick={onReturnToday}
          className="bg-[#1C1C1E] text-white py-3.5 px-3 rounded-xl font-semibold text-sm text-center transition-all active:scale-[0.98] border border-white/[0.04] cursor-pointer hover:bg-neutral-800"
          type="button"
        >
          返回
        </button>
        <button
          onClick={onAskCoach}
          className="bg-[#1C1C1E] text-white py-3.5 px-4 rounded-xl font-semibold text-sm flex-1 text-center transition-all active:scale-[0.98] border border-white/[0.04] cursor-pointer hover:bg-neutral-800"
          type="button"
        >
          问教练
        </button>
        <button
          onClick={onSubmitWorkout}
          disabled={submissionState.status === 'submitting' || submissionState.status === 'submitted' || completedSets === 0}
          className={`bg-[#A4FF4F] text-black py-3.5 px-4 rounded-xl font-bold text-sm flex-1 text-center transition-all active:scale-[0.98] shadow-md shadow-[#A4FF4F]/15 hover:bg-[#92ef3f] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          type="button"
        >
          {submitLabel}
        </button>
</footer>
    </div>
  );
};
