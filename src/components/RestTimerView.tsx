import React, { useState, useEffect, useRef } from 'react';
import { Exercise } from '../types';
import { soundManager } from '../utils/sound';

interface RestTimerViewProps {
  exercise: Exercise;
  completedSetNumber: number;
  nextSetNumber: number;
  nextWeight: number;
  nextReps: number;
  initialSeconds?: number;
  onFinishRest: () => void;
  onAskCoach?: (question: string) => void;
}

export const RestTimerView: React.FC<RestTimerViewProps> = ({
  exercise,
  completedSetNumber,
  nextSetNumber,
  nextWeight,
  nextReps,
  initialSeconds = 88, // Default 01:28 as shown in the screenshot
  onFinishRest,
  onAskCoach,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isSoundMuted, setIsSoundMuted] = useState(!soundManager.soundEnabled);

  // SVG parameters
  const radius = 130;
  const circumference = 2 * Math.PI * radius; // 816.81

  // Keep track of sound already played for 3, 2, 1
  const playedBeepRef = useRef<{ [sec: number]: boolean }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          soundManager.playFinishChime();
          soundManager.vibrate([150, 60, 200]);
          setTimeout(onFinishRest, 400);
          return 0;
        }

        // Play gentle warning beeps at 3, 2, 1 seconds
        if (prev <= 4 && prev > 1 && !playedBeepRef.current[prev - 1]) {
          playedBeepRef.current[prev - 1] = true;
          soundManager.playBeep(620, 0.07);
          soundManager.vibrate(40);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinishRest]);

  const handleMinus = (seconds: number = 15) => {
    setRemainingSeconds((prev) => {
      const updated = Math.max(0, prev - seconds);
      if (updated === 0) {
        soundManager.playFinishChime();
        soundManager.vibrate([100, 50, 100]);
        setTimeout(onFinishRest, 200);
      } else {
        soundManager.vibrate(20);
      }
      return updated;
    });
  };

  const handlePlus = (seconds: number = 15) => {
    soundManager.vibrate(20);
    setRemainingSeconds((prev) => {
      const next = prev + seconds;
      if (next > totalSeconds) {
        setTotalSeconds(next);
      }
      return next;
    });
  };

  const toggleSound = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    soundManager.soundEnabled = !nextState;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Dashoffset calculation: 1.0 = empty ring, 0.0 = full ring
  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const contextQuestions = [
    `刚完成这组很吃力，下组需要减重吗？`,
    `${exercise.name} 动作节奏怎么保持？`,
    `右肩如果微酸，怎么微调动作？`,
  ];

  return (
    <div
      id="rest-timer-screen"
      className="flex-1 flex flex-col justify-between p-5 select-none relative overflow-hidden"
    >
      {/* Top Header metadata & Sound Switch */}
      <header className="pt-2 flex items-center justify-between relative z-10 px-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161618] border border-white/10 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#A4FF4F] animate-pulse" />
          <span className="text-xs font-medium text-neutral-300">
            {exercise.name} · 第 {completedSetNumber} 组已完成
          </span>
        </div>

        {/* Mute/Sound Toggle */}
        <button
          onClick={toggleSound}
          className="p-2 rounded-full bg-[#161618] border border-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
          title={isSoundMuted ? '开启提示音' : '关闭提示音'}
          type="button"
        >
          {isSoundMuted ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#A4FF4F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </header>

      {/* Timer Core Display */}
      <section className="flex-1 flex flex-col items-center justify-center my-auto relative py-2">
        <div className="relative flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-[260px] h-[260px] rounded-full bg-[#A4FF4F]/5 blur-2xl animate-pulse pointer-events-none" />

          {/* SVG Countdown Ring */}
          <svg className="w-[270px] h-[270px] -rotate-90 relative z-10" viewBox="0 0 280 280">
            <defs>
              <linearGradient id="timer-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#D4FF78" />
                <stop offset="100%" stopColor="#A4FF4F" />
              </linearGradient>
              <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" floodColor="#A4FF4F" floodOpacity="0.45" stdDeviation="6" />
              </filter>
            </defs>
            {/* Background Track Circle */}
            <circle
              className="stroke-[#1D1D22]"
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              strokeWidth="4"
            />
            {/* Animated Glow Indicator Circle */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              filter="url(#glow-effect)"
              stroke="url(#timer-gradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
            />
          </svg>

          {/* Centered Timer Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="text-xs text-neutral-400 font-medium mb-1 flex items-center gap-1">
              <span>⏳</span>
              <span>组间间歇计时</span>
            </div>
            <div
              id="time-display"
              className="font-extrabold text-6xl text-white tracking-tight my-1 tabular-nums font-mono"
            >
              {formatTime(remainingSeconds)}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161618] border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A4FF4F]" />
              <span className="text-xs font-medium text-neutral-300 tracking-tight">
                下一组：第 {nextSetNumber} 组 · {nextWeight} kg × {nextReps}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contextual AI Prompt Bubbles during rest */}
      <section className="mb-3 px-1">
        <div className="text-[11px] text-neutral-500 font-medium mb-1.5 flex items-center gap-1">
          <span>💡</span>
          <span>休息间隙·快速向 AI 教练提问</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {contextQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onAskCoach?.(q)}
              className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#222227] text-neutral-300 hover:text-[#A4FF4F] border border-white/5 hover:border-[#A4FF4F]/30 transition active:scale-95 cursor-pointer flex items-center gap-1"
              type="button"
            >
              <span>💭</span>
              <span className="truncate max-w-[200px]">{q}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Rest Controls */}
      <section className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            id="btn-minus"
            onClick={() => handleMinus(15)}
            className="bg-[#1C1C1E] text-white px-3 py-2.5 rounded-xl font-mono text-xs border border-white/5 active:scale-95 transition-all flex items-center justify-center shadow-md flex-1 h-11 cursor-pointer"
            type="button"
          >
            -15s
          </button>
          <button
            id="btn-skip"
            onClick={onFinishRest}
            className="bg-[#A4FF4F] hover:bg-[#94ED42] text-black px-4 py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-[1.6] h-11 cursor-pointer"
            type="button"
          >
            <span>直接开始下一组</span>
            <span className="text-xs font-mono">▶▶</span>
          </button>
          <button
            id="btn-plus-15"
            onClick={() => handlePlus(15)}
            className="bg-[#1C1C1E] text-white px-3 py-2.5 rounded-xl font-mono text-xs border border-white/5 active:scale-95 transition-all flex items-center justify-center shadow-md flex-1 h-11 cursor-pointer"
            type="button"
          >
            +15s
          </button>
          <button
            id="btn-plus-30"
            onClick={() => handlePlus(30)}
            className="bg-[#1C1C1E] text-white px-3 py-2.5 rounded-xl font-mono text-xs border border-white/5 active:scale-95 transition-all flex items-center justify-center shadow-md flex-1 h-11 cursor-pointer"
            type="button"
          >
            +30s
          </button>
        </div>

        {/* Breathing Guide Footer */}
        <footer className="w-full flex justify-center">
          <p className="text-xs text-neutral-400 text-center">深呼吸，放松肩背，准备下一组爆发力。</p>
        </footer>
      </section>
    </div>
  );
};
