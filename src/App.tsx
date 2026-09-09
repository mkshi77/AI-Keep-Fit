import React, { useState, useEffect, useMemo } from 'react';
import {
  TabType,
  WorkoutScreen,
  Exercise,
  SetRecord,
  ChatMessage,
  BodyFeedbackRecord,
  ExerciseFeedbackData,
} from './types';
import { completeWorkout, getTodayWorkout } from './services/workoutApi';
import { adaptTodayWorkout } from './adapters/workoutAdapter';
import type { TodayWorkout, WorkoutCompletionResult } from './domain/workout';
import { buildWorkoutCompletionPayload } from './adapters/workoutSubmissionAdapter';
import {
  applyWorkoutDraft,
  createWorkoutDraft,
  loadWorkoutDraft,
  saveWorkoutDraft,
  setWorkoutDraftCurrentExercise,
  setWorkoutDraftExerciseStatus,
  summarizeWorkoutDraft,
  updateWorkoutDraftFeedback,
  updateWorkoutDraftSet,
  clearWorkoutDraft,
  setWorkoutDraftSubmission,
  setWorkoutDraftSubmissionStatus,
  type WorkoutDraft,
  type WorkoutSubmissionStatus,
} from './state/workoutDraft';
import { checkSession } from './services/authApi';
import { AuthGate } from './components/AuthGate';
import { StatusBar } from './components/StatusBar';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { RestTimerView } from './components/RestTimerView';
import { ExerciseFeedbackView } from './components/ExerciseFeedbackView';
import { WorkoutSummaryView } from './components/WorkoutSummaryView';
import { RecordsView } from './components/RecordsView';
import { CoachView } from './components/CoachView';
import type { CoachFeedbackProposal } from './domain/coach';
import { sendCoachMessage } from './services/coachApi';
import { saveBodyFeedbackRecord } from './services/recordsApi';
import { mapRemoteBodyFeedback } from './adapters/recordsAdapter';

const messageTime = () => new Date().toTimeString().slice(0, 5);
const currentDate = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const welcomeMessage = (): ChatMessage => ({
  id: `coach-welcome-${Date.now()}`,
  role: 'assistant',
  time: messageTime(),
  text: '告诉我你当前的训练状态、疲劳感或动作问题，我会结合已记录的训练数据给出建议。',
});

