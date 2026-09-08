import React, { useState, useEffect } from 'react';
import {
  TabType,
  WorkoutScreen,
  Exercise,
  SetRecord,
  ChatMessage,
  BodyFeedbackRecord,
  ExerciseFeedbackData,
} from './types';
import {
  INITIAL_EXERCISES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_BODY_FEEDBACK,
} from './data/mockData';
import { StatusBar } from './components/StatusBar';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { RestTimerView } from './components/RestTimerView';
import { ExerciseFeedbackView } from './components/ExerciseFeedbackView';
import { WorkoutSummaryView } from './components/WorkoutSummaryView';
import { RecordsView } from './components/RecordsView';
import { CoachView } from './components/CoachView';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [workoutScreen, setWorkoutScreen] = useState<WorkoutScreen>('overview');

  // Exercises State with LocalStorage Persistence
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('keepfit_exercises');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_EXERCISES;
  });

  useEffect(() => {
    localStorage.setItem('keepfit_exercises', JSON.stringify(exercises));
  }, [exercises]);

  // Today Workout Completed State with LocalStorage Persistence
  const [isTodayCompleted, setIsTodayCompleted] = useState<boolean>(() => {
    return localStorage.getItem('keepfit_today_completed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('keepfit_today_completed', String(isTodayCompleted));
  }, [isTodayCompleted]);

  // Current Workout State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [completedRestSetInfo, setCompletedRestSetInfo] = useState<{
    setNumber: number;
    nextSetNumber: number;
    weight: number;
    reps: number;
  }>({
    setNumber: 1,
    nextSetNumber: 2,
    weight: 40,
    reps: 8,
  });

  // Body Feedback State
  const [bodyFeedbacks, setBodyFeedbacks] = useState<BodyFeedbackRecord[]>(() => {
    const saved = localStorage.getItem('keepfit_feedback');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_BODY_FEEDBACK;
  });

  useEffect(() => {
    localStorage.setItem('keepfit_feedback', JSON.stringify(bodyFeedbacks));
  }, [bodyFeedbacks]);

  // AI Coach Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('keepfit_chat');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CHAT_MESSAGES;
  });

  useEffect(() => {
    localStorage.setItem('keepfit_chat', JSON.stringify(messages));
  }, [messages]);

  // Live time for status bar
  const [currentTime, setCurrentTime] = useState('9:41');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handler: Start workout
  const handleStartWorkout = () => {
    setWorkoutScreen('active');
  };

  // Handler: Complete a single set
  const handleCompleteSet = (updatedSet: SetRecord) => {
    const currentEx = exercises[currentExerciseIndex];
    if (!currentEx) return;

    const newSets = currentEx.sets.map((s) =>
      s.setNumber === updatedSet.setNumber ? updatedSet : s
    );

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: newSets } : ex
    );
    setExercises(updatedExercises);

    const isLastSet = updatedSet.setNumber >= currentEx.sets.length;
    if (isLastSet) {
      // Show exercise completion & RIR feedback screen
      setWorkoutScreen('feedback');
    } else {
      // Enter rest countdown
      setCompletedRestSetInfo({
        setNumber: updatedSet.setNumber,
        nextSetNumber: updatedSet.setNumber + 1,
        weight: updatedSet.weight,
        reps: updatedSet.reps,
      });
      setWorkoutScreen('rest');
    }
  };

  // Handler: Finish rest
  const handleFinishRest = () => {
    setWorkoutScreen('active');
  };

  // Handler: Save exercise feedback and move to next exercise or summary
  const handleSaveFeedbackAndNext = (feedback: ExerciseFeedbackData) => {
    // If user reported discomfort (>0), also add to bodyFeedbacks
    if (feedback.discomfortLevel > 0) {
      const newFeedbackRecord: BodyFeedbackRecord = {
        id: `fb-${Date.now()}`,
        part: feedback.exerciseName.includes('卧推')
          ? '右肩前侧'
          : feedback.exerciseName.includes('划船')
          ? '上斜方肌/颈后'
          : '膝盖周围',
        description: `动作: ${feedback.exerciseName} · ${feedback.bilateralBalance} · ${feedback.note || '组后轻微酸胀'}`,
        score: `${feedback.discomfortLevel}/10`,
        scoreColor: feedback.discomfortLevel >= 5 ? 'amber' : 'green',
        date: '09/07',
      };
      setBodyFeedbacks((prev) => [newFeedbackRecord, ...prev]);
    }

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setWorkoutScreen('active');
    } else {
      setIsTodayCompleted(true);
      setWorkoutScreen('summary');
    }
  };

  // Handler: Skip exercise
  const handleSkipExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      setIsTodayCompleted(true);
      setWorkoutScreen('summary');
    }
  };

  // Handler: Previous exercise
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
    }
  };

  // Handler: Next exercise
  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      setIsTodayCompleted(true);
      setWorkoutScreen('summary');
    }
  };

  // Handler: Save summary-level body check-in feedback
  const handleSaveSummaryBodyFeedback = (record: { part: string; level: number; note: string }) => {
    if (record.level > 0) {
      const newFeedbackRecord: BodyFeedbackRecord = {
        id: `fb-${Date.now()}`,
        part: record.part,
        description: record.note || `${record.part} 感觉 ${record.level}/10 级酸胀`,
        score: `${record.level}/10`,
        scoreColor: record.level >= 5 ? 'amber' : 'green',
        date: '09/07',
      };
      setBodyFeedbacks((prev) => [newFeedbackRecord, ...prev.filter((p) => p.part !== record.part)]);
    }
  };

  // Handler: Exit workout back to overview
  const handleExitWorkout = () => {
    setWorkoutScreen('overview');
  };

  // Handler: Finish workout early
  const handleFinishWorkoutEarly = () => {
    setIsTodayCompleted(true);
    setWorkoutScreen('summary');
  };

  // Handler: Return to today overview after summary
  const handleReturnToday = () => {
    setIsTodayCompleted(true);
    setWorkoutScreen('overview');
    setActiveTab('today');
  };

  // Handler: Restart workout
  const handleRestartWorkout = () => {
    const reset = exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, isCompleted: false })),
    }));
    setExercises(reset);
    setCurrentExerciseIndex(0);
    setIsTodayCompleted(false);
  };

  // Handler: View summary again
  const handleViewSummary = () => {
    setWorkoutScreen('summary');
  };

  // Handler: Jump to coach with discomfort
  const handleAskCoachWithDiscomfort = (discomfort: {
    exercise: string;
    level: number;
    note: string;
  }) => {
    setActiveTab('coach');
    const prompt = `我在做${discomfort.exercise}时感觉有些不适，程度大概是 ${discomfort.level}/10。${discomfort.note}，请问接下来该怎么调整？`;
    handleSendMessage(prompt);
  };

  // Handler: Send message to AI Coach
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      time: new Date().toTimeString().slice(0, 5),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const currentEx = exercises[currentExerciseIndex] || exercises[0];
      const completedSets = currentEx.sets.filter((s) => s.isCompleted).length;

      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          context: {
            currentExercise: currentEx.name,
            currentSet: completedSets + 1,
            totalSets: currentEx.sets.length,
            weight: currentEx.weight,
            targetReps: currentEx.repRange,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: data.reply || '已收到你的反馈，建议保持当前节奏，专注离心收缩。',
        time: new Date().toTimeString().slice(0, 5),
        proposedFeedback: data.proposedFeedback || undefined,
        isFeedbackRecorded: false,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Coach API Error:', err);
      // Friendly local fallback
      const fallbackReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text:
          '收到！如果感到酸胀或发力吃力，建议在下一组先降低 2.5~5kg 负荷，保持动作轨迹顺畅，专注于目标肌群顶峰收缩与离心控制，不要强行代偿借力。',
        time: new Date().toTimeString().slice(0, 5),
        proposedFeedback: text.includes('不适') || text.includes('疼') || text.includes('肩')
          ? {
              exercise: exercises[currentExerciseIndex]?.name || '坐姿绳索划船',
              location: '右肩前侧',
              discomfortLevel: '4 / 10',
              note: '组后反馈轻微拉扯感，建议下一组调整握距',
            }
          : undefined,
        isFeedbackRecorded: false,
      };
      setMessages((prev) => [...prev, fallbackReply]);
    }
  };

  // Handler: Confirm feedback proposal from AI Coach
  const handleConfirmFeedback = (
    msgId: string,
    feedback: { exercise: string; location: string; discomfortLevel: string; note: string }
  ) => {
    // Mark message as recorded
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isFeedbackRecorded: true } : m))
    );

    // Write to bodyFeedbacks array
    const newRecord: BodyFeedbackRecord = {
      id: `fb-${Date.now()}`,
      part: feedback.location || '肩部',
      description: `${feedback.exercise} · ${feedback.note}`,
      score: feedback.discomfortLevel.replace(/\s+/g, ''),
      scoreColor: 'amber',
      date: '09/07',
    };
    setBodyFeedbacks((prev) => [newRecord, ...prev]);
  };

  // Handler: Clear and start new chat
  const handleNewChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        text: '新对话已开启。请随时告诉我你的训练状态、疲劳感或需要调整的动作。',
        time: new Date().toTimeString().slice(0, 5),
      },
    ]);
  };

  // Compute current exercise and set progression
  const currentEx = exercises[currentExerciseIndex] || exercises[0];
  const completedSetsCount = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length,
    0
  );
  const totalWorkoutSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  // Check if active screen should hide bottom nav
  const isWorkoutActive =
    activeTab === 'today' &&
    (workoutScreen === 'active' ||
      workoutScreen === 'rest' ||
      workoutScreen === 'feedback' ||
      workoutScreen === 'summary');

  return (
    <div className="min-h-screen w-full bg-[#050506] flex items-center justify-center font-sans antialiased text-white selection:bg-[#A4FF4F] selection:text-black">
      {/* Mobile Shell Container */}
      <div className="w-full max-w-[390px] min-h-screen md:min-h-[844px] md:max-h-[860px] bg-[#0B0B0C] md:rounded-[44px] shadow-[0_25px_70px_rgba(0,0,0,0.8)] md:border-[6px] md:border-[#1F1F22] flex flex-col relative overflow-hidden">
        {/* Mobile Status Bar */}
        <StatusBar time={currentTime} />

        {/* Tab 1: 今日 View Modes */}
        {activeTab === 'today' && (
          <>
            {workoutScreen === 'overview' && (
              <TodayView
                exercises={exercises}
                onStartWorkout={handleStartWorkout}
                isTodayCompleted={isTodayCompleted}
                onViewSummary={handleViewSummary}
                onRestartWorkout={handleRestartWorkout}
              />
            )}

            {workoutScreen === 'active' && (
              <ActiveWorkoutView
                exercises={exercises}
                currentExerciseIndex={currentExerciseIndex}
                onPrevExercise={handlePrevExercise}
                onNextExercise={handleNextExercise}
                onSkipExercise={handleSkipExercise}
                onCompleteSet={handleCompleteSet}
                onExitWorkout={handleExitWorkout}
                onFinishWorkoutEarly={handleFinishWorkoutEarly}
              />
            )}

            {workoutScreen === 'rest' && (
              <RestTimerView
                exercise={currentEx}
                completedSetNumber={completedRestSetInfo.setNumber}
                nextSetNumber={completedRestSetInfo.nextSetNumber}
                nextWeight={completedRestSetInfo.weight}
                nextReps={completedRestSetInfo.reps}
                onFinishRest={handleFinishRest}
                onAskCoach={(question) => {
                  setActiveTab('coach');
                  handleSendMessage(question);
                }}
              />
            )}

            {workoutScreen === 'feedback' && (
              <ExerciseFeedbackView
                exercise={currentEx}
                exerciseIndex={currentExerciseIndex}
                totalExercises={exercises.length}
                onSaveFeedbackAndNext={handleSaveFeedbackAndNext}
                onGoBackToSets={() => setWorkoutScreen('active')}
                onExitEarly={handleFinishWorkoutEarly}
                onAskCoachWithDiscomfort={handleAskCoachWithDiscomfort}
              />
            )}

            {workoutScreen === 'summary' && (
              <WorkoutSummaryView
                exercises={exercises}
                onReturnToday={handleReturnToday}
                onAskCoach={() => setActiveTab('coach')}
                onSaveBodyFeedback={handleSaveSummaryBodyFeedback}
              />
            )}
          </>
        )}

        {/* Tab 2: 记录 View */}
        {activeTab === 'records' && (
          <RecordsView
            bodyFeedbacks={bodyFeedbacks}
            onOpenCoachWithFeedback={(fb) => {
              setActiveTab('coach');
              handleSendMessage(`请针对我的${fb.part}不适（${fb.description}，程度${fb.score}）给出防护与训练调整建议。`);
            }}
          />
        )}

        {/* Tab 3: AI 教练 View */}
        {activeTab === 'coach' && (
          <CoachView
            messages={messages}
            onSendMessage={handleSendMessage}
            onConfirmFeedback={handleConfirmFeedback}
            onNewChat={handleNewChat}
            currentWorkoutContext={{
              currentExercise: currentEx.name,
              currentSet: completedSetsCount || 6,
              totalSets: totalWorkoutSets || 12,
            }}
          />
        )}

        {/* Bottom Navigation Bar (Shown on top-level tabs and today overview) */}
        {!isWorkoutActive && (
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}

        {/* Home Bar Indicator (iOS style) */}
        <div className="w-full flex justify-center pb-2 pt-1 pointer-events-none absolute bottom-0 left-0 right-0 z-50">
          <div className="w-32 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
