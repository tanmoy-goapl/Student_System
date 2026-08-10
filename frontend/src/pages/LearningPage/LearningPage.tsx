'use client';

import { Header } from "@/components/learningpage/Header";
import NotesCard from "@/components/learningpage/NotesCard";
import ReactMarkdown from "react-markdown";
import { QuickActions } from "@/components/learningpage/QuickActions";
import { QuickRevisionCard } from "@/components/learningpage/QuickRevisionCard";
import { Sidebar } from "@/components/learningpage/Sidebar/Sidebar";
import LearningSidebar from "@/components/learningpage/LearningSidebar";
import { useState, useEffect, useRef } from "react";
import { OfflineState, ErrorState, EmptyState, LearningSkeleton } from "@/components/UIStateSystem";
import {
  getLearningData,
  getLearningContent,
  streamLearningContent,
  completeTopic,
  explainSimpler,
  giveExamples,
  summarizeTopic,
  streamExplainSimpler,
  streamGiveExamples,
  streamFlashcards,

  getCheatSheet,
  saveNotes,
  addToRevision,
  LearningDataResponse
} from "@/lib/api";
import {
  Lightbulb,
  FlaskConical,
  FileText,
  MessageSquare,
  Pen,
  Flag,
  Bookmark,
  CircleQuestionMark,
  BookOpen,
  Zap,
  Eye,
  MessageCircle,
  CheckCircle,
  ArrowLeft,
  Sparkles
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Lightbulb,
  FlaskConical,
  FileText,
  MessageSquare,
  Pen,
  Flag,
  Bookmark,
  CircleQuestionMark,
  BookOpen,
  Zap,
  Eye,
  MessageCircle,
};

import { useSearchParams, useRouter } from "next/navigation";

