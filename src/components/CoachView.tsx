import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, BodyFeedbackRecord } from '../types';

interface CoachViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onConfirmFeedback: (msgId: string, feedback: { exercise: string; location: string; discomfortLevel: string; note: string }) => void;
  onNewChat: () => void;
  onBack?: () => void;
  currentWorkoutContext?: {
    currentExercise: string;
    currentSet: number;
    totalSets: number;
  };
}

export const CoachView: React.FC<CoachViewProps> = ({
  messages,
  onSendMessage,
  onConfirmFeedback,
  onNewChat,
  onBack,
  currentWorkoutContext = {
    currentExercise: '坐姿绳索划船',
    currentSet: 6,
    totalSets: 12,
  },
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, 'like' | 'dislike'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);
    try {
      await onSendMessage(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceRecording = () => {
    setIsVoiceModalOpen(true);
    setVoiceTranscript('');
    setIsListening(true);

    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Speech recognition not available or blocked in sandbox, fallback with standard preset prompt
      setTimeout(() => {
        setVoiceTranscript('当前动作最后一组完成得比较轻松，下组建议加重多少？');
        setIsListening(false);
      }, 1500);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentText);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      setIsListening(false);
      setVoiceTranscript('今天划船右肩前侧微酸，需要调整握距吗？');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleVoiceSend = () => {
    stopVoiceRecording();
    setIsVoiceModalOpen(false);
    if (voiceTranscript.trim()) {
      handleSend(voiceTranscript.trim());
    }
  };

  const handleVoiceFillInput = () => {
    stopVoiceRecording();
    setIsVoiceModalOpen(false);
    if (voiceTranscript.trim()) {
      setInputText(voiceTranscript.trim());
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRate = (id: string, type: 'like' | 'dislike') => {
    setLikedMap((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined : (type as any),
    }));
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden select-none relative pb-[58px]">
      {/* Top Navigation */}
      <section className="px-4 pt-2.5 pb-2 flex items-center justify-between z-20 shrink-0 border-b border-white/5 bg-[#0B0B0C]">
        <div className="flex items-center gap-2">
          <h1 className="text-[20px] font-bold tracking-tight text-white">AI 教练</h1>
        </div>

        {/* Action Group: History capsule & New chat */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="h-8 px-3 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center gap-1.5 active:bg-[#252528] transition text-[12px] text-[#8E8E93] hover:text-white cursor-pointer"
            type="button"
          >
            <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium">历史</span>
          </button>
          <button
            onClick={onNewChat}
            aria-label="新建对话"
            className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white active:bg-[#252528] transition cursor-pointer"
            title="新建对话"
            type="button"
          >
            <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Live Training Context Banner */}
      <div className="px-4 py-2 shrink-0 bg-[#0B0B0C]">
        <div className="w-full bg-[#141416] border border-white/5 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden text-[12.5px]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#A4FF4F] animate-pulse shrink-0" />
            <span className="text-[#D1D1D6] truncate">
              训练进行中 · <span className="text-white font-medium">{currentWorkoutContext.currentSet}/{currentWorkoutContext.totalSets} 组</span> · 当前：<span className="text-white font-medium">{currentWorkoutContext.currentExercise}</span>
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-[#A4FF4F] shrink-0 ml-2">
            LIVE
          </span>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-20 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <section key={msg.id} className="flex flex-col items-end pt-1">
                <span className="text-[10px] text-white/40 mb-1 pr-1 font-mono">{msg.time}</span>
                <div className="bg-[#A4FF4F] text-black font-medium text-[13.5px] leading-relaxed rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[275px] shadow-[0_2px_8px_rgba(164,255,79,0.15)]">
                  {msg.text}
                </div>
              </section>
            );
          }

          // Assistant message
          return (
            <section key={msg.id} className="flex gap-2.5 items-start">
              {/* Robot Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#193214] border border-[#2D5A24] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <svg className="w-4 h-4 text-[#A4FF4F] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                </svg>
              </div>

              <div className="flex flex-col gap-2.5 max-w-[290px]">
                {/* Speech Bubble */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl rounded-tl-xs p-3.5 text-[13px] leading-relaxed text-[#ECECED] shadow-sm whitespace-pre-line">
                  {msg.text}
                </div>

                {/* Proposed Feedback Card */}
                {msg.proposedFeedback && !msg.isFeedbackRecorded && (
                  <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-3.5 shadow-md">
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-normal">动作</span>
                        <span className="text-white font-medium">{msg.proposedFeedback.exercise}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-normal">位置</span>
                        <span className="text-white font-medium">{msg.proposedFeedback.location}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-normal">不适程度</span>
                        <span className="text-[#A4FF4F] font-bold">{msg.proposedFeedback.discomfortLevel}</span>
                      </div>
                      <div className="flex justify-between items-start pt-0.5">
                        <span className="text-neutral-400 font-normal shrink-0">备注</span>
                        <span className="text-white text-right leading-tight ml-4 font-normal">
                          {msg.proposedFeedback.note}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-white/10">
                      <button
                        onClick={() =>
                          onConfirmFeedback(msg.id, {
                            ...msg.proposedFeedback!,
                            discomfortLevel: '0 / 10',
                          })
                        }
                        className="flex-1 py-1.5 text-center text-[12px] font-medium text-neutral-400 bg-[#141416] hover:bg-[#252528] rounded-lg active:scale-95 transition cursor-pointer"
                        type="button"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => onConfirmFeedback(msg.id, msg.proposedFeedback!)}
                        className="flex-1 py-1.5 text-center text-[12px] font-semibold text-black bg-[#A4FF4F] hover:brightness-105 rounded-lg active:scale-95 transition shadow-sm cursor-pointer"
                        type="button"
                      >
                        确认写入
                      </button>
                    </div>
                  </div>
                )}

                {/* Recorded State Banner */}
                {msg.isFeedbackRecorded && (
                  <div className="bg-[#193214] border border-[#2D5A24] rounded-xl px-3 py-2 flex items-center justify-between shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#A4FF4F]/20 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-[#A4FF4F] stroke-current stroke-[2.2] fill-none" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-[#A4FF4F]">已记录到训练反馈</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {msg.proposedFeedback?.exercise || '坐姿绳索划船'} · {msg.proposedFeedback?.location || '右肩前侧'} · {msg.proposedFeedback?.discomfortLevel || '4/10'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">刚刚</span>
                  </div>
                )}

                {/* Message Action Utilities */}
                <div className="flex items-center justify-end space-x-3 pt-1 text-white/40">
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-white transition cursor-pointer text-xs"
                    title="复制"
                    type="button"
                  >
                    {copiedId === msg.id ? (
                      <span className="text-[10px] text-[#A4FF4F]">已复制</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleRate(msg.id, 'like')}
                    className={`transition cursor-pointer ${likedMap[msg.id] === 'like' ? 'text-[#A4FF4F]' : 'hover:text-[#A4FF4F]'}`}
                    title="点赞"
                    type="button"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2m-7 0H4a2 2 0 00-2 2v6a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRate(msg.id, 'dislike')}
                    className={`transition cursor-pointer ${likedMap[msg.id] === 'dislike' ? 'text-red-400' : 'hover:text-red-400'}`}
                    title="点踩"
                    type="button"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76 1.04a2 2 0 011.001.9V14m-10 0v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m7 0h3a2 2 0 002-2V6a2 2 0 00-2-2h-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          );
        })}

        {/* Suggested Prompts Stream */}
        {messages.length <= 4 && (
          <section className="pl-10 space-y-2 pt-1">
            <p className="text-[12px] text-neutral-400 flex items-center gap-1">
              你可以这样问我：<span>💡</span>
            </p>
            <div className="flex flex-col items-start gap-2">
              {[
                '下一组要不要加重量？',
                '当前 RIR 2，下一组怎么做？',
                '划船动作不舒服，怎么调整？',
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-[12.5px] text-neutral-200 bg-[#18181B] hover:bg-[#222226] active:scale-[0.98] border border-white/5 px-3.5 py-1.5 rounded-full transition shadow-sm cursor-pointer"
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading Indicator */}
        {isSending && (
          <section className="flex gap-2.5 items-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#193214] border border-[#2D5A24] flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#A4FF4F] animate-ping" />
            </div>
            <div className="bg-[#141416] border border-white/5 rounded-2xl rounded-tl-xs p-3 text-xs text-neutral-400">
              AI 教练思考中...
            </div>
          </section>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar - Flex docked cleanly above bottom navigation bar */}
      <div className="shrink-0 w-full px-4 py-2.5 bg-[#0B0B0C] border-t border-white/10 z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Input text box */}
          <div className="flex-1 h-11 bg-[#141416] border border-white/10 rounded-full px-4 flex items-center justify-between shadow-lg focus-within:border-[#A4FF4F]/50 transition">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="问教练，或点击右侧语音..."
              className="bg-transparent border-0 text-white placeholder-neutral-500 text-[13.5px] w-full p-0 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={startVoiceRecording}
              aria-label="语音输入"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                isListening
                  ? 'text-black bg-[#A4FF4F] shadow-sm animate-pulse'
                  : 'text-neutral-400 hover:text-[#A4FF4F] hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="发送消息"
            className={`w-11 h-11 rounded-full bg-[#A4FF4F] flex items-center justify-center shrink-0 active:scale-95 transition shadow-[0_2px_10px_rgba(164,255,79,0.25)] cursor-pointer ${
              !inputText.trim() || isSending ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-105'
            }`}
          >
            <svg className="w-4 h-4 text-black fill-current translate-x-0.5 -translate-y-0.5" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Voice Input Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-[#18181B] border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#A4FF4F]/20 flex items-center justify-center text-[#A4FF4F]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">语音输入</h3>
                  <span className="text-[11px] text-[#A4FF4F] font-medium">
                    {isListening ? '正在倾听中...' : '录音就绪'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  stopVoiceRecording();
                  setIsVoiceModalOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Pulsing Audio Waveform */}
            <div className="py-4 bg-[#121214] rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 h-10">
                <span className={`w-1.5 rounded-full bg-[#A4FF4F] transition-all duration-300 ${isListening ? 'h-8 animate-bounce' : 'h-2'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-1.5 rounded-full bg-[#A4FF4F] transition-all duration-300 ${isListening ? 'h-10 animate-bounce' : 'h-3'}`} style={{ animationDelay: '150ms' }} />
                <span className={`w-1.5 rounded-full bg-[#A4FF4F] transition-all duration-300 ${isListening ? 'h-6 animate-bounce' : 'h-2'}`} style={{ animationDelay: '300ms' }} />
                <span className={`w-1.5 rounded-full bg-[#A4FF4F] transition-all duration-300 ${isListening ? 'h-9 animate-bounce' : 'h-4'}`} style={{ animationDelay: '450ms' }} />
                <span className={`w-1.5 rounded-full bg-[#A4FF4F] transition-all duration-300 ${isListening ? 'h-5 animate-bounce' : 'h-2'}`} style={{ animationDelay: '200ms' }} />
              </div>
              <span className="text-[11px] text-neutral-400">
                {isListening ? '请对准麦克风说话，AI 教练实时转写' : '点击下方快捷提问或重试录音'}
              </span>
            </div>

            {/* Recognized Text Display */}
            <div className="min-h-[72px] max-h-32 overflow-y-auto p-3 rounded-xl bg-[#141416] border border-white/10 text-xs text-white leading-relaxed">
              {voiceTranscript ? (
                <span className="text-white font-medium">{voiceTranscript}</span>
              ) : (
                <span className="text-neutral-500 italic">“等待说话中，可随时点击下方健身快捷问句...”</span>
              )}
            </div>

            {/* Quick Voice Prompts for Gym Scenarios */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-medium block">健身房常用语音快捷问句：</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                {[
                  '当前卧推最后一组有点吃力，下一组建议降重吗？',
                  '今天划船右肩前侧有点不舒服，怎么调整？',
                  '器械被占用了，有替代动作推荐吗？',
                  '感觉小臂酸，怎么更好地发力找背阔肌泵感？',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setVoiceTranscript(prompt);
                      setIsListening(false);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#202024] hover:bg-[#28282E] text-neutral-300 hover:text-white border border-white/5 transition cursor-pointer text-left"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleVoiceFillInput}
                disabled={!voiceTranscript.trim()}
                className="flex-1 py-3 bg-[#242428] hover:bg-[#2C2C32] disabled:opacity-40 text-neutral-300 hover:text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                填入输入框
              </button>
              <button
                type="button"
                onClick={handleVoiceSend}
                disabled={!voiceTranscript.trim()}
                className="flex-1 py-3 bg-[#A4FF4F] hover:bg-[#94ED42] disabled:opacity-40 text-black font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-[#A4FF4F]/20"
              >
                立即发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[#18181B] border border-white/10 rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-bold text-white text-sm">对话与反馈历史</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar text-xs">
              <div className="p-2.5 rounded-lg bg-[#141416] border border-white/5 space-y-1">
                <div className="flex justify-between text-neutral-400 text-[10px]">
                  <span>09/07 训练问答</span>
                  <span className="text-[#A4FF4F]">进行中</span>
                </div>
                <div className="text-white font-medium">坐姿绳索划船 · 肩前侧不适指导</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#141416] border border-white/5 space-y-1">
                <div className="flex justify-between text-neutral-400 text-[10px]">
                  <span>09/05 卧推策略</span>
                  <span>已归档</span>
                </div>
                <div className="text-neutral-300">史密斯卧推 40kg 达到 RIR 2 确认</div>
              </div>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 bg-[#A4FF4F] text-black font-bold text-xs rounded-xl cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
