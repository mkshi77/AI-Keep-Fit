import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BodyFeedbackRecord } from '../types';
import { buildBodyWeightDataset, buildHeatmap, buildPrRecords, buildTrends, buildWeeklyData, isoWeekLabel, mapRemoteBodyFeedback, overviewSummary, summarizeSessions, type RecordsPeriodLabel, type RecordsTrend } from '../adapters/recordsAdapter';
import { useRecordsData } from '../hooks/useRecordsData';
import { useBodyWeightData } from '../hooks/useBodyWeightData';
import type { BodyWeightCondition, HistoryPeriod, WorkoutHistorySession } from '../domain/records';

const EMPTY_HISTORY: WorkoutHistorySession[] = [];
type BodyWeightPeriod = Exclude<HistoryPeriod, 'all'>;

interface RecordsViewProps {
  bodyFeedbacks: BodyFeedbackRecord[];
  onOpenCoachWithFeedback?: (feedback: BodyFeedbackRecord) => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({ bodyFeedbacks, onOpenCoachWithFeedback }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<RecordsPeriodLabel>('本周');
  const [activeTooltipDay, setActiveTooltipDay] = useState<number>(6);
  const [selectedPRDetail, setSelectedPRDetail] = useState<any | null>(null);
  const [showAllPRs, setShowAllPRs] = useState(false);
  const [selectedTrendExercise, setSelectedTrendExercise] = useState<string>('');
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);

  // Weight Logging state backed by the dedicated Body Weight data source
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [weightCondition, setWeightCondition] = useState<BodyWeightCondition>('晨起空腹');
  const [weightPeriod, setWeightPeriod] = useState<BodyWeightPeriod>('30d');
  const bodyWeight = useBodyWeightData(weightPeriod);
  const activeWeightDataset = useMemo(
    () => buildBodyWeightDataset(bodyWeight.records, weightPeriod),
    [bodyWeight.records, weightPeriod],
  );
  const latestWeight = bodyWeight.records.at(-1);
  const currentWeight = latestWeight?.weightKg;