export default function App() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [workoutError, setWorkoutError] = useState('');
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(false);
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [workoutScreen, setWorkoutScreen] = useState<WorkoutScreen>('overview');

  const [plannedExercises, setPlannedExercises] = useState<Exercise[]>([]);
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [submission, setSubmission] = useState<{
    status: WorkoutSubmissionStatus;
    error?: string;
    result?: WorkoutCompletionResult;
  }>({ status: 'idle' });
  const exercises = useMemo(
    () => applyWorkoutDraft(plannedExercises, workoutDraft),
    [plannedExercises, workoutDraft],
  );

  const loadWorkout = async () => {
    setIsWorkoutLoading(true);
    setWorkoutError('');
    try {
      const latest = await getTodayWorkout();
      if (latest.source !== 'notion') throw new Error(latest.warning || 'Notion 今日训练不可用');
      const adapted = adaptTodayWorkout(latest.exercises);
      const restoredDraft = loadWorkoutDraft(localStorage, latest, adapted);
      setPlannedExercises(adapted);
      setWorkoutDraft(restoredDraft);
      setWorkout(latest);
      setCurrentExerciseIndex(restoredDraft?.currentExerciseIndex ?? 0);
    } catch (cause) {
      setWorkoutError(cause instanceof Error ? cause.message : '无法加载今日训练');
      setPlannedExercises([]);
      setWorkoutDraft(null);
    } finally {
      setIsWorkoutLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    checkSession()
      .then(() => { if (!cancelled) setIsAuthenticated(true); })
      .catch(() => { if (!cancelled) setIsAuthenticated(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isAuthenticated === true) void loadWorkout();
  }, [isAuthenticated]);

  useEffect(() => {
    if (workoutDraft) saveWorkoutDraft(localStorage, workoutDraft);
  }, [workoutDraft]);

  // Completion remains UI state until Phase 1C formally submits the workout.
  const [isTodayCompleted, setIsTodayCompleted] = useState(false);

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
  const [bodyFeedbacks, setBodyFeedbacks] = useState<BodyFeedbackRecord[]>([]);

  // AI Coach Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);

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

  const moveToExercise = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(exercises.length - 1, index));
    const exercise = exercises[boundedIndex];
    if (!exercise) return;
    setCurrentExerciseIndex(boundedIndex);
    setWorkoutDraft((current) => current
      ? setWorkoutDraftCurrentExercise(current, exercise.id, boundedIndex)
      : current);
  };

  // Handler: Start workout
  const handleStartWorkout = () => {
    if (!workout || !plannedExercises.length) return;
    const activeDraft = workoutDraft ?? createWorkoutDraft(workout, plannedExercises);
    setWorkoutDraft(activeDraft);
    setCurrentExerciseIndex(activeDraft.currentExerciseIndex);
    setWorkoutScreen('active');
  };

  const handleUpdateSet = (updatedSet: SetRecord) => {
    const currentEx = exercises[currentExerciseIndex];
    if (!currentEx) return;
    setWorkoutDraft((current) => current
      ? updateWorkoutDraftSet(current, currentEx.id, updatedSet)
      : current);
  };

  // Handler: Complete a single set
  const handleCompleteSet = (updatedSet: SetRecord) => {
    const currentEx = exercises[currentExerciseIndex];
    if (!currentEx) return;
    handleUpdateSet(updatedSet);
    const nextSet = currentEx.sets.find((set) => set.setNumber !== updatedSet.setNumber && !set.isCompleted);
    const isLastSet = !nextSet;
    if (isLastSet) {
      // Show exercise completion & RIR feedback screen
      setWorkoutScreen('feedback');
    } else {
      // Enter rest countdown
      setCompletedRestSetInfo({
        setNumber: updatedSet.setNumber,
        nextSetNumber: nextSet.setNumber,
        weight: nextSet.weight,
        reps: nextSet.reps,
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
    setWorkoutDraft((current) => current
      ? updateWorkoutDraftFeedback(current, feedback.exerciseId, feedback)
      : current);

    if (currentExerciseIndex < exercises.length - 1) {
      moveToExercise(currentExerciseIndex + 1);
      setWorkoutScreen('active');
    } else {
      setWorkoutScreen('summary');
    }
  };

  // Handler: Skip exercise
  const handleSkipExercise = () => {
    const currentEx = exercises[currentExerciseIndex];
    if (currentEx) {
      setWorkoutDraft((current) => current
        ? setWorkoutDraftExerciseStatus(current, currentEx.id, 'skipped')
        : current);
    }
    if (currentExerciseIndex < exercises.length - 1) {
      moveToExercise(currentExerciseIndex + 1);
    } else {
      setWorkoutScreen('summary');
    }
  };

  // Handler: Previous exercise
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      moveToExercise(currentExerciseIndex - 1);
    }
  };

  // Handler: Next exercise
  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      moveToExercise(currentExerciseIndex + 1);
    } else {
      setWorkoutScreen('summary');
    }
  };

  // Handler: Save summary-level body check-in feedback
  const handleSaveSummaryBodyFeedback = async (record: { part: string; level: number; note: string }) => {
    if (record.level > 0) {
      try {
        const saved = await saveBodyFeedbackRecord({
          date: currentDate(),
          bodyPart: record.part,
          description: record.note || `${record.part} 感觉 ${record.level}/10 级酸胀`,
          score: record.level,
          type: '训练总结',
        });
        const mapped = mapRemoteBodyFeedback([saved])[0];
        setBodyFeedbacks((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
      } catch (error) {
        console.error('Body feedback save failed', error);
      }
    }
  };

  // Handler: Exit workout back to overview
  const handleExitWorkout = () => {
    setWorkoutScreen('overview');
  };

  // Handler: Finish workout early
  const handleFinishWorkoutEarly = () => {
    setWorkoutScreen('summary');
  };

  const handleSubmitWorkout = async () => {
    if (!workout || !workoutDraft || submission.status === 'submitting' || submission.status === 'submitted') return;
    const submissionId = workoutDraft.submissionId ?? crypto.randomUUID();
    const preparedDraft = workoutDraft.submissionId ? workoutDraft : setWorkoutDraftSubmission(workoutDraft, submissionId);
    if (preparedDraft !== workoutDraft) setWorkoutDraft(preparedDraft);

    try {
      const payload = buildWorkoutCompletionPayload(workout, preparedDraft, plannedExercises);
      setSubmission({ status: 'submitting' });
      setWorkoutDraft(setWorkoutDraftSubmissionStatus(preparedDraft, 'submitting'));
      const result = await completeWorkout(payload);
      setSubmission({ status: 'submitted', result });
      setWorkoutDraft(setWorkoutDraftSubmissionStatus(preparedDraft, 'submitted', { submittedAt: Date.now() }));

      try {
        const latest = await getTodayWorkout();
        if (latest.source !== 'notion') throw new Error(latest.warning || '提交成功，但正式训练数据暂时无法重新同步');
        setPlannedExercises(adaptTodayWorkout(latest.exercises));
        setWorkout(latest);
        clearWorkoutDraft(localStorage);
        setWorkoutDraft(null);
        setIsTodayCompleted(result.workoutCompleted);
      } catch (syncCause) {
        const message = syncCause instanceof Error ? syncCause.message : '提交成功，但正式训练数据重新同步失败；草稿已保留';
        setWorkoutError(message);
        setSubmission({ status: 'failed', error: message });
        setWorkoutDraft((current) => current
          ? setWorkoutDraftSubmissionStatus(current, 'failed', { lastSubmissionError: message })
          : current);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '训练同步失败；草稿已保留';
      setSubmission({ status: 'failed', error: message });
      setWorkoutDraft((current) => current
        ? setWorkoutDraftSubmissionStatus(current, 'failed', { lastSubmissionError: message })
        : current);
    }
  };

  // Handler: Return to today overview after summary
  const handleReturnToday = () => {
    setWorkoutScreen('overview');
    setActiveTab('today');
  };

  // Handler: Restart workout
  const handleRestartWorkout = () => {
    if (!workout || !plannedExercises.length) return;
    setWorkoutDraft(createWorkoutDraft(workout, plannedExercises, Date.now(), true));
    setSubmission({ status: 'idle' });
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
      time: messageTime(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const currentEx = exercises[currentExerciseIndex] || exercises[0];
      const completedSets = currentEx?.sets.filter((s) => s.isCompleted).length ?? 0;

      const data = await sendCoachMessage({
        message: text,
        history: messages.slice(-8).map((message) => ({ role: message.role, text: message.text })),
        context: currentEx ? {
          exerciseId: currentEx.id,
          exerciseName: currentEx.name,
          completedSets,
          plannedSets: currentEx.sets.length,
          weight: currentEx.weight,
          targetReps: currentEx.repRange,
        } : undefined,
      });
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        time: messageTime(),
        proposedFeedback: data.proposedFeedback,
        isFeedbackRecorded: false,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Coach API Error:', err);
      const unavailableReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: err instanceof Error ? err.message : 'AI Coach 暂时不可用，请稍后重试。',
        time: messageTime(),
      };
      setMessages((prev) => [...prev, unavailableReply]);
    }
  };

  // Handler: Confirm feedback proposal from AI Coach
  const handleConfirmFeedback = (
    msgId: string,
    feedback: CoachFeedbackProposal,
  ) => {
    setMessages((prev) => prev.map((message) => message.id === msgId ? { ...message, feedbackError: undefined } : message));
    void saveBodyFeedbackRecord({
      date: currentDate(),
      exerciseId: feedback.exerciseId,
      exerciseName: feedback.exerciseName,
      bodyPart: feedback.bodyPart,
      description: feedback.note,
      score: feedback.score,
      type: 'AI Coach',
      summary: feedback.note,
    }).then((saved) => {
      const mapped = mapRemoteBodyFeedback([saved])[0];
      setBodyFeedbacks((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
      setMessages((prev) => prev.map((message) => message.id === msgId ? { ...message, isFeedbackRecorded: true } : message));
    }).catch((error) => {
      setMessages((prev) => prev.map((message) => message.id === msgId
        ? { ...message, feedbackError: error instanceof Error ? error.message : '身体反馈写入失败' }
        : message));
    });
  };

  const handleDismissFeedback = (msgId: string) => {
    setMessages((prev) => prev.map((message) => message.id === msgId
      ? { ...message, proposedFeedback: undefined, feedbackError: undefined }
      : message));
  };

  // Handler: Clear and start new chat
  const handleNewChat = () => {
    setMessages([welcomeMessage()]);
  };

  // Compute current exercise and set progression
  const currentEx = exercises[currentExerciseIndex] || exercises[0];
  const currentDraftExercise = workoutDraft?.exercises.find((exercise) => exercise.exerciseId === currentEx?.id);
  const workoutSummary = summarizeWorkoutDraft(workoutDraft);
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


  if (isAuthenticated !== true) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

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
                workout={workout}
                isLoading={isWorkoutLoading}
                error={workoutError}
                onRetry={loadWorkout}
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
                onUpdateSet={handleUpdateSet}
                onCompleteSet={handleCompleteSet}
                onExitWorkout={handleExitWorkout}
                onFinishWorkoutEarly={handleFinishWorkoutEarly}
              />
            )}

            {workoutScreen === 'rest' && currentEx && (
              <RestTimerView
                exercise={currentEx}
                initialSeconds={currentEx.restSeconds}
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

            {workoutScreen === 'feedback' && currentEx && (
              <ExerciseFeedbackView
                key={currentEx.id}
                exercise={currentEx}
                exerciseIndex={currentExerciseIndex}
                totalExercises={exercises.length}
                initialFeedback={currentDraftExercise?.feedback}
                onSaveFeedbackAndNext={handleSaveFeedbackAndNext}
                onGoBackToSets={() => setWorkoutScreen('active')}
                onExitEarly={handleFinishWorkoutEarly}
                onAskCoachWithDiscomfort={handleAskCoachWithDiscomfort}
              />
            )}

            {workoutScreen === 'summary' && (
              <WorkoutSummaryView
                exercises={exercises}
                summary={workoutSummary}
                submissionState={submission}
                onSubmitWorkout={handleSubmitWorkout}
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
            onDismissFeedback={handleDismissFeedback}
            onNewChat={handleNewChat}
            currentWorkoutContext={{
              currentExercise: currentEx?.name,
              currentSet: completedSetsCount,
              totalSets: totalWorkoutSets,
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