export default function LearningPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roadmapIdParam = searchParams?.get("roadmap_id") || undefined;
    
    const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);
    const [activeSubject, setActiveSubject] = useState<string | undefined>(undefined);
    const [activeSource, setActiveSource] = useState<string>("courses");

    const [data, setData] = useState<LearningDataResponse | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [isMarkingRead, setIsMarkingRead] = useState(false);
    const [isCompletedSession, setIsCompletedSession] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);

    const [modalContent, setModalContent] = useState<{
        title: string;
        type: 'explain' | 'example' | 'flashcard';
        data: any;
        loading?: boolean;
    } | null>(null);


    const [cheatsheetPoints, setCheatsheetPoints] = useState<any[]>([]);
    const [revealedFlashcardIds, setRevealedFlashcardIds] = useState<number[]>([]);


    useEffect(() => {
        const urlTopic = searchParams?.get("topic") || undefined;
        const urlSubject = searchParams?.get("subject") || undefined;
        const urlSource = searchParams?.get("source") || "courses";
        
        setActiveTopic(urlTopic);
        setActiveSubject(urlSubject);
        setActiveSource(urlSource);
    }, [searchParams]);

    useEffect(() => {
        setIsCompletedSession(false);
        setShowSummary(false);
    }, [activeTopic]);

    useEffect(() => {
        const urlTopic = searchParams?.get("topic");
        const targetSource = searchParams?.get("source") || "courses";
        const currentRoadmapId = searchParams?.get("roadmap_id");
        if (!urlTopic) {
            // Only redirect to last topic if we are not switching to a specific roadmap
            if (!currentRoadmapId) {
                const lastTopic = localStorage.getItem(`last_learning_topic_${targetSource}`);
                const lastSubject = localStorage.getItem(`last_learning_subject_${targetSource}`);
                if (lastTopic) {
                    let query = `?topic=${encodeURIComponent(lastTopic)}&source=${targetSource}`;
                    if (lastSubject) query += `&subject=${encodeURIComponent(lastSubject)}`;
                    router.replace(`/learning${query}`);
                }
            }
        } else {
            localStorage.setItem(`last_learning_topic_${targetSource}`, urlTopic);
            if (searchParams?.get("subject")) {
                localStorage.setItem(`last_learning_subject_${targetSource}`, searchParams.get("subject")!);
            }
            localStorage.setItem("last_learning_source", targetSource);
        }
    }, [searchParams, router]);

    const getStudentId = (): number => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("user_id");
            return id ? parseInt(id, 10) : 1;
        }
        return 1;
    };

    const handleSelectTopic = (id: string, subjectId?: string) => {
        const query = roadmapIdParam ? `&roadmap_id=${roadmapIdParam}` : "";
        const subjQuery = subjectId ? `&subject=${encodeURIComponent(subjectId)}` : "";
        router.push(`/learning?topic=${encodeURIComponent(id)}${subjQuery}${query}&source=${activeSource}`);
    };

    const activeRequestTopicRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const targetTextRef = useRef("");
    const typewriterIntervalRef = useRef<any>(null);
    const hasSidebarRef = useRef(false);
    const cachedSidebarRef = useRef<any>(null);
    const prevSourceRef = useRef<string>(activeSource);

    const fetchData = async (forceRegenerate: boolean = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
        }
        targetTextRef.current = ""; // Reset immediately to prevent old text leakage

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const sourceChanged = prevSourceRef.current !== activeSource;
        const canSkipSidebar = hasSidebarRef.current && !sourceChanged && !!activeTopic && !forceRegenerate;
        prevSourceRef.current = activeSource;

        if (!canSkipSidebar) {
            setData(null);
            setIsContentLoading(true);
        } else {
            setData(prev => {
                if (!prev) return prev;
                return { ...prev, notesResponse: { content: "" } };
            });
        }

        const studentId = getStudentId();
        const roadmapId = searchParams?.get("roadmap_id") ? parseInt(searchParams.get("roadmap_id") as string) : undefined;
        setHasError(false);

        let currentTypewriterLength = 0;
        typewriterIntervalRef.current = setInterval(() => {
            if (currentTypewriterLength < targetTextRef.current.length) {
                const diff = targetTextRef.current.length - currentTypewriterLength;
                const step = diff > 300 ? 35 : diff > 100 ? 18 : diff > 30 ? 8 : diff > 10 ? 4 : 2;
                currentTypewriterLength += step;
                const nextTextChunk = targetTextRef.current.slice(0, currentTypewriterLength);
                
                setData(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        notesResponse: { content: nextTextChunk }
                    };
                });
            }
        }, 30);

        const runStream = async (topicToStream: string) => {
            activeRequestTopicRef.current = topicToStream;
            
            try {
                await streamLearningContent(topicToStream, studentId, activeSubject, (text) => {
                    if (abortController.signal.aborted) return;
                    if (activeRequestTopicRef.current !== topicToStream) return;
                    let displayMarkdown = text;
                    let revisionData = undefined;
                    if (text.includes("---REVISION---")) {
                        const parts = text.split("---REVISION---");
                        displayMarkdown = parts[0].trim();
                        try { revisionData = JSON.parse(parts[1].trim()); } catch (e) {}
                    }
                    
                    targetTextRef.current = displayMarkdown;

                    if (revisionData) {
                        setData(prev => {
                            if (!prev) return prev;
                            if (activeRequestTopicRef.current !== topicToStream) return prev;
                            return {
                                ...prev,
                                learningAssistantResponse: {
                                    ...prev.learningAssistantResponse,
                                    data: {
                                        ...prev.learningAssistantResponse?.data,
                                        revision: revisionData
                                    }
                                }
                            };
                        });
                    }
                }, abortController.signal, forceRegenerate);
            } catch (streamingError: any) {
                if (streamingError.name !== "AbortError") {
                    setHasError(true);
                }
            }
        };

        let streamPromise: Promise<void> | null = null;
        if (activeTopic) {
            streamPromise = runStream(activeTopic);
        }

        try {
            const response = await getLearningData(activeTopic, studentId, activeSubject, roadmapId, activeSource, undefined, abortController.signal, canSkipSidebar);
            
            if (abortController.signal.aborted) return;
            if (!response) {
                setHasError(true);
                setIsContentLoading(false);
                return;
            }

            const selectedTopic = response.selectedTopic || activeTopic || "General Topic";

            const urlTopic = searchParams?.get("topic");
            if (!urlTopic && response.selectedTopic) {
                const query = roadmapIdParam ? `&roadmap_id=${roadmapIdParam}` : "";
                const subjectId = response.selectedSubject || activeSubject;
                const subjQuery = subjectId ? `&subject=${encodeURIComponent(subjectId)}` : "";
                router.replace(`/learning?topic=${encodeURIComponent(response.selectedTopic)}${subjQuery}${query}&source=${activeSource}`);
            }

            if (canSkipSidebar && cachedSidebarRef.current) {
                response.sidebarData = cachedSidebarRef.current;
            } else if (response.sidebarData) {
                cachedSidebarRef.current = response.sidebarData;
                hasSidebarRef.current = true;
            }

            const hasCachedContent = response.notesResponse && 
                                     typeof response.notesResponse.content === "string" && 
                                     response.notesResponse.content.length > 0;

            if (hasCachedContent && !forceRegenerate) {
                if (streamPromise) {
                    abortController.abort();
                }
                setData(response);
                setIsContentLoading(false);
                activeRequestTopicRef.current = selectedTopic;
                return;
            }

            if (streamPromise && targetTextRef.current) {
                response.notesResponse.content = targetTextRef.current;
            } else {
                response.notesResponse.content = "";
            }

            setData(response);
            setIsContentLoading(false);

            if (!streamPromise) {
                await runStream(selectedTopic);
            } else {
                await streamPromise;
            }
        } catch (e: any) {
            if (e.name !== "AbortError") {
                setHasError(true);
                setIsContentLoading(false);
            }
        }
    };

    const debounceTimerRef = useRef<any>(null);
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchData(false);
        }, 150);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [activeTopic, activeSubject, activeSource, refreshKey, roadmapIdParam]);

    // Fetch Cheat Sheet dynamically (deferred to avoid blocking topic switch)
    const cheatsheetTimerRef = useRef<any>(null);
    const cheatsheetAbortRef = useRef<AbortController | null>(null);
    useEffect(() => {
        const selectedTopic = data?.selectedTopic || activeTopic;
        if (!selectedTopic || typeof selectedTopic !== "string") return;
        
        // Cancel any pending cheatsheet fetch AND in-flight request
        if (cheatsheetTimerRef.current) {
            clearTimeout(cheatsheetTimerRef.current);
        }
        if (cheatsheetAbortRef.current) {
            cheatsheetAbortRef.current.abort();
        }

        return () => {
            if (cheatsheetTimerRef.current) {
                clearTimeout(cheatsheetTimerRef.current);
            }
            if (cheatsheetAbortRef.current) {
                cheatsheetAbortRef.current.abort();
            }
        };
    }, [activeTopic, data?.selectedTopic]);

    const handleSuggestionClick = (id: string) => {
        setSelectedSuggestion(id);
        const targetTopic = data?.selectedTopic || activeTopic || "";
        if (id === "s1") {
            // Standard Practice
            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}&mode=topic`);
        } else if (id === "s2") {
            // Take short quiz
            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}&mode=quiz`);
        }
    };
 
    const handleDocumentClick = (id: string) => {
        setSelectedDocument(id);
        console.log("Document clicked:", id);
    };

    const handleMarkAsRead = async () => {
        if (!data?.selectedTopic) return;
        
        setIsMarkingRead(true);
        try {
            const studentId = getStudentId();
            const res = await completeTopic(studentId, data.selectedTopic, "learning");
            if (res.success) {
                console.log("Topic marked as complete");
                setIsCompletedSession(true);
                setData(prev => {
                    if (!prev) return prev;
                    
                    const currentAttempts = parseInt(prev.headerResponse?.data?.stats?.find((s: any) => s.label === "Attempts")?.value || "0", 10);
                    if (currentAttempts > 0) return prev;

                    return {
                        ...prev,
                        headerResponse: {
                            ...prev.headerResponse,
                            success: true,
                            data: {
                                ...(prev.headerResponse?.data || { category: "", status: "", title: "", subtitle: "", stats: [] }),
                                is_completed: true,
                                status: "Basic Topic",
                                stats: prev.headerResponse?.data?.stats?.map((s: any) => {
                                    if (s.label === "Accuracy" && s.value === "0.0%") return { ...s, value: "10.0%", valueColor: "text-green-400" };
                                    if (s.label === "Attempts" && s.value === "0") return { ...s, value: "1" };
                                    if (s.label === "Difficulty" && s.value === "Mixed") return { ...s, value: "Beginner" };
                                    return s;
                                }) || []
                            }
                        },
                        rightSidebarData: {
                            ...prev.rightSidebarData,
                            success: true,
                            data: {
                                ...(prev.rightSidebarData?.data || { understandingLevel: { mainPercentage: 0, status: "", skillBreakdown: [], baselineText: "" }, commonMistakes: { mistakes: [] }, aiSuggestions: { suggestions: [] }, relatedDocuments: { documents: [] }, timeSpent: { metrics: [], comparison: { value: "", trend: "", text: "" } } }),
                                understandingLevel: {
                                    ...(prev.rightSidebarData?.data?.understandingLevel || { mainPercentage: 0, status: "", skillBreakdown: [], baselineText: "" }),
                                    mainPercentage: 10,
                                    status: "basic",
                                    baselineText: "Based on reading completion",
                                    skillBreakdown: [
                                        { id: "conceptual", label: "Conceptual", percentage: 20, color: "#a78bfa" },
                                        { id: "problem-solving", label: "Problem Solving", percentage: 0, color: "#f87171" }
                                    ]
                                },
                                commonMistakes: {
                                    ...(prev.rightSidebarData?.data?.commonMistakes || { mistakes: [] }),
                                    mistakes: [
                                        { id: "m1", text: "Start practicing to identify common mistakes.", severity: "low" }
                                    ]
                                }
                            }
                        }
                    };
                });
            }
        } catch (error) {
            console.error("Failed to mark topic as complete:", error);
        } finally {
            setIsMarkingRead(false);
        }
    };

    const handleQuickActionClick = async (id: string) => {
        if (id === 'mark_as_read') return;
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        
        setModalContent({
            title: id === 'simpler' ? "Simplifying Concept..." : id === 'example' ? "Generating Examples..." : "Generating Flashcards...",
            type: id === 'simpler' ? 'explain' : id === 'example' ? 'example' : 'flashcard',
            data: "",
            loading: true
        });


        
        try {
            if (id === 'simpler') {
                await streamExplainSimpler(studentId, data.selectedTopic, (text) => {
                    setModalContent(prev => prev ? {
                        ...prev,
                        title: `Explain Simpler: ${data.selectedTopic}`,
                        data: text,
                        loading: false
                    } : null);
                });
            } else if (id === 'example') {
                await streamGiveExamples(studentId, data.selectedTopic, (text) => {
                    setModalContent(prev => prev ? {
                        ...prev,
                        title: `Real-world Examples: ${data.selectedTopic}`,
                        data: text,
                        loading: false
                    } : null);
                });
            } else if (id === 'flashcard') {
                await streamFlashcards(studentId, data.selectedTopic, (text) => {
                    setModalContent(prev => prev ? {
                        ...prev,
                        title: `Study Flashcards: ${data.selectedTopic}`,
                        data: text,
                        loading: false
                    } : null);
                });
            }

        } catch (err) {
            console.error("Failed to execute quick action stream:", err);
            setModalContent(null);
        }
    };

    const handleSaveNotes = async () => {
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        const generatedNotes = data.notesResponse?.content || "";
        try {
            const res = await saveNotes(studentId, data.selectedTopic, generatedNotes);
            if (res.success) {
                alert("Notes saved.");
            }
        } catch (err) {
            console.error("Failed to save notes:", err);
        }
    };

    const handleAddRevision = async () => {
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        try {
            const res = await addToRevision(studentId, data.selectedTopic);
            if (res.success) {
                alert("Added to revision.");
                setRefreshKey(prev => prev + 1);
            }
        } catch (err) {
            console.error("Failed to add to revision:", err);
        }
    };

    const handleConceptClick = (concept: any) => {
        if (concept.topic) {
            const subjQuery = activeSubject ? `&subject=${encodeURIComponent(activeSubject)}` : "";
            router.push(`/learning?topic=${encodeURIComponent(concept.topic)}${subjQuery}&source=${activeSource}`);
        }
    };

    const handleLearningActionClick = async (id: string) => {
        if (!data?.selectedTopic) return;
        
        if (id === "practice_topic") {
            router.push(`/practice?topic=${encodeURIComponent(data.selectedTopic)}&source=${activeSource}`);
        } else if (id === "take_quiz") {
            router.push(`/practice?topic=${encodeURIComponent(data.selectedTopic)}&mode=exam&source=${activeSource}`);
        } else if (id === "add_revision") {
            await handleAddRevision();
        } else if (id === "view_notes") {
            setShowSummary(true);
            const notesEl = document.getElementById("notes-section");
            const container = document.getElementById("learning-content-container");
            if (notesEl && container) {
                const targetY = notesEl.getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top - 24;
                container.scrollTo({
                    top: targetY,
                    behavior: 'smooth'
                });
            } else if (notesEl) {
                notesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };
 
    if (hasError) {
        return (
            <div className="flex w-full h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 p-6 relative">
                <OfflineState />
                <ErrorState message="Could not load learning workspace details." onRetry={fetchData} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="relative w-full">
                <OfflineState />
                <LearningSkeleton />
            </div>
        );
    }

    const isBackendCompleted = data.headerResponse?.data?.is_completed;
    const isTopicCompleted = isBackendCompleted || isCompletedSession;

    const actionDescriptions: Record<string, string> = {
        simpler: "Get a simplified summary of the topic",
        example: "See real-world applications and use cases",
        flashcard: "Test your memory with active recall cards"
    };

    const quickActions = [
        ...(data.learningAssistantResponse?.data?.actions?.map((action: any) => ({
            ...action,
            description: actionDescriptions[action.id] || "",
            icon: ICON_MAP[action.iconName] || FileText
        })) || [])
    ];

    const learningActions = data.learningAssistantResponse?.data?.learningActions?.map((action: any) => ({
        ...action,
        icon: ICON_MAP[action.iconName] || FileText,
        onClick: () => handleLearningActionClick(action.id)
    })) || [];

    const rightSidebarData = {
        ...(data.rightSidebarData?.data || {}),
        aiSuggestions: {
            ...(data.rightSidebarData?.data?.aiSuggestions || {}),
            suggestions: data.rightSidebarData?.data?.aiSuggestions?.suggestions
                ?.filter((s: any) => s.id !== "s2")
                ?.map((s: any) => ({
                    ...s,
                    icon: ICON_MAP[s.iconName] || FileText
                })) || []
        },
        relatedDocuments: {
            ...(data.rightSidebarData?.data?.relatedDocuments || {}),
            documents: data.rightSidebarData?.data?.relatedDocuments?.documents?.map((d: any) => ({
                ...d,
                icon: ICON_MAP[d.iconName] || FileText
            })) || []
        }
    };

    return (
        <div className="flex w-full h-[calc(100vh-4rem)] relative">
            <OfflineState />
            <div className="w-[20vw] shrink-0 h-full border-r border-white/10">
                <LearningSidebar data={data} onSelectTopic={handleSelectTopic} roadmapId={roadmapIdParam} />
            </div>

            <div id="learning-content-container" className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto purple-scrollbar relative">
                {isContentLoading && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 animate-pulse z-10" />
                )}
                <div className={`flex-1 space-y-6 px-6 py-6 w-full max-w-4xl mx-auto transition-opacity duration-300 ${isContentLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                    <Header data={data.headerResponse?.data} />
                    
                    <div id="notes-section">
                        <NotesCard notesResponse={data.notesResponse} onRegenerate={() => fetchData(true)} />
                    </div>

                    <button
                        onClick={isTopicCompleted ? undefined : handleMarkAsRead}
                        disabled={isMarkingRead}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            isTopicCompleted 
                                ? "bg-green-500/10 text-green-400 border-green-500/20 cursor-default" 
                                : "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white border-[#7276ff]/20 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/10"
                        }`}
                    >
                        <CheckCircle className="h-4 w-4" />
                        <span>{isTopicCompleted ? "Already Read" : isMarkingRead ? "Marking..." : "Mark as Read"}</span>
                    </button>

                    <QuickRevisionCard
                        points={cheatsheetPoints.length > 0 ? cheatsheetPoints : (data.learningAssistantResponse?.data?.revision?.points || [])}
                        onSaveNotes={handleSaveNotes}
                        onAddRevision={handleAddRevision}
                    />
                    <button
                        onClick={() => {
                            const targetTopic = data?.selectedTopic || activeTopic || "";
                            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}`);
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/20 active:scale-[0.98] mt-6"
                    >
                        <span>📝 Practice Topic</span>
                    </button>
                </div>
            </div>

            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-l border-white/10 bg-[#131826]">
                <Sidebar 
                    data={rightSidebarData}
                    quickActions={quickActions}
                    onActionClick={handleQuickActionClick}
                    onSuggestionClick={handleSuggestionClick}
                />
            </div>

            {/* AI Modal Overlay */}
            {modalContent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                {modalContent.title}
                            </h3>
                            <button
                                onClick={() => setModalContent(null)}
                                className="text-white/40 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-white/5"
                            >
                                Close
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-zinc-300 custom-scrollbar">
                            {modalContent.loading && !modalContent.data ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-zinc-400 text-xs animate-pulse">AI is generating content, please wait...</p>
                                </div>
                            ) : modalContent.type === 'explain' ? (() => {
                                // Inline Parser for Explain
                                const text = modalContent.data || "";
                                const conceptMatch = text.match(/\[CONCEPT\]([\s\S]*?)(?=\[ANALOGY\]|\[TAKEAWAY\]|$)/i);
                                const analogyMatch = text.match(/\[ANALOGY\]([\s\S]*?)(?=\[TAKEAWAY\]|$)/i);
                                const takeawayMatch = text.match(/\[TAKEAWAY\]([\s\S]*?)$/i);
                                
                                const concept = conceptMatch ? conceptMatch[1].replace(/===/g, "").trim() : "";
                                const analogy = analogyMatch ? analogyMatch[1].replace(/===/g, "").trim() : "";
                                const takeaway = takeawayMatch ? takeawayMatch[1].replace(/===/g, "").trim() : "";

                                // Fallback for old cache format
                                if (!concept && !analogy && !takeaway) {
                                    return (
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                                            <ReactMarkdown>{text}</ReactMarkdown>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {concept && (
                                            <div className="border border-blue-500/20 bg-blue-500/5 rounded-2xl p-5 shadow-sm">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                                                    <span>📝</span> Concept Definition
                                                </h4>
                                                <p className="text-xs leading-relaxed text-zinc-350">{concept}</p>
                                            </div>
                                        )}
                                        {analogy && (
                                            <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-5 shadow-sm">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                                                    <span>💡</span> Creative Analogy
                                                </h4>
                                                <p className="text-xs leading-relaxed text-zinc-350">{analogy}</p>
                                            </div>
                                        )}
                                        {takeaway && (
                                            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-5 shadow-sm">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                                                    <span>🎯</span> Key Takeaway
                                                </h4>
                                                <p className="text-xs leading-relaxed text-emerald-400 font-medium">{takeaway}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })() : modalContent.type === 'example' ? (() => {
                                // Inline Parser for Examples
                                const text = modalContent.data || "";
                                const items = text.split("===");
                                const parsed = items.map((item: string, idx: number) => {
                                    const titleMatch = item.match(/\[TITLE\]([\s\S]*?)(?=\[CONTENT\]|$)/i);
                                    const contentMatch = item.match(/\[CONTENT\]([\s\S]*?)$/i);
                                    return {
                                        id: idx,
                                        title: titleMatch ? titleMatch[1].replace(/\[TITLE\]/gi, "").trim() : `Example ${idx + 1}`,
                                        content: contentMatch ? contentMatch[1].replace(/\[CONTENT\]/gi, "").trim() : "",
                                    };
                                }).filter((item: any) => item.content || item.title.includes("Example"));

                                // Fallback for old cache format
                                if (parsed.length === 0) {
                                    return (
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                                            <ReactMarkdown>{text}</ReactMarkdown>
                                        </div>
                                    );
                                }

                                const colors = [
                                    "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
                                    "border-purple-500/20 bg-purple-500/5 text-purple-400",
                                    "border-rose-500/20 bg-rose-500/5 text-rose-400"
                                ];
                                return (
                                    <div className="space-y-4">
                                        {parsed.map((item: any, idx: number) => (
                                            <div key={idx} className={`border rounded-2xl p-5 shadow-sm ${colors[idx % colors.length].split(" ").slice(0, 2).join(" ")}`}>
                                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors[idx % colors.length].split(" ")[2]}`}>
                                                    <span>🌟</span> {item.title}
                                                </h4>
                                                <p className="text-xs leading-relaxed text-zinc-350">{item.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })() : (() => {
                                // Inline Parser for Flashcards
                                const text = modalContent.data || "";
                                const items = text.split("===");
                                const parsed = items.map((item: string, idx: number) => {
                                    const qMatch = item.match(/\[QUESTION\]([\s\S]*?)(?=\[ANSWER\]|$)/i);
                                    const aMatch = item.match(/\[ANSWER\]([\s\S]*?)$/i);
                                    return {
                                        id: idx,
                                        question: qMatch ? qMatch[1].trim() : "",
                                        answer: aMatch ? aMatch[1].trim() : "",
                                    };
                                }).filter((item: any) => item.question || item.answer);

                                // Fallback for old cache format
                                if (parsed.length === 0) {
                                    return (
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                                            <ReactMarkdown>{text}</ReactMarkdown>
                                        </div>
                                    );
                                }

                                const cardThemes = [
                                    {
                                        unrevealedBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border-blue-500/20 hover:border-blue-400/50 shadow-md shadow-blue-500/5",
                                        revealedBg: "bg-gradient-to-br from-blue-950/80 to-blue-900/40 border-blue-400/50 shadow-lg shadow-blue-500/10",
                                        headerTag: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                        actionText: "text-blue-400 hover:text-blue-300",
                                        answerLabel: "text-blue-400",
                                    },
                                    {
                                        unrevealedBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border-purple-500/20 hover:border-purple-400/50 shadow-md shadow-purple-500/5",
                                        revealedBg: "bg-gradient-to-br from-purple-950/80 to-purple-900/40 border-purple-400/50 shadow-lg shadow-purple-500/10",
                                        headerTag: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                                        actionText: "text-purple-400 hover:text-purple-300",
                                        answerLabel: "text-purple-400",
                                    },
                                    {
                                        unrevealedBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-emerald-500/20 hover:border-emerald-400/50 shadow-md shadow-emerald-500/5",
                                        revealedBg: "bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 border-emerald-400/50 shadow-lg shadow-emerald-500/10",
                                        headerTag: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                        actionText: "text-emerald-400 hover:text-emerald-300",
                                        answerLabel: "text-emerald-400",
                                    },
                                    {
                                        unrevealedBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-amber-500/20 hover:border-amber-400/50 shadow-md shadow-amber-500/5",
                                        revealedBg: "bg-gradient-to-br from-amber-950/80 to-amber-900/40 border-amber-400/50 shadow-lg shadow-amber-500/10",
                                        headerTag: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                        actionText: "text-amber-400 hover:text-amber-300",
                                        answerLabel: "text-amber-400",
                                    },
                                    {
                                        unrevealedBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 border-rose-500/20 hover:border-rose-400/50 shadow-md shadow-rose-500/5",
                                        revealedBg: "bg-gradient-to-br from-rose-950/80 to-rose-900/40 border-rose-400/50 shadow-lg shadow-rose-500/10",
                                        headerTag: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                                        actionText: "text-rose-400 hover:text-rose-300",
                                        answerLabel: "text-rose-400",
                                    }
                                ];

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {parsed.map((item: any) => {
                                            const isRevealed = revealedFlashcardIds.includes(item.id);
                                            const theme = cardThemes[item.id % cardThemes.length];
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        setRevealedFlashcardIds((prev: number[]) => 
                                                            prev.includes(item.id) 
                                                                ? prev.filter((id: number) => id !== item.id) 
                                                                : [...prev, item.id]
                                                        );
                                                    }}
                                                    className={`border rounded-2xl p-5 min-h-[150px] flex flex-col justify-between cursor-pointer transition-all duration-300 select-none ${
                                                        isRevealed ? theme.revealedBg : theme.unrevealedBg
                                                    }`}
                                                >
                                                    <div>
                                                        <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${theme.headerTag}`}>
                                                            Flashcard {item.id + 1}
                                                        </span>
                                                        <p className="text-[11px] font-bold text-white mt-3 leading-snug">
                                                            {item.question}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col items-start">
                                                        {isRevealed ? (
                                                            <div className="animate-in fade-in slide-in-from-top-1 duration-200 w-full">
                                                                <span className={`text-[9px] font-bold tracking-wider uppercase ${theme.answerLabel}`}>Answer:</span>
                                                                <p className="text-[10px] text-zinc-200 mt-1 leading-relaxed">{item.answer}</p>
                                                            </div>
                                                        ) : (
                                                            <button className={`text-[9px] font-bold tracking-wider uppercase transition flex items-center gap-1 ${theme.actionText}`}>
                                                                <span>👀</span> Click to Reveal Answer
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
