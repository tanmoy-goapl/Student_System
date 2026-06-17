'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import QuestionHeader from "../../components/practicepage/Main/QuestionHeader";
import QuestionContent from "../../components/practicepage/Main/QuestionContent";
import AnswerOptions from "../../components/practicepage/Main/AnswerOptions";
import ActionButtons from "../../components/practicepage/Main/ActionButtons";
import AIHelpSection from "../../components/practicepage/Main/AIHelpSection";
import PracticeSidebar from "@/components/practicepage/Right/Practicesidebar";
import PracticeLeftSidebar from "@/components/practicepage/Left/PracticeSidebar";
import {
    startPracticeSession,
    submitPracticeAnswer,
    getNextBatch,
    getStudentPerformance,
    type StartSessionResponse,
    type PracticeQuestion as APIPracticeQuestion,
    type SubmitAnswerResponse,
    type PracticePerformanceResponse,
} from "@/lib/api";

export interface PracticePageProps {
    onAnswerSubmit?: (
        questionId: number,
        answerId: string,
        isCorrect: boolean
    ) => void;
    onSkip?: (questionId: number) => void;
    onHintRequest?: (questionId: number) => void;
    onAIHelp?: (questionId: number, query: string) => void;
}

export default function PracticePage({
    onAnswerSubmit,
    onSkip,
    onHintRequest,
    onAIHelp,
}: PracticePageProps) {
    // Session state
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [sessionMode, setSessionMode] = useState("topic");
    const [sessionTopic, setSessionTopic] = useState("");
    const [sessionDifficulty, setSessionDifficulty] = useState("mixed");

    // Questions
    const [questions, setQuestions] = useState<APIPracticeQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [answerResult, setAnswerResult] = useState<SubmitAnswerResponse | null>(null);

    // Performance
    const [performance, setPerformance] = useState<PracticePerformanceResponse | null>(null);
    const [liveStats, setLiveStats] = useState({
        accuracy: 0,
        streak: 0,
        points: 0,
        avgSpeed: "0s",
        answered: 0,
        correct: 0,
    });

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [showAIHelp, setShowAIHelp] = useState(false);
    const [totalQuestions, setTotalQuestions] = useState(5);

    // Timer
    const timerRef = useRef<number>(0);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Get student ID from localStorage
    const getStudentId = (): number => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("user_id");
            return id ? parseInt(id, 10) : 1;
        }
        return 1;
    };

    // Fetch performance data on mount
    useEffect(() => {
        async function fetchPerformance() {
            try {
                const data = await getStudentPerformance(getStudentId());
                setPerformance(data);
            } catch (error) {
                // Performance data is supplementary, not critical
            }
        }
        fetchPerformance();
    }, []);

    // Timer management
    const startTimer = useCallback(() => {
        timerRef.current = 0;
        setElapsedTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
            timerRef.current += 1;
            setElapsedTime(timerRef.current);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        return timerRef.current;
    }, []);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    // Start a new practice session
    const handleStartSession = async (mode: string, topic?: string, difficulty?: string, questionCount?: number) => {
        setIsLoading(true);
        setIsGenerating(true);
        setSessionComplete(false);
        setAnswerResult(null);

        try {
            const count = questionCount || totalQuestions;
            const response = await startPracticeSession(
                getStudentId(),
                mode,
                topic,
                difficulty,
                count
            );

            setSessionId(response.session_id);
            setSessionMode(response.mode);
            setSessionTopic(response.topic);
            setSessionDifficulty(response.difficulty);
            setQuestions(response.questions);
            setTotalQuestions(response.total_questions);
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setAnswered(false);
            setSessionStarted(true);
            setLiveStats({ accuracy: 0, streak: 0, points: 0, avgSpeed: "0s", answered: 0, correct: 0 });

            // Start timer for first question
            startTimer();
        } catch (error) {
            // Error handled silently
        } finally {
            setIsLoading(false);
            setIsGenerating(false);
        }
    };

    // Submit answer
    const handleSubmitAnswer = async () => {
        if (!selectedAnswer || !sessionId || !questions[currentQuestionIndex]) return;

        const timeSpent = stopTimer();
        setAnswered(true);

        try {
            const result = await submitPracticeAnswer(
                sessionId,
                questions[currentQuestionIndex].id,
                selectedAnswer,
                timeSpent
            );

            setAnswerResult(result);

            // Update live stats
            const avgSeconds = result.stats.avg_time_seconds;
            const avgFormatted = avgSeconds >= 60
                ? `${Math.floor(avgSeconds / 60)}m ${Math.round(avgSeconds % 60)}s`
                : `${Math.round(avgSeconds)}s`;

            setLiveStats({
                accuracy: result.stats.accuracy,
                streak: result.stats.streak,
                points: result.stats.points,
                avgSpeed: avgFormatted,
                answered: result.stats.answered,
                correct: result.stats.correct,
            });

            onAnswerSubmit?.(
                questions[currentQuestionIndex].id,
                selectedAnswer,
                result.is_correct
            );
        } catch (error) {
            // Error handled silently
        }
    };

    // Move to next question
    const handleNextQuestion = async () => {
        const nextIndex = currentQuestionIndex + 1;

        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer(null);
            setAnswered(false);
            setAnswerResult(null);
            setShowAIHelp(false);
            startTimer();
        } else if (sessionId) {
            setIsGenerating(true);
            try {
                const batch = await getNextBatch(sessionId);

                if (batch.session_complete || batch.questions.length === 0) {
                    setSessionComplete(true);
                    const perfData = await getStudentPerformance(getStudentId());
                    setPerformance(perfData);
                } else {
                    setQuestions(prev => [...prev, ...batch.questions]);
                    setCurrentQuestionIndex(nextIndex);
                    setSelectedAnswer(null);
                    setAnswered(false);
                    setAnswerResult(null);
                    setShowAIHelp(false);
                    startTimer();
                }
            } catch (error) {
                setSessionComplete(true);
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleAnswerSelect = (answerId: string) => {
        if (!answered) {
            setSelectedAnswer(answerId);
        }
    };

    const handleHint = () => {
        onHintRequest?.(questions[currentQuestionIndex]?.id);
    };

    const handleSkip = () => {
        stopTimer();
        setSelectedAnswer(null);
        setAnswered(false);
        setAnswerResult(null);
        handleNextQuestion();
        onSkip?.(questions[currentQuestionIndex]?.id);
    };

    const handleAIHelp = (query: string) => {
        onAIHelp?.(questions[currentQuestionIndex]?.id, query);
        setAiQuery("");
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const renderMainContent = () => {
        if (!sessionStarted) {
            return (
                <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="text-center space-y-6 max-w-lg">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Ready to Practice?</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Select a practice mode and topic from the sidebar to start generating
                                AI-powered quiz questions from your uploaded documents.
                            </p>
                            {isLoading && (
                                <div className="flex items-center justify-center gap-3 text-violet-400">
                                    <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm">Analyzing your documents and generating questions...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (sessionComplete) {
            return (
                <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 max-w-md text-center space-y-6 w-full">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white">Session Complete!</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-700/50 rounded-xl p-3">
                                    <div className="text-2xl font-bold text-emerald-400">{liveStats.accuracy}%</div>
                                    <div className="text-xs text-slate-400">Accuracy</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-xl p-3">
                                    <div className="text-2xl font-bold text-amber-400">+{liveStats.points}</div>
                                    <div className="text-xs text-slate-400">Points</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-xl p-3">
                                    <div className="text-2xl font-bold text-cyan-400">{liveStats.correct}/{liveStats.answered}</div>
                                    <div className="text-xs text-slate-400">Correct</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-xl p-3">
                                    <div className="text-2xl font-bold text-violet-400">{liveStats.streak}</div>
                                    <div className="text-xs text-slate-400">Best Streak</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSessionStarted(false);
                                    setSessionComplete(false);
                                    setQuestions([]);
                                    setCurrentQuestionIndex(0);
                                }}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                            >
                                Start New Session
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (isGenerating && questions.length === 0) {
            return (
                <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 mx-auto border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <h3 className="text-lg font-semibold text-white">Generating Questions...</h3>
                            <p className="text-slate-400 text-sm">AI is analyzing your documents and crafting personalized questions</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (questions.length === 0) {
            return (
                <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="text-4xl">📄</div>
                            <h3 className="text-lg font-semibold text-white">No Questions Generated</h3>
                            <p className="text-slate-400 text-sm">
                                Upload study documents first, then start a practice session.
                                The AI will generate questions from your uploaded content.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        const currentQuestion = questions[currentQuestionIndex];
        const questionForComponents = {
            id: currentQuestion.id,
            number: currentQuestionIndex + 1,
            totalQuestions: totalQuestions,
            category: sessionTopic.split(",")[0]?.trim().toUpperCase() || "GENERAL",
            topic: currentQuestion.topic,
            difficulty: currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1),
            mode: sessionMode === "weakness" ? "Weakness-Based" :
                sessionMode === "exam" ? "Exam Simulation" :
                    sessionMode === "revision" ? "Revision Mode" : "Topic-Based",
            description: sessionMode === "weakness" ? "AI-curated question" : "Document-based question",
            questionText: currentQuestion.question,
            answers: currentQuestion.options.map((opt: { id: string; text: string }) => ({
                id: opt.id,
                text: opt.text,
                isCorrect: answerResult ? opt.id === answerResult.correct_answer : false,
            })),
            progressColor: "bg-gradient-to-r from-emerald-500 via-cyan-500 to-red-500",
        };

        return (
            <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
                <div className="flex-1 space-y-4 px-6 py-4 max-w-3xl mx-auto w-full">
                    <QuestionHeader question={questionForComponents} />
                    <QuestionContent question={questionForComponents} />

                    <div className="flex items-center gap-2 px-4">
                        <span className="text-xs text-slate-500">⏱️ {formatTime(elapsedTime)}</span>
                        {isGenerating && (
                            <span className="text-xs text-violet-400 flex items-center gap-1">
                                <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                                Loading next batch...
                            </span>
                        )}
                    </div>

                    <AnswerOptions
                        question={questionForComponents}
                        selectedAnswer={selectedAnswer}
                        answered={answered}
                        onSelectAnswer={handleAnswerSelect}
                    />

                    {answered && answerResult && (
                        <div className={`mx-4 p-4 rounded-xl border ${answerResult.is_correct
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-sm font-semibold ${answerResult.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {answerResult.is_correct ? '✓ Correct!' : `✗ Incorrect — Answer: ${answerResult.correct_answer}`}
                                </span>
                            </div>
                            {answerResult.explanation && (
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {answerResult.explanation}
                                </p>
                            )}
                        </div>
                    )}

                    <ActionButtons
                        answered={answered}
                        selectedAnswer={selectedAnswer}
                        onSubmit={handleSubmitAnswer}
                        onHint={handleHint}
                        onSkip={handleSkip}
                        onNext={answered ? handleNextQuestion : undefined}
                        canProceed={true}
                    />

                    <AIHelpSection
                        query={aiQuery}
                        onQueryChange={setAiQuery}
                        onSubmitQuery={handleAIHelp}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="flex w-full h-[calc(100vh-4rem)]">
            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-r border-white/10">
                <PracticeLeftSidebar onStartSession={handleStartSession} />
            </div>

            <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
                {renderMainContent()}
            </div>

            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-l border-white/10">
                <PracticeSidebar
                    accuracy={liveStats.accuracy}
                    avgSpeed={liveStats.avgSpeed}
                    streak={liveStats.streak}
                    pointsEarned={liveStats.points}
                    weakTopics={performance?.weak_topics}
                    insights={performance?.insights}
                />
            </div>
        </div>
    );
}