  const handleSaveWeight = async () => {
    const parsed = Number.parseFloat(inputWeight);
    if (!Number.isFinite(parsed) || parsed <= 30 || parsed >= 250) return;
    try {
      await bodyWeight.save({
        date: new Intl.DateTimeFormat('en-CA').format(new Date()),
        weightKg: parsed,
        condition: weightCondition,
      });
      setShowWeightModal(false);
    } catch {
      // The hook exposes the request error inside the modal.
    }
  };
  const heatmapScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (heatmapScrollRef.current) {
      heatmapScrollRef.current.scrollLeft = heatmapScrollRef.current.scrollWidth;
    }
  }, []);

  // Active hover/touch point index for charts
  const [activeWeightPointIdx, setActiveWeightPointIdx] = useState<number | null>(null);
  const [activeExercisePointIdx, setActiveExercisePointIdx] = useState<number | null>(null);

  // Dynamic SVG curve generator for any exercise history (replaces hardcoded SVGs)
  const calcExerciseCurve = (points: { date: string; weight: number; isPR?: boolean }[]) => {
    if (!points || points.length === 0) return { lineD: '', areaD: '', coords: [], minW: 0, maxW: 0 };
    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;

    const coords = points.map((p, idx) => {
      const cx = 25 + (idx / Math.max(1, points.length - 1)) * 270;
      const cy = 40 - ((p.weight - minW) / range) * 28;
      return { ...p, cx, cy };
    });

    const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ');
    const areaD = `${lineD} L ${coords[coords.length - 1].cx.toFixed(1)} 48 L ${coords[0].cx.toFixed(1)} 48 Z`;

    return { lineD, areaD, coords, minW, maxW };
  };

  const recordsData = useRecordsData(selectedPeriod);
  const historySessions = recordsData.history?.sessions ?? EMPTY_HISTORY;
  const allHistorySessions = recordsData.allHistory?.sessions ?? EMPTY_HISTORY;
  const weeklyData = useMemo(() => buildWeeklyData(recordsData.overview?.sessions ?? []), [recordsData.overview]);
  const heatmap = useMemo(() => buildHeatmap(allHistorySessions), [allHistorySessions]);
  const allPRRecords = useMemo(() => buildPrRecords(historySessions), [historySessions]);
  const overloadTrends = useMemo(() => buildTrends(historySessions), [historySessions]);
  const trendEntries = useMemo(() => Object.entries(overloadTrends) as Array<[string, RecordsTrend]>, [overloadTrends]);
  const primaryTrendEntries = trendEntries.slice(0, 3);
  const primaryTrendKeys = primaryTrendEntries.map(([key]) => key);
  const trendCategories = [...new Set(trendEntries.map(([, trend]) => trend.category))];
  const activeTrend = overloadTrends[selectedTrendExercise] || trendEntries[0]?.[1];
  const selectedSummary = selectedPeriod === '本周'
    ? overviewSummary(recordsData.overview)
    : summarizeSessions(historySessions);
  const selectedDateRange = historySessions.length
    ? `${historySessions[0].date} - ${historySessions[historySessions.length - 1].date}`
    : '暂无训练记录';
  const remoteBodyFeedbacks = useMemo(
    () => mapRemoteBodyFeedback(recordsData.bodyFeedback?.records ?? []),
    [recordsData.bodyFeedback],
  );
  const displayBodyFeedbacks = useMemo(() => {
    const remoteIds = new Set(remoteBodyFeedbacks.map((record) => record.id));
    return [...remoteBodyFeedbacks, ...bodyFeedbacks.filter((record) => !remoteIds.has(record.id))];
  }, [bodyFeedbacks, remoteBodyFeedbacks]);

  useEffect(() => {
    if (!overloadTrends[selectedTrendExercise] && trendEntries[0]) setSelectedTrendExercise(trendEntries[0][0]);
  }, [overloadTrends, selectedTrendExercise, trendEntries]);

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-24 pt-1 space-y-3.5 no-scrollbar select-none">
      {/* Header Row */}
      <section className="pt-1 pb-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">记录</h1>
      </section>

      {recordsData.error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          训练记录加载失败：{recordsData.error}
        </div>
      )}
      {recordsData.loading && !recordsData.history && (
        <div className="rounded-xl border border-white/5 bg-[#141416] px-3 py-2 text-xs text-neutral-400">
          正在加载训练记录…
        </div>
      )}

      {/* Segment Control & Date Range */}
      <section className="space-y-2">
        {/* Period Selector */}
        <div className="bg-[#151517] p-1 rounded-xl flex items-center justify-between text-xs font-medium">
          {(['本周', '本月', '3个月', '全部'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${
                selectedPeriod === period
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-[#7E7E87] hover:text-zinc-300'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Left-aligned Date Range with Year */}
        <div className="flex items-center justify-between px-1 text-xs text-neutral-400 select-none font-medium">
          <span className="tracking-tight text-neutral-300">
            {selectedDateRange}
          </span>
          {selectedPeriod === '本周' && (
            <span className="text-[10px] font-mono text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">
              {isoWeekLabel(historySessions.at(-1)?.date)}
            </span>
          )}
        </div>
      </section>

      {/* Compact PR Highlight Bar / 精简高光突破栏 */}
      <section className="bg-gradient-to-r from-[#172213] via-[#141416] to-[#141416] rounded-2xl p-3.5 border border-[#A4FF4F]/30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">近期突破高光</span>
                <span className="text-[10px] font-mono text-[#A4FF4F] bg-[#A4FF4F]/20 px-1.5 py-0.2 rounded font-bold">
                  {allPRRecords.filter((record) => record.isRecentHighlight).length} 项 PR
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                最近 30 天核心动作破纪录
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllPRs(!showAllPRs)}
            className="text-[11px] text-[#A4FF4F] hover:text-white bg-[#A4FF4F]/10 hover:bg-[#A4FF4F]/20 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{showAllPRs ? '收起' : `全部动作 (${allPRRecords.length})`}</span>
            <svg
              className={`w-3 h-3 transition-transform ${showAllPRs ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Highlight Quick Chips */}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          {allPRRecords.slice(0, 2).map((pr) => (
            <div
              key={pr.id}
              onClick={() => setSelectedPRDetail(pr)}
              className="p-2.5 rounded-xl bg-[#18181B] hover:bg-[#202024] border border-white/5 hover:border-[#A4FF4F]/40 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="min-w-0 pr-1">
                <span className="text-xs font-medium text-neutral-200 block truncate group-hover:text-white">
                  {pr.exercise}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-[#A4FF4F] tracking-tight">{pr.value}</span>
                  <span className="text-[10px] text-neutral-400">{pr.unit}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#A4FF4F] bg-[#A4FF4F]/15 px-1.5 py-0.5 rounded shrink-0">
                {pr.change}
              </span>
            </div>
          ))}
          {!allPRRecords.length && !recordsData.loading && (
            <span className="col-span-2 py-2 text-center text-[11px] text-neutral-500">当前周期暂无突破记录</span>
          )}
        </div>

        {/* Collapsible Full PR Records Drawer */}
        {showAllPRs && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-fadeIn">
            <span className="text-[11px] text-neutral-400 font-medium block">
              历史全套动作最佳成绩档案：
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
              {allPRRecords.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => setSelectedPRDetail(pr)}
                  className="p-2.5 rounded-xl bg-[#18181B] border border-white/5 hover:border-[#A4FF4F]/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-medium truncate max-w-[85px]">{pr.exercise}</span>
                    <span className="text-[9px] font-mono text-[#A4FF4F] bg-[#A4FF4F]/15 px-1 py-0.5 rounded">
                      {pr.metricType}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-bold text-white">{pr.value}</span>
                    <span className="text-[10px] text-neutral-400">{pr.unit}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 flex justify-between font-mono">
                    <span>{pr.date}</span>
                    <span className="text-neutral-400">{pr.reps}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Hero Metric Card & Weekly Trend */}
      <section className="bg-[#141416] rounded-2xl p-4 border border-[#222226]" data-purpose="weekly-stats-card">
        {/* Top Metric */}
        <div className="space-y-1">
          <span className="text-xs text-neutral-400">{selectedPeriod}训练</span>
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold tracking-tight text-white inline-block">{selectedSummary.sessions} 次</span>
          </div>
        </div>

        {/* 3 Core Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#262629]">
          <div>
            <div className="flex items-baseline space-x-0.5">
              <span className="text-base font-bold text-white">{selectedSummary.completedSets}</span>
              <span className="text-[11px] text-[#8E8E93]">组</span>
            </div>
            <span className="text-[11px] text-[#707077] block mt-0.5">完成组数</span>
          </div>
          <div>
            <div className="flex items-baseline space-x-0.5">
              <span className="text-base font-bold text-white">{selectedSummary.durationMinutes}</span>
              <span className="text-[11px] text-[#8E8E93]">分</span>
            </div>
            <span className="text-[11px] text-[#707077] block mt-0.5">训练时长</span>
          </div>
          <div>
            <div className="flex items-baseline space-x-0.5">
              <span className="text-base font-bold text-white">{Math.round(selectedSummary.completionRate * 100)}%</span>
            </div>
            <span className="text-[11px] text-[#707077] block mt-0.5">计划完成率</span>
          </div>
        </div>

        {/* Weekly Bar Load Chart */}
        <div className="mt-6 pt-1 relative">
          <div className="h-24 flex items-end justify-between px-1.5 pb-1 relative">
            {weeklyData.map((item, idx) => {
              const isSelected = activeTooltipDay === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveTooltipDay(idx)}
                  className="flex flex-col items-center gap-1.5 w-6 relative cursor-pointer group"
                >
                  {/* Tooltip on Active Day */}
                  {isSelected && item.active && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#222225] border border-[#2E2E33] shadow-xl px-2 py-0.5 rounded-md flex items-center gap-1.5 z-20 pointer-events-none animate-fadeIn">
                      <span className="text-[10px] font-semibold text-white tracking-tight">
                        周{item.day} {item.sets}组 · {item.tonnage.toLocaleString()}kg
                      </span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#222225] rotate-45 border-r border-b border-[#2E2E33]" />
                    </div>
                  )}

                  {item.active ? (
                    <div
                      style={{ height: `${item.height}px` }}
                      className={`w-2.5 rounded-t-sm transition-all ${
                        isSelected
                          ? 'bg-[#A4FF4F] ring-2 ring-white/60 shadow-[0_0_12px_rgba(164,255,79,0.5)]'
                          : item.isPR
                          ? 'bg-[#A4FF4F] shadow-[0_0_12px_rgba(164,255,79,0.35)] ring-1 ring-[#A4FF4F]/40'
                          : 'bg-[#A4FF4F]/80 group-hover:bg-[#A4FF4F]'
                      }`}
                    />
                  ) : (
                    <div className={`w-2.5 h-1.5 rounded-full transition-colors ${isSelected ? 'bg-neutral-400' : 'bg-[#2A2A2E]'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between px-1.5 text-[11px] text-[#6E6E75] pt-1">
            {weeklyData.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTooltipDay(idx)}
                className={`w-6 text-center cursor-pointer transition-colors ${
                  activeTooltipDay === idx
                    ? 'font-bold text-white underline underline-offset-4 decoration-[#A4FF4F]'
                    : item.isPR
                    ? 'font-semibold text-[#A4FF4F]'
                    : 'text-[#6E6E75] hover:text-white'
                }`}
              >
                {item.day}
              </button>
            ))}
          </div>

          {/* Interactive Day Routine Log (Replaces duplicate isolated recent workout card) */}
          {weeklyData[activeTooltipDay] && (
            <div className="mt-3 pt-3 border-t border-[#262629] animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    周{weeklyData[activeTooltipDay].day} · {weeklyData[activeTooltipDay].routineName}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {weeklyData[activeTooltipDay].date}
                  </span>
                </div>
                {weeklyData[activeTooltipDay].active ? (
                  <span className="text-[10px] font-semibold text-[#A4FF4F] bg-[#A4FF4F]/10 px-2 py-0.5 rounded">
                    {weeklyData[activeTooltipDay].sets} 组 · {weeklyData[activeTooltipDay].tonnage.toLocaleString()} kg
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-500">休整日</span>
                )}
              </div>

              {weeklyData[activeTooltipDay].active && weeklyData[activeTooltipDay].exercises.length > 0 ? (
                <div className="space-y-1.5">
                  {weeklyData[activeTooltipDay].exercises.map((ex, exIdx) => (
                    <div
                      key={exIdx}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-200 font-medium">{ex.name}</span>
                        {ex.isPR && (
                          <span className="text-[9px] font-bold text-[#A4FF4F] bg-[#A4FF4F]/15 px-1 rounded">
                            PR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-neutral-400">{ex.sets}</span>
                        <span className="text-white font-semibold">{ex.max}</span>
                        <span className="text-neutral-500 text-[10px]">{ex.vol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 py-1 text-center">当日未安排重量训练，肌肉充分休息恢复中</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Body Feedback Card (Linked to Post-Workout Check-ins) */}
      <section className="bg-[#141416] rounded-2xl p-4 border border-[#222226]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-sm font-semibold text-white">身体状态追踪 · 动态档案</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">源自练后 3 秒打卡与教练反馈</span>
          </div>
          <span className="text-xs text-[#A4FF4F] bg-[#A4FF4F]/10 px-2 py-0.5 rounded-full font-medium">
            防伤避让联动中
          </span>
        </div>
        <div className="space-y-2.5">
          {displayBodyFeedbacks.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenCoachWithFeedback?.(item)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C1C1E]/80 border border-[#262629] cursor-pointer hover:border-white/20 transition group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.scoreColor === 'amber'
                        ? 'bg-amber-400'
                        : item.scoreColor === 'red'
                        ? 'bg-red-400'
                        : 'bg-[#A4FF4F]'
                    }`}
                  />
                  <span className="text-xs font-semibold text-white group-hover:text-[#A4FF4F] transition-colors">{item.part}</span>
                </div>
                <p className="text-[11px] text-[#A0A0A5]">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    item.scoreColor === 'amber'
                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/20'
                      : 'bg-[#A4FF4F]/15 text-[#A4FF4F] border-[#A4FF4F]/20'
                  }`}
                >
                  {item.score}
                </span>
                <span className="text-[10px] text-neutral-500 group-hover:text-white">问教练 →</span>
              </div>
            </div>
          ))}
          {!displayBodyFeedbacks.length && (
            <p className="py-2 text-center text-[11px] text-neutral-500">
              {recordsData.bodyFeedback?.warning || '暂无身体反馈记录'}
            </p>
          )}
        </div>
      </section>

      {/* Multi-Exercise Progressive Overload Trend Tracker (Integrated with Strength Progress) */}
      {activeTrend ? <section className="bg-[#141416] rounded-2xl p-4 border border-[#222226] space-y-3">
        {/* Header & Exercise Switcher */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-sm font-semibold text-white block tracking-tight">
                单动作渐进负荷追踪
              </span>
              <span className="text-[11px] text-[#8E8E93] mt-0.5 block">
                {activeTrend.category} · {activeTrend.target} · 估算 1RM: <strong className="text-white font-mono">{activeTrend.est1RM}</strong>
              </span>
            </div>
            {/* Integrated Strength Progress Metric */}
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#A4FF4F] bg-[#A4FF4F]/15 px-2 py-0.5 rounded-full font-bold inline-block">
                力量进阶 {activeTrend.gain}
              </span>
              <span className="text-[9px] text-neutral-400 block mt-0.5 font-mono">基准 {activeTrend.baseline}</span>
            </div>
          </div>

          {/* Exercise Switcher: Exactly 3 Core Tabs + 1 "More" Button fitting the screen width without overflow */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {primaryTrendEntries.map(([key, trend]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTrendExercise(key)}
                className={`text-xs py-1.5 rounded-lg transition-all cursor-pointer font-medium text-center truncate ${
                  selectedTrendExercise === key
                    ? 'bg-[#A4FF4F] text-black font-bold shadow-sm'
                    : 'bg-[#1C1C20] text-neutral-400 hover:text-white hover:bg-[#25252B]'
                }`}
              >
                {trend.name}
              </button>
            ))}

            {/* Extensible Exercises Selector Button (4th position) */}
            <button
              type="button"
              onClick={() => setShowExercisePickerModal(true)}
              className={`text-xs py-1.5 px-1 rounded-lg transition-all cursor-pointer font-medium flex items-center justify-center gap-1 border text-center truncate ${
                !primaryTrendKeys.includes(selectedTrendExercise)
                  ? 'bg-[#A4FF4F]/20 text-[#A4FF4F] border-[#A4FF4F]/50 font-bold'
                  : 'bg-[#1C1C20] text-neutral-300 border-white/10 hover:border-white/30'
              }`}
            >
              <span className="truncate">
                {!primaryTrendKeys.includes(selectedTrendExercise)
                  ? (activeTrend.name.length > 4 ? activeTrend.name.slice(0, 4) : activeTrend.name)
                  : '更多'}
              </span>
              <span className="text-[9px] text-neutral-400 shrink-0">▾</span>
            </button>
          </div>
        </div>

        {/* Dynamic Progression Summary & Active Node Tooltip */}
        <div className="flex items-center justify-between text-xs bg-[#18181B] px-3 py-1.5 rounded-xl border border-white/5 font-mono">
          <span className="text-neutral-400">{activeTrend.name}</span>
          {activeExercisePointIdx !== null && activeTrend.points[activeExercisePointIdx] ? (
            <span className="text-[#A4FF4F] font-bold">
              {activeTrend.points[activeExercisePointIdx].date}: {activeTrend.points[activeExercisePointIdx].weight.toFixed(1)}kg {activeTrend.points[activeExercisePointIdx].isPR ? '🏆(PR)' : ''}
            </span>
          ) : (
            <span className="text-[#A4FF4F] font-bold">{activeTrend.summary}</span>
          )}
        </div>

        {/* Dynamically Computed SVG Curve */}
        {(() => {
          const trendCurve = calcExerciseCurve(activeTrend.points);
          return (
            <div className="pt-2 pb-1 relative">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 320 50">
                <defs>
                  <linearGradient id={`trendGrad-${selectedTrendExercise}`} x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#A4FF4F" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A4FF4F" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area Fill */}
                <path d={trendCurve.areaD} fill={`url(#trendGrad-${selectedTrendExercise})`} />
                {/* Trend Line */}
                <path
                  d={trendCurve.lineD}
                  fill="none"
                  stroke="#A4FF4F"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                {/* Interactive Data Nodes */}
                {trendCurve.coords.map((c, idx) => {
                  const isSelected = activeExercisePointIdx === idx;
                  return (
                    <g key={idx} onClick={() => setActiveExercisePointIdx(idx)} className="cursor-pointer">
                      {c.isPR && (
                        <circle cx={c.cx} cy={c.cy} r={7} fill="#A4FF4F" opacity="0.25" className="animate-ping" />
                      )}
                      <circle
                        cx={c.cx}
                        cy={c.cy}
                        fill={c.isPR ? '#A4FF4F' : isSelected ? '#A4FF4F' : '#141416'}
                        r={isSelected ? 5.5 : c.isPR ? 4.5 : 3.5}
                        stroke={c.isPR ? '#ffffff' : '#A4FF4F'}
                        strokeWidth={isSelected ? 2.5 : 2}
                        className="transition-transform hover:scale-125"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Scheme A: Clean Dual-End Time Anchor + Span Summary */}
              <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1 mt-1 font-mono select-none">
                <span>
                  {activeTrend.points[0]?.date} <span className="text-neutral-500">基准 {activeTrend.baseline}</span>
                </span>
                <span className="text-neutral-500 hidden sm:inline">
                  共 {activeTrend.points.length} 次训练 · 进阶 {activeTrend.gain}
                </span>
                <span className="text-[#A4FF4F] font-semibold">
                  最新 {activeTrend.points[activeTrend.points.length - 1]?.date}
                  {activeTrend.points[activeTrend.points.length - 1]?.isPR ? ' (PR)' : ''}
                </span>
              </div>
            </div>
          );
        })()}
      </section> : (
        <section className="bg-[#141416] rounded-2xl p-4 border border-[#222226] text-xs text-neutral-500 text-center">
          当前周期暂无可用于力量趋势的已完成训练组
        </section>
      )}

      {/* Workout Heatmap & Body Weight (With Horizontally Scrollable Heatmap) */}
      <section className="bg-[#141416] rounded-2xl p-4 border border-[#222226] space-y-4">
        {/* Heatmap Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-sm font-semibold text-white block">训练热力图 · 历史出勤</span>
              <span className="text-[10px] text-[#7E7E87]">支持左右横向滑动查看近 24 周打卡足迹</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
              <span className="w-2 h-2 rounded-[2px] bg-[#222225]" />
              <span>休整</span>
              <span className="w-2 h-2 rounded-[2px] bg-[#A4FF4F]/50 ml-1" />
              <span>常态</span>
              <span className="w-2 h-2 rounded-[2px] bg-[#A4FF4F] ml-1" />
              <span className="text-[#A4FF4F] font-bold">高光</span>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="relative">
            {/* Scrollable Grid Area */}
            <div ref={heatmapScrollRef} className="overflow-x-auto no-scrollbar py-2 -mx-1 px-1 flex gap-2">
              {/* Day of Week Labels */}
              <div className="flex flex-col justify-between py-5 text-[9px] text-neutral-500 font-mono select-none shrink-0 w-3">
                <span>一</span>
                <span>三</span>
                <span>五</span>
                <span>日</span>
              </div>

              {/* Weeks Columns Scroll */}
              <div className="flex flex-col gap-1 min-w-max pb-1">
                {/* Months Header row */}
                <div className="flex text-[10px] text-neutral-400 font-mono mb-1 select-none">
                  {heatmap.months.map((month, index) => (
                    <span key={`${month.label}-${index}`} style={{ width: `${month.weeks * 18}px` }} className={index === heatmap.months.length - 1 ? 'text-[#A4FF4F] font-semibold' : ''}>
                      {month.label}{index === heatmap.months.length - 1 ? '(当前)' : ''}
                    </span>
                  ))}
                </div>

                {/* 7 rows for Mon-Sun */}
                {heatmap.rows.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex gap-1.5">
                    {row.map((cell, weekIdx) => (
                      <div
                        key={weekIdx}
                        title={cell.value === 2 ? `${cell.date} · 高光训练 · ${cell.sets}组` : cell.value === 1 ? `${cell.date} · 训练完成 · ${cell.sets}组` : `${cell.date} · 休息日`}
                        className={`w-3 h-3 rounded-[2.5px] transition-all cursor-pointer hover:scale-125 ${
                          cell.value === 2
                            ? 'bg-[#A4FF4F] shadow-[0_0_6px_rgba(164,255,79,0.8)] ring-1 ring-white'
                            : cell.value === 1
                            ? 'bg-[#A4FF4F]/75 hover:bg-[#A4FF4F]'
                            : 'bg-[#202024] hover:bg-[#2A2A30]'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-neutral-500 pt-1">
              <span>◂ 向左滑动回溯春季</span>
              <span className="font-mono text-[#A4FF4F]">总出勤 {heatmap.totalAttendance} 次</span>
            </div>
          </div>
        </div>

        {/* Body Weight Trend & Logging Action Button */}
        <div className="pt-3 border-t border-[#262629] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#8E8E93] whitespace-nowrap">体重追踪</span>
                <span className="text-[9px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                  最新: {activeWeightDataset.points[activeWeightDataset.points.length - 1]?.date || '--'}
                </span>
              </div>
              {/* Guaranteed Single Line Display */}
              <div className="flex items-baseline gap-1.5 mt-0.5 whitespace-nowrap">
                <span className="text-lg font-bold text-white tracking-tight font-mono whitespace-nowrap">
                  {currentWeight?.toFixed(1) ?? '--'} <span className="text-xs text-neutral-400 font-normal">kg</span>
                </span>
                {currentWeight != null && activeWeightDataset.points.length > 0 && (
                  <span className="text-xs font-semibold text-[#A4FF4F] font-mono whitespace-nowrap">
                    ({activeWeightDataset.label} {currentWeight - activeWeightDataset.baseline > 0 ? '+' : ''}{(currentWeight - activeWeightDataset.baseline).toFixed(1)}kg)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Real Weight Logging Button */}
              <button
                type="button"
                onClick={() => {
                  setInputWeight(currentWeight?.toFixed(1) ?? '');
                  setShowWeightModal(true);
                }}
                className="text-xs font-semibold text-[#A4FF4F] bg-[#A4FF4F]/15 hover:bg-[#A4FF4F]/25 border border-[#A4FF4F]/30 px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <span>+ 记体重</span>
              </button>
            </div>
          </div>

          {(bodyWeight.warning || bodyWeight.error) && (
            <p className={`text-[10px] ${bodyWeight.error ? 'text-red-300' : 'text-neutral-500'}`}>
              {bodyWeight.error || bodyWeight.warning}
            </p>
          )}

          {/* Full-width Weight Trend Line Chart with Period Switcher */}
          <div className="bg-[#18181B] rounded-xl p-3 border border-white/5 space-y-2.5">
            {/* Header: Title + Period Selector Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">{activeWeightDataset.label}走势曲线</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activeWeightDataset.points.length
                    ? `高: ${Math.max(...activeWeightDataset.points.map((point) => point.weight)).toFixed(1)} · 低: ${Math.min(...activeWeightDataset.points.map((point) => point.weight)).toFixed(1)}kg`
                    : '暂无记录'}
                </span>
              </div>

              {/* Time Range Pills */}
              <div className="flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-white/5">
                {(['7d', '30d', '90d', '180d'] as const).map((key) => {
                  const labels: Record<string, string> = {
                    '7d': '7天',
                    '30d': '30天',
                    '90d': '90天',
                    '180d': '半年',
                  };
                  const isSelected = weightPeriod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setWeightPeriod(key)}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium ${
                        isSelected
                          ? 'bg-[#A4FF4F] text-black font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SVG Trend Chart Area (Smooth Spline, Non-scaling Stroke, Zero Distortion) */}
            <div className="w-full h-24 relative select-none">
              {/* HTML Absolute Reference Labels - 100% Crisp, Zero Distorting */}
              <div className="absolute left-1.5 top-1 text-[9px] font-mono text-neutral-500 pointer-events-none select-none">
                {activeWeightDataset.yMax.toFixed(1)}kg
              </div>
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-neutral-500 pointer-events-none select-none">
                {((activeWeightDataset.yMax + activeWeightDataset.yMin) / 2).toFixed(1)}kg
              </div>
              <div className="absolute left-1.5 bottom-1 text-[9px] font-mono text-neutral-500 pointer-events-none select-none">
                {activeWeightDataset.yMin.toFixed(1)}kg
              </div>

              {/* Reference Grid lines */}
              <div className="absolute left-12 right-2 top-2 border-b border-dashed border-white/5 pointer-events-none" />
              <div className="absolute left-12 right-2 top-1/2 border-b border-dashed border-white/5 pointer-events-none" />
              <div className="absolute left-12 right-2 bottom-2 border-b border-dashed border-white/5 pointer-events-none" />

              {/* Calculations for Smooth Spline & Coordinates */}
              {activeWeightDataset.points.length ? (() => {
                const total = activeWeightDataset.points.length;
                const minW = activeWeightDataset.yMin;
                const maxW = activeWeightDataset.yMax;
                const range = maxW - minW || 1;

                // ViewBox: 0 to 100 on X, 0 to 100 on Y
                // X range: 18% to 92% (left margin for labels)
                // Y range: 15% (top) to 85% (bottom)
                const coords = activeWeightDataset.points.map((p, idx) => {
                  const x = 18 + (idx / Math.max(1, total - 1)) * 74;
                  const clamped = Math.max(minW, Math.min(maxW, p.weight));
                  const y = 82 - ((clamped - minW) / range) * 64;
                  return { ...p, x, y };
                });

                // Generate Smooth Cubic Bezier Spline
                let splineD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
                for (let i = 0; i < coords.length - 1; i++) {
                  const p0 = coords[i === 0 ? 0 : i - 1];
                  const p1 = coords[i];
                  const p2 = coords[i + 1];
                  const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

                  const cp1x = p1.x + (p2.x - p0.x) / 5;
                  const cp1y = p1.y + (p2.y - p0.y) / 5;
                  const cp2x = p2.x - (p3.x - p1.x) / 5;
                  const cp2y = p2.y - (p3.y - p1.y) / 5;

                  splineD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                }

                const areaSplineD = `${splineD} L ${coords[coords.length - 1].x.toFixed(1)} 98 L ${coords[0].x.toFixed(1)} 98 Z`;

                return (
                  <>
                    {/* SVG Curve Layer with non-scaling-stroke */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="weightSmoothGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A4FF4F" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#A4FF4F" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaSplineD} fill="url(#weightSmoothGrad)" />
                      <path
                        d={splineD}
                        fill="none"
                        stroke="#A4FF4F"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    {/* HTML Circular Nodes - 100% Perfectly Round on Any Screen */}
                    {coords.map((c, i) => {
                      const isLatest = i === coords.length - 1;
                      const isSelected = activeWeightPointIdx === i;
                      return (
                        <div
                          key={i}
                          onClick={() => setActiveWeightPointIdx(i)}
                          style={{ left: `${c.x}%`, top: `${c.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 flex items-center justify-center group"
                        >
                          {isLatest && (
                            <span className="absolute w-5 h-5 rounded-full bg-[#A4FF4F] opacity-25 animate-ping pointer-events-none" />
                          )}
                          <div
                            className={`rounded-full transition-all duration-200 ${
                              isSelected
                                ? 'w-3.5 h-3.5 bg-[#A4FF4F] ring-4 ring-[#A4FF4F]/30 shadow-[0_0_8px_#A4FF4F]'
                                : isLatest
                                ? 'w-3 h-3 bg-[#A4FF4F] ring-2 ring-white shadow-[0_0_6px_rgba(164,255,79,0.8)]'
                                : 'w-2.5 h-2.5 bg-[#18181B] border-2 border-[#A4FF4F] group-hover:scale-125 group-hover:bg-[#A4FF4F]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </>
                );
              })() : (
                <div className="h-full flex items-center justify-center text-[11px] text-neutral-500">
                  {bodyWeight.loading ? '正在加载体重记录…' : '暂无体重记录'}
                </div>
              )}

              {/* Active Point Floating Tooltip if Selected */}
              {activeWeightPointIdx !== null && activeWeightDataset.points[activeWeightPointIdx] && (
                <div className="absolute top-1 right-2 bg-black/95 border border-[#A4FF4F]/60 px-2.5 py-1 rounded-lg text-[10px] font-mono text-white shadow-xl pointer-events-none flex items-center gap-1.5 animate-fadeIn z-20">
                  <span className="text-neutral-400">{activeWeightDataset.points[activeWeightPointIdx].date}</span>
                  <span className="text-white font-semibold">记录:</span>
                  <strong className="text-[#A4FF4F] font-bold text-xs">{activeWeightDataset.points[activeWeightPointIdx].weight.toFixed(1)}kg</strong>
                </div>
              )}
            </div>

            {/* Scheme A: Clean Dual-End Time Anchor + Span Summary */}
            <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1 pt-1.5 border-t border-white/5 font-mono select-none">
              <span>
                {activeWeightDataset.points[0]?.date} <span className="text-neutral-500">起点</span>
              </span>
              <span className="text-neutral-500">
                共 {activeWeightDataset.label.replace('近 ', '')} · {activeWeightDataset.points.length} 次称重
              </span>
              <span className="text-[#A4FF4F] font-semibold">
                最新 {activeWeightDataset.points[activeWeightDataset.points.length - 1]?.date}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Extensible Exercise Picker Modal */}
      {showExercisePickerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-[380px] bg-[#18181B] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-4 space-y-3.5 shadow-2xl animate-fadeIn max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <div>
                <h3 className="font-bold text-white text-sm">选择追踪动作</h3>
                <span className="text-[11px] text-neutral-400">已收录您训练过的所有动作与力量进阶</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExercisePickerModal(false)}
                className="w-7 h-7 rounded-full bg-[#242428] hover:bg-[#2F2F35] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Categorized List */}
            <div className="overflow-y-auto space-y-3 pr-1">
              {trendCategories.map((muscleGroup) => {
                const groupExercises = trendEntries.filter(
                  ([_, ex]) => ex.category === muscleGroup
                );
                if (groupExercises.length === 0) return null;

                return (
                  <div key={muscleGroup} className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-400 block px-1">
                      {muscleGroup} ({groupExercises.length})
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {groupExercises.map(([key, ex]) => {
                        const isCurrent = selectedTrendExercise === key;
                        return (
                          <div
                            key={key}
                            onClick={() => {
                              setSelectedTrendExercise(key);
                              setShowExercisePickerModal(false);
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-[#A4FF4F]/10 border-[#A4FF4F]/40'
                                : 'bg-[#202024] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-semibold ${isCurrent ? 'text-[#A4FF4F]' : 'text-white'}`}>
                                  {ex.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-400 block mt-0.5">
                                {ex.target} · 1RM: {ex.est1RM}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-[#A4FF4F] block">
                                {ex.gain}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                基准 {ex.baseline}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weight Logging Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-[340px] bg-[#18181B] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-4 space-y-4 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div>
                <h3 className="font-bold text-white text-sm">记录今日体重</h3>
                <span className="text-[10px] text-neutral-400">建议在早晨空腹时称量，数据更稳定</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWeightModal(false)}
                className="w-7 h-7 rounded-full bg-[#242428] hover:bg-[#2F2F35] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Number Display & Quick Adjuster */}
            <div className="bg-[#121214] rounded-2xl p-4 border border-white/5 text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(inputWeight) - 0.1;
                    if (val > 30) setInputWeight(val.toFixed(1));
                  }}
                  className="w-9 h-9 rounded-xl bg-[#242428] hover:bg-[#2D2D33] text-white font-bold text-lg flex items-center justify-center transition cursor-pointer"
                >
                  -
                </button>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-28 text-center text-3xl font-extrabold text-white bg-transparent border-b border-[#A4FF4F]/50 focus:border-[#A4FF4F] outline-none font-mono"
                  />
                  <span className="text-sm font-semibold text-neutral-400">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(inputWeight) + 0.1;
                    if (val < 250) setInputWeight(val.toFixed(1));
                  }}
                  className="w-9 h-9 rounded-xl bg-[#242428] hover:bg-[#2D2D33] text-white font-bold text-lg flex items-center justify-center transition cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Condition Tags */}
              <div className="flex justify-center gap-2 pt-1">
                {(['晨起空腹', '练后即刻', '晚间称重'] as const).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setWeightCondition(cond)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                      weightCondition === cond
                        ? 'bg-[#A4FF4F]/15 text-[#A4FF4F] border-[#A4FF4F]/40 font-semibold'
                        : 'bg-[#1C1C20] text-neutral-400 border-transparent hover:text-white'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {bodyWeight.error && (
              <p className="text-center text-[11px] text-red-300">{bodyWeight.error}</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#242428] hover:bg-[#2C2C32] text-xs font-semibold text-neutral-300 transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveWeight}
                disabled={bodyWeight.saving || !Number.isFinite(Number.parseFloat(inputWeight)) || Number.parseFloat(inputWeight) <= 30 || Number.parseFloat(inputWeight) >= 250}
                className="flex-1 py-2.5 rounded-xl bg-[#A4FF4F] hover:bg-[#92EE40] text-black text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {bodyWeight.saving ? '保存中…' : '确认打卡'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PR Detail Modal */}
      {selectedPRDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[#18181B] border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight">{selectedPRDetail.exercise}</h3>
                  <span className="text-[10px] text-[#A4FF4F] font-mono">{selectedPRDetail.muscle} · {selectedPRDetail.metricType}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPRDetail(null)}
                className="w-7 h-7 rounded-full bg-[#242428] hover:bg-[#2F2F35] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Current Record Showcase */}
            <div className="bg-[#121214] rounded-xl p-3 border border-[#A4FF4F]/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">当前个人最佳 (PR)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-extrabold text-[#A4FF4F] tracking-tight">{selectedPRDetail.value}</span>
                  <span className="text-xs text-neutral-400">{selectedPRDetail.unit}</span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  达成状态: {selectedPRDetail.reps} · {selectedPRDetail.date}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block font-medium">估算 1RM 极限</span>
                <span className="text-sm font-bold text-white block mt-0.5">{selectedPRDetail.estimated1RM}</span>
                <span className="text-[10px] text-[#A4FF4F] bg-[#A4FF4F]/15 px-1.5 py-0.5 rounded font-bold inline-block mt-1">
                  突破 {selectedPRDetail.change}
                </span>
              </div>
            </div>

            {/* Coach Insight Note */}
            <div className="p-2.5 rounded-xl bg-[#141416] border border-white/5 space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <span>💡</span>
                <span>突破技术要点</span>
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                {selectedPRDetail.note}
              </p>
            </div>

            {/* Historical Progression Timeline */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-medium block">历史演进轨迹</span>
              <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar text-xs">
                {selectedPRDetail.history.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-[#141416] border border-white/5 text-[11px]"
                  >
                    <span className="text-neutral-400 font-mono">{h.date}</span>
                    <span className="text-white font-medium">{h.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-1 flex gap-2">
              <button
                onClick={() => setSelectedPRDetail(null)}
                className="flex-1 py-2.5 bg-[#A4FF4F] hover:bg-[#94ED42] text-black font-bold text-xs rounded-xl transition cursor-pointer"
                type="button"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
