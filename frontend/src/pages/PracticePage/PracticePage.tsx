'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import QuestionHeader from "../../components/practicepage/Main/QuestionHeader";
import QuestionContent from "../../components/practicepage/Main/QuestionContent";
import AnswerOptions from "../../components/practicepage/Main/AnswerOptions";
import ActionButtons from "../../components/practicepage/Main/ActionButtons";
import AIHelpSection from "../../components/practicepage/Main/AIHelpSection";
import PracticeLoadingCard from "../../components/practicepage/Main/PracticeLoadingCard";
import PracticeLeftSidebar from "@/components/practicepage/Left/PracticeSidebar";
import PracticeSidebar from "@/components/practicepage/Right/Practicesidebar";
import {
    startPracticeSession,
    submitPracticeAnswer,
    getNextBatch,
    getSessionStatus,
    getStudentPerformance,
    type StartSessionResponse,
    type PracticeQuestion as APIPracticeQuestion,
    type SubmitAnswerResponse,
    type PracticePerformanceResponse,
    type PracticeSessionStatus,
} from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { OfflineState, ErrorState } from "@/components/UIStateSystem";

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
    const searchParams = useSearchParams();
    const router = useRouter();
    const source = searchParams?.get("source") || "courses";

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answerError, setAnswerError] = useState<string | null>(null);

    // Performance data for right sidebar
    const [performance, setPerformance] = useState<PracticePerformanceResponse | null>(null);
    const [performanceLoading, setPerformanceLoading] = useState(true);

    // Live Stats for end-of-session screen
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
    const [hasError, setHasError] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [showAIHelp, setShowAIHelp] = useState(false);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [batchError, setBatchError] = useState<string | null>(null);
    const [waitingForQuestion, setWaitingForQuestion] = useState(false);

    const hasAutoStarted = useRef(false);
    const hasReceivedQuestionsRef = useRef(false);

    // Timer
    const timerRef = useRef<number>(0);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const generationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Get student ID from localStorage
    const getStudentId = (): number => {
        if (typeof window === "undefined") return 0;
        const parsedId = Number(window.localStorage.getItem("user_id"));
        return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : 0;
    };

    // Keep the backend generation session resumable after navigation.
    const pendingGenerationKey = useCallback(
        (): string => `mentor_ai_practice_generation_${getStudentId()}`,
        [],
    );
    const clearPendingGeneration = useCallback(() => {
        if (typeof window !== "undefined") localStorage.removeItem(pendingGenerationKey());
    }, [pendingGenerationKey]);
    const savePendingGeneration = useCallback((response: StartSessionResponse) => {
        if (typeof window !== "undefined") localStorage.setItem(pendingGenerationKey(), JSON.stringify({
            sessionId: response.session_id, mode: response.mode, topic: response.topic,
            difficulty: response.difficulty, questionCount: response.total_questions || response.question_count || totalQuestions, startedAt: Date.now(),
        }));
    }, [pendingGenerationKey, totalQuestions]);
    const readPendingGeneration = useCallback(() => {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem(pendingGenerationKey());
            if (!raw) return null;
            const value = JSON.parse(raw);
            return Number.isInteger(Number(value?.sessionId)) && Number(value.sessionId) > 0 ? { ...value, sessionId: Number(value.sessionId) } : null;
        } catch { clearPendingGeneration(); return null; }
    }, [clearPendingGeneration, pendingGenerationKey]);

    const refreshPerformance = useCallback(async (showLoading = false) => {
        if (showLoading) setPerformanceLoading(true);
        try {
            const data = await getStudentPerformance(getStudentId());
            if (mountedRef.current) setPerformance(data);
        } catch (error) {
            // Sidebar analytics are supplementary to the quiz itself.
        } finally {
            if (showLoading && mountedRef.current) setPerformanceLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshPerformance(true);
    }, [refreshPerformance]);

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
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (generationPollRef.current) clearInterval(generationPollRef.current);
        };
    }, []);

    const stopGenerationPolling = useCallback(() => {
        if (generationPollRef.current) {
            clearInterval(generationPollRef.current);
            generationPollRef.current = null;
        }
    }, []);

    const applySessionQuestions = useCallback((
        response: StartSessionResponse | PracticeSessionStatus,
        replace = false,
    ) => {
        const nextQuestions = response.questions || [];
        setSessionId(response.session_id);
        setSessionMode(response.mode);
        setSessionTopic(response.topic || "");
        setSessionDifficulty(response.difficulty || "mixed");

        if (replace) {
            hasReceivedQuestionsRef.current = false;
            setQuestions(nextQuestions);
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setAnswered(false);
            setAnswerResult(null);
            setIsSubmitting(false);
            setAnswerError(null);
            setBatchError(null);
        } else if (nextQuestions.length > 0) {
            setQuestions(previous => {
                const knownIds = new Set(previous.map(question => question.id));
                const additions = nextQuestions.filter(question => !knownIds.has(question.id));
                return additions.length > 0 ? [...previous, ...additions] : previous;
            });
        }

        setTotalQuestions(response.total_questions || response.question_count || nextQuestions.length || 5);
        setSessionStarted(true);

        if (nextQuestions.length > 0) {
            setIsLoading(false);
            setBatchError(null);
            if (!hasReceivedQuestionsRef.current) {
                hasReceivedQuestionsRef.current = true;
                startTimer();
            }
        }
    }, [startTimer]);

    const appendQuestions = useCallback((nextQuestions: APIPracticeQuestion[]) => {
        if (!nextQuestions.length) return;
        setQuestions(previous => {
            const knownIds = new Set(previous.map(question => question.id));
            const additions = nextQuestions.filter(question => !knownIds.has(question.id));
            return additions.length > 0 ? [...previous, ...additions] : previous;
        });
    }, []);

    const beginGenerationPolling = useCallback((id: number) => {
        stopGenerationPolling();
        let requestInFlight = false;

        const poll = async () => {
            if (requestInFlight || !mountedRef.current) return;
            requestInFlight = true;
            try {
                const status = await getSessionStatus(id, getStudentId());
                if (!mountedRef.current) return;

                const generationStatus = status.generation_status || status.status || "";
                const hasQuestions = Boolean(status.questions?.length);
                const complete = status.generation_complete === true
                    || generationStatus === "ready"
                    || generationStatus === "complete";

                if (hasQuestions) {
                    applySessionQuestions(status);
                }

                if (generationStatus === "failed" && !hasQuestions) {
                    clearPendingGeneration();
                    setIsLoading(false);
                    setIsGenerating(false);
                    setHasError(true);
                    stopGenerationPolling();
                } else if (
                    generationStatus === "partial_failed"
                    || (!status.is_active && !complete)
                ) {
                    setIsLoading(false);
                    setIsGenerating(false);
                    setBatchError(hasQuestions
                        ? "Some practice questions are ready, but no more could be prepared."
                        : "Practice questions could not be prepared. Please try again.");
                    stopGenerationPolling();
                } else if (complete) {
                    clearPendingGeneration();
                    setIsLoading(false);
                    setIsGenerating(false);
                    stopGenerationPolling();
                } else {
                    setIsGenerating(true);
                    if (!hasQuestions) setIsLoading(true);
                }
            } catch (error) {
                // Keep polling through transient network errors. The job lives on
                // the backend and can be recovered when the user returns.
            } finally {
                requestInFlight = false;
            }
        };

        generationPollRef.current = setInterval(() => {
            void poll();
        }, 1000);
        void poll();
    }, [applySessionQuestions, clearPendingGeneration, stopGenerationPolling]);

    const recoverPendingGeneration = useCallback(async () => {
        const pending = readPendingGeneration();
        if (!pending) return false;
        setSessionId(pending.sessionId);
        setSessionMode(pending.mode || "topic");
        setSessionTopic(pending.topic || "");
        setSessionDifficulty(pending.difficulty || "mixed");
        setTotalQuestions(pending.questionCount || 5);
        setWaitingForQuestion(false);
        setIsLoading(true);
        setIsGenerating(true);
        try {
            const status = await getSessionStatus(pending.sessionId, getStudentId());
            if (!mountedRef.current) return true;

            const generationStatus = status.generation_status || status.status || "";
            const hasQuestions = Boolean(status.questions?.length);
            const complete = status.generation_complete === true
                || generationStatus === "ready"
                || generationStatus === "complete";

            if (hasQuestions) {
                applySessionQuestions(status, true);
            }

            if (generationStatus === "failed" && !hasQuestions) {
                clearPendingGeneration();
                setIsLoading(false);
                setIsGenerating(false);
                setHasError(true);
            } else if (
                generationStatus === "partial_failed"
                || (!status.is_active && !complete)
            ) {
                setIsLoading(false);
                setIsGenerating(false);
            } else if (complete) {
                clearPendingGeneration();
                setIsLoading(false);
                setIsGenerating(false);
            } else {
                beginGenerationPolling(pending.sessionId);
            }
            return true;
        } catch {
            beginGenerationPolling(pending.sessionId);
            return true;
        }
    }, [applySessionQuestions, beginGenerationPolling, clearPendingGeneration, readPendingGeneration]);

    // Start a new practice session
    const handleStartSession = async (mode: string, topic?: string, difficulty?: string, questionCount?: number) => {
        stopGenerationPolling();
        stopTimer();
        clearPendingGeneration();
        setIsLoading(true);
        setIsGenerating(true);
        setSessionComplete(false);
        setWaitingForQuestion(false);
        setAnswerResult(null);
        let waitingForGeneration = false;

        try {
            setHasError(false);
            const count = questionCount || totalQuestions;
            const response = await startPracticeSession(
                getStudentId(),
                mode,
                topic,
                difficulty,
                count
            );

            if (!mountedRef.current) return;
            applySessionQuestions(response, true);
            setLiveStats({ accuracy: 0, streak: 0, points: 0, avgSpeed: "0s", answered: 0, correct: 0 });

            const generationStatus = response.generation_status || response.status || "";
            const generationFinished = response.generation_complete === true
                || generationStatus === "ready"
                || generationStatus === "complete";
            waitingForGeneration = !generationFinished;
            if (waitingForGeneration) {
                savePendingGeneration(response);
                beginGenerationPolling(response.session_id);
            } else {
                clearPendingGeneration();
            }
        } catch (error) {
            console.error("Failed to start session:", error);
            if (mountedRef.current) setHasError(true);
        } finally {
            if (!waitingForGeneration && mountedRef.current) {
                setIsLoading(false);
                setIsGenerating(false);
            }
        }
    };
    
    // Auto-start practice session if topic query param is present on mount
    useEffect(() => {
        if (hasAutoStarted.current) return;
        if (readPendingGeneration()) { hasAutoStarted.current = true; void recoverPendingGeneration(); return; }
        const topicParam = searchParams?.get("topic");
        const modeParam = searchParams?.get("mode") || "topic";
        if (topicParam && !hasAutoStarted.current) {
            hasAutoStarted.current = true;
            handleStartSession(modeParam, topicParam);
        }
    }, [readPendingGeneration, recoverPendingGeneration, searchParams]);

    // Submit answer
    const handleSubmitAnswer = async () => {
        const currentQuestion = questions[currentQuestionIndex];
        if (!selectedAnswer || !sessionId || !currentQuestion || answered || isSubmitting) return;

        setIsSubmitting(true);
        setAnswerError(null);
        const timeSpent = stopTimer();
        try {
            const result = await submitPracticeAnswer(
                sessionId,
                currentQuestion.id,
                selectedAnswer,
                timeSpent,
                getStudentId()
            );

            setAnswerResult(result);
            setAnswered(true);

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

            void refreshPerformance();
            onAnswerSubmit?.(currentQuestion.id, selectedAnswer, result.is_correct);
        } catch (error) {
            setAnswerError("We couldn't save this answer. Please try submitting it again.");
            startTimer();
        } finally {
            if (mountedRef.current) setIsSubmitting(false);
        }
    };

    // Move to next question
    const handleNextQuestion = async () => {
        if (isSubmitting) return;
        setBatchError(null);
        const nextIndex = currentQuestionIndex + 1;

        if (nextIndex < questions.length) {
            setWaitingForQuestion(false);
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer(null);
            setAnswered(false);
            setAnswerResult(null);
            setAnswerError(null);
            setShowAIHelp(false);
            startTimer();
        } else if (sessionId) {
            const previousIndex = currentQuestionIndex;
            const previousSelectedAnswer = selectedAnswer;
            const previousAnswered = answered;
            const previousAnswerResult = answerResult;
            const previousAnswerError = answerError;
            setIsGenerating(true);
            setWaitingForQuestion(true);
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer(null);
            setAnswered(false);
            setAnswerResult(null);
            setAnswerError(null);
            setShowAIHelp(false);
            stopTimer();
            try {
                const batch = await getNextBatch(sessionId, getStudentId());
                if (batch.questions?.length) appendQuestions(batch.questions);

                const generationStatus = batch.generation_status || batch.status || "";
                const generationFinished = batch.generation_complete === true
                    || generationStatus === "ready"
                    || generationStatus === "complete";

                if (batch.session_complete) {
                    clearPendingGeneration();
                    stopGenerationPolling();
                    setWaitingForQuestion(false);
                    setIsGenerating(false);
                    setSessionComplete(true);
                    const perfData = await getStudentPerformance(getStudentId());
                    if (mountedRef.current) setPerformance(perfData);
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("mentorai:analytics-updated"));
                    }
                } else if (generationFinished) {
                    clearPendingGeneration();
                    stopGenerationPolling();
                    setIsGenerating(false);
                } else {
                    savePendingGeneration({
                        session_id: sessionId,
                        mode: sessionMode,
                        topic: sessionTopic,
                        difficulty: sessionDifficulty,
                        total_questions: totalQuestions,
                        questions: [],
                    });
                    beginGenerationPolling(sessionId);
                }
            } catch (error) {
                if (mountedRef.current) {
                    setCurrentQuestionIndex(previousIndex);
                    setSelectedAnswer(previousSelectedAnswer);
                    setAnswered(previousAnswered);
                    setAnswerResult(previousAnswerResult);
                    setAnswerError(previousAnswerError);
                    setWaitingForQuestion(false);
                    setIsGenerating(false);
                    setBatchError("The next question could not be loaded. Your progress is safe; please try again.");
                }
            }
        }
    };

    const handleAnswerSelect = (answerId: string) => {
        if (!answered && !isSubmitting) {
            setAnswerError(null);
            setSelectedAnswer(answerId);
        }
    };

    const handleHint = () => {
        onHintRequest?.(questions[currentQuestionIndex]?.id);
    };

    const handleSkip = () => {
        if (isSubmitting) return;
        const skippedQuestionId = questions[currentQuestionIndex]?.id;
        stopTimer();
        setSelectedAnswer(null);
        setAnswered(false);
        setAnswerResult(null);
        setAnswerError(null);
        setBatchError(null);
        void handleNextQuestion();
        if (skippedQuestionId) onSkip?.(skippedQuestionId);
    };

    useEffect(() => {
        if (!waitingForQuestion || currentQuestionIndex >= questions.length) return;
        setWaitingForQuestion(false);
        setIsGenerating(false);
        setSelectedAnswer(null);
        setAnswered(false);
        setAnswerResult(null);
        setAnswerError(null);
        setShowAIHelp(false);
        startTimer();
    }, [currentQuestionIndex, questions.length, startTimer, waitingForQuestion]);

    const handleAIHelp = (query: string) => {
        onAIHelp?.(questions[currentQuestionIndex]?.id, query);
        setAiQuery("");
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const renderFormattedText = (text: string): React.ReactNode => {
        if (!text) return "";
        let cleanText = text;
        if (cleanText.endsWith("**") && (cleanText.match(/\*\*/g) || []).length === 1) {
            cleanText = "**" + cleanText;
        } else if (cleanText.startsWith("**") && (cleanText.match(/\*\*/g) || []).length === 1) {
            cleanText = cleanText + "**";
        }
        const regex = /(\*\*.*?\*\*|\*.*?\*|\`.*?\`)/g;
        const parts = cleanText.split(regex);
        return (
            <>
                {parts.map((part, index) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith("*") && part.endsWith("*")) {
                        return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
                    }
                    if (part.startsWith("`") && part.endsWith("`")) {
                        return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 font-mono text-sm text-pink-400">{part.slice(1, -1)}</code>;
                    }
                    return part;
                })}
            </>
        );
    };

    const renderMainContent = () => {
        if (hasError) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto p-8 justify-center animate-fade-in">
                    <ErrorState 
                        message="Failed to build practice quiz. Make sure documents are uploaded and backend is online." 
                        onRetry={() => handleStartSession(sessionMode, sessionTopic, sessionDifficulty)} 
                    />
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto animate-fade-in">
                    <PracticeLoadingCard
                        topic={sessionTopic || "General Topic"}
                        difficulty={sessionDifficulty || "mixed"}
                        isNextBatch={false}
                    />
                </div>
            );
        }

        if (!sessionStarted) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="text-center space-y-6 max-w-lg">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl shadow-indigo-500/10">
                                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                             </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Ready to Practice?</h2>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                                Select a topic and settings from the sidebar to generate custom quiz questions from your curriculum and documents.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        if (sessionComplete) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md text-center space-y-6 w-full shadow-2xl">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Practice Session Complete!</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-bold text-emerald-400">{liveStats.accuracy}%</div>
                                    <div className="text-xs text-slate-400">Accuracy</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-bold text-amber-400">+{liveStats.points}</div>
                                    <div className="text-xs text-slate-400">Points</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-bold text-cyan-400">{liveStats.correct}/{liveStats.answered}</div>
                                    <div className="text-xs text-slate-400">Correct</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-bold text-violet-400">{liveStats.streak}</div>
                                    <div className="text-xs text-slate-400">Best Streak</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        const topicParam = searchParams?.get("topic");
                                        const subjectParam = searchParams?.get("subject");
                                        const roadmapIdParam = searchParams?.get("roadmap_id");
                                        if (topicParam) {
                                            let query = `?topic=${encodeURIComponent(topicParam)}&source=${source}`;
                                            if (subjectParam) query += `&subject=${encodeURIComponent(subjectParam)}`;
                                            if (roadmapIdParam) query += `&roadmap_id=${encodeURIComponent(roadmapIdParam)}`;
                                            router.push(`/learning${query}`);
                                        } else {
                                            setSessionStarted(false);
                                            setSessionComplete(false);
                                            setQuestions([]);
                                            setCurrentQuestionIndex(0);
                                        }
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/10"
                                >
                                    {searchParams?.get("topic") ? "Back to Learning" : "Start New Session"}
                                </button>

                                {searchParams?.get("topic") && (
                                    <button
                                        onClick={() => {
                                            setSessionStarted(false);
                                            setSessionComplete(false);
                                            setQuestions([]);
                                            setCurrentQuestionIndex(0);
                                        }}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium active:scale-[0.98] transition-all border border-white/10"
                                    >
                                        Start New Session
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (isGenerating && questions.length === 0) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                    <PracticeLoadingCard
                        topic={sessionTopic || "General Topic"}
                        difficulty={sessionDifficulty || "Medium"}
                        isNextBatch={false}
                    />
                </div>
            );
        }

        if (questions.length === 0) {
            return (
                <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                    <div className="flex-1 flex items-center justify-center px-6 py-4">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="text-4xl">📄</div>
                            <h3 className="text-lg font-semibold text-white">No Questions Generated</h3>
                            <p className="text-slate-400 text-sm">
                                Please check your connection or try restarting the practice session.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) {
            if (waitingForQuestion) {
                return (
                    <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                        <PracticeLoadingCard
                            topic={sessionTopic || "General Topic"}
                            difficulty={sessionDifficulty || "Medium"}
                            isNextBatch={true}
                        />
                    </div>
                );
            }
            return (
                <div className="flex-1 flex items-center justify-center bg-[#090D1F] px-6 py-8">
                    <div className="max-w-md text-center space-y-3">
                        <div className="text-3xl">🧩</div>
                        <h3 className="text-lg font-semibold text-white">Question Unavailable</h3>
                        <p className="text-sm text-slate-400">
                            This question was not returned by the practice session. Try restarting the session.
                        </p>
                    </div>
                </div>
            );
        }
        const displayTotalQuestions = Math.max(totalQuestions, questions.length, currentQuestionIndex + 1);
        const isLastQuestion = currentQuestionIndex + 1 >= displayTotalQuestions;
        const safeOptions = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];
        const questionForComponents = {
            id: currentQuestion.id,
            number: currentQuestionIndex + 1,
            totalQuestions: displayTotalQuestions,
            category: sessionTopic.split(",")[0]?.trim().toUpperCase() || "GENERAL",
            topic: currentQuestion.topic || sessionTopic || "General",
            difficulty: (currentQuestion.difficulty || sessionDifficulty || "mixed").charAt(0).toUpperCase() + (currentQuestion.difficulty || sessionDifficulty || "mixed").slice(1),
            mode: sessionMode === "topic" ? "Topic-Based" : sessionMode,
            description: "Grounded in your course and study material",
            questionText: currentQuestion.question || "Question text unavailable",
            answers: safeOptions.map((opt: { id: string; text: string }) => {
                const isCorrectOption = answerResult ? opt.id === answerResult.correct_answer : false;
                return {
                    id: opt.id,
                    text: opt.text,
                    isCorrect: isCorrectOption,
                };
            }),
            progressColor: "bg-gradient-to-r from-emerald-500 via-cyan-500 to-red-500",
        };

        return (
            <div className="flex-1 flex flex-col h-full bg-[#090D1F] overflow-y-auto">
                <div className="min-w-0 flex-1 space-y-4 px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full">
                    <button 
                        onClick={() => {
                            const topicParam = searchParams?.get("topic");
                            const subjectParam = searchParams?.get("subject");
                            const roadmapIdParam = searchParams?.get("roadmap_id");
                            if (topicParam) {
                                let query = `?topic=${encodeURIComponent(topicParam)}&source=${source}`;
                                if (subjectParam) query += `&subject=${encodeURIComponent(subjectParam)}`;
                                if (roadmapIdParam) query += `&roadmap_id=${encodeURIComponent(roadmapIdParam)}`;
                                router.push(`/learning${query}`);
                            } else {
                                router.push(source === 'personal' ? '/personal' : '/courses');
                            }
                        }}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to {searchParams?.get("topic") ? 'Learning' : (source === 'personal' ? 'Personal Roadmaps' : 'Courses')}
                    </button>
                    <QuestionHeader question={questionForComponents} />
                    <QuestionContent question={questionForComponents} />

                    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1 bg-slate-800/40 border border-slate-700/50 rounded-lg w-fit mx-4 max-w-full">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono text-slate-300">{formatTime(elapsedTime)}</span>
                    </div>
                    {(answerError || batchError) && (
                        <div className="mx-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 break-words">
                            {answerError || batchError}
                        </div>
                    )}

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
                                <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                                    {renderFormattedText(answerResult.explanation)}
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
                        canProceed={!isSubmitting}
                        isLastQuestion={isLastQuestion}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-w-0 w-full h-[calc(100vh-4rem)] relative overflow-hidden">
            <OfflineState />
            
            {/* Left sidebar only visible before session starts */}
            {!sessionStarted && (
                <div className="w-[clamp(15rem,20vw,20rem)] min-w-0 shrink-0 h-full border-r border-white/10">
                    <PracticeLeftSidebar onStartSession={handleStartSession} />
                </div>
            )}

            <div className="min-w-0 flex-1 flex flex-col h-full bg-[#090D1F] overflow-hidden">
                {renderMainContent()}
            </div>

            {/* Right sidebar containing insights, weak topics, and adaptive suggestions */}
            <div className="w-[clamp(15rem,20vw,20rem)] min-w-0 shrink-0 h-full flex flex-col">
                <PracticeSidebar
                    weakTopics={performance?.weak_topics}
                    insights={performance?.insights}
                    adaptiveEngine={performance?.adaptive_engine}
                    suggestedNext={performance?.suggested_next}
                    revisionQueue={performance?.revision_queue}
                    performanceLoading={performanceLoading}
                    answeredQuestions={performance?.questions_attempted ?? performance?.total_attempts ?? 0}
                    overallAccuracy={performance?.overall_accuracy ?? 0}
                />
            </div>
        </div>
    );
}
