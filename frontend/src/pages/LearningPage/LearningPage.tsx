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
  streamSummarizeTopic,
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
        type: 'explain' | 'example' | 'summarize';
        data: any;
        loading?: boolean;
    } | null>(null);

    const [cheatsheetPoints, setCheatsheetPoints] = useState<any[]>([]);

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
        if (!urlTopic) {
            const lastTopic = localStorage.getItem(`last_learning_topic_${targetSource}`);
            const lastSubject = localStorage.getItem(`last_learning_subject_${targetSource}`);
            if (lastTopic) {
                let query = `?topic=${encodeURIComponent(lastTopic)}&source=${targetSource}`;
                if (lastSubject) query += `&subject=${encodeURIComponent(lastSubject)}`;
                router.replace(`/learning${query}`);
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
        setActiveTopic(id);
        setActiveSubject(subjectId);
        
        const query = roadmapIdParam ? `&roadmap_id=${roadmapIdParam}` : "";
        const subjQuery = subjectId ? `&subject=${encodeURIComponent(subjectId)}` : "";
        window.history.pushState(
            null, 
            "", 
            `/learning?topic=${encodeURIComponent(id)}${subjQuery}${query}&source=${activeSource}`
        );
    };

    const activeRequestTopicRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const targetTextRef = useRef("");
    const typewriterIntervalRef = useRef<any>(null);

    const fetchData = async (forceRegenerate: boolean = false) => {
        // Cancel any previous pending requests and typewriter timers immediately
        if (abortControllerRef.current) {
            console.log("Cancelling previous request.");
            abortControllerRef.current.abort();
        }
        if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Set isContentLoading to true immediately to trigger local loading states
        setIsContentLoading(true);

        const studentId = getStudentId();
        const roadmapId = searchParams?.get("roadmap_id") ? parseInt(searchParams.get("roadmap_id") as string) : undefined;
        try {
            setHasError(false);
            const response = await getLearningData(activeTopic, studentId, activeSubject, roadmapId, activeSource, undefined, abortController.signal);
            
            if (abortController.signal.aborted) return;
            if (!response) {
                setHasError(true);
                setIsContentLoading(false);
                return;
            }

            const selectedTopic = response.selectedTopic || activeTopic || "General Topic";

            // Sync URL parameters in the history state if the topic parameter was missing (e.g. on roadmap select)
            const urlTopic = searchParams?.get("topic");
            if (!urlTopic && response.selectedTopic) {
                const query = roadmapIdParam ? `&roadmap_id=${roadmapIdParam}` : "";
                const subjectId = response.selectedSubject || activeSubject;
                const subjQuery = subjectId ? `&subject=${encodeURIComponent(subjectId)}` : "";
                window.history.replaceState(
                    null,
                    "",
                    `/learning?topic=${encodeURIComponent(response.selectedTopic)}${subjQuery}${query}&source=${activeSource}`
                );
                setActiveTopic(response.selectedTopic);
                if (subjectId) setActiveSubject(subjectId);
            }

            // If topic is already cached, load it instantly and skip streaming
            const hasCachedContent = response.notesResponse && 
                                     typeof response.notesResponse.content === "string" && 
                                     response.notesResponse.content.length > 0;

            if (hasCachedContent && !forceRegenerate) {
                setData(response);
                setIsContentLoading(false);
                activeRequestTopicRef.current = selectedTopic;
                return;
            }

            setData(response);
            setIsContentLoading(false);

            // Prevent duplicate requests for the same topic
            if (activeRequestTopicRef.current === selectedTopic && !forceRegenerate) {
                console.log("Topic has not changed and no regeneration requested. Reusing explanation.");
                return;
            }

            activeRequestTopicRef.current = selectedTopic;

            // Reset notes content and typewriter target so the skeleton loader shows
            targetTextRef.current = "";
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    notesResponse: { content: "" }
                };
            });

            // Start smooth typewriter interval
            let currentTypewriterLength = 0;
            typewriterIntervalRef.current = setInterval(() => {
                if (currentTypewriterLength < targetTextRef.current.length) {
                    const diff = targetTextRef.current.length - currentTypewriterLength;
                    // Catch up step based on how far behind the typewriter is from the target stream text
                    const step = diff > 300 ? 35 : diff > 100 ? 18 : diff > 30 ? 8 : diff > 10 ? 4 : 2;
                    currentTypewriterLength += step;
                    const nextTextChunk = targetTextRef.current.slice(0, currentTypewriterLength);
                    
                    setData(prev => {
                        if (!prev) return prev;
                        if (activeRequestTopicRef.current !== selectedTopic) return prev;
                        return {
                            ...prev,
                            notesResponse: { content: nextTextChunk }
                        };
                    });
                }
            }, 30);

            // If we are forcing regeneration, we call the clear cache endpoint first
            if (forceRegenerate) {
                try {
                    await fetch(`/api/learning/content?student_id=${studentId}&topic=${encodeURIComponent(selectedTopic)}&subject=${encodeURIComponent(activeSubject || "")}&force=true&t=${Date.now()}`, {
                        method: "GET",
                        headers: {
                            "Cache-Control": "no-cache",
                            "Pragma": "no-cache"
                        }
                    });
                } catch (err) {
                    console.warn("Failed to clear backend content cache:", err);
                }
            }

            try {
                await streamLearningContent(selectedTopic, studentId, activeSubject, (text) => {
                    let displayMarkdown = text;
                    let revisionData = undefined;
                    if (text.includes("---REVISION---")) {
                        const parts = text.split("---REVISION---");
                        displayMarkdown = parts[0].trim();
                        try {
                            revisionData = JSON.parse(parts[1].trim());
                        } catch (e) {}
                    }
                    
                    // Update the target text so the typewriter queue can pick it up and stream continuously
                    targetTextRef.current = displayMarkdown;

                    if (revisionData) {
                        setData(prev => {
                            if (!prev) return prev;
                            if (activeRequestTopicRef.current !== selectedTopic) return prev;
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
                }, abortController.signal);
            } catch (streamingError: any) {
                if (streamingError.name === "AbortError") {
                    console.log("Request successfully aborted.");
                    return;
                }
                console.warn("Streaming failed, letting user know:", streamingError);
                // No fallback to synchronous REST calls - strictly streaming only!
                setHasError(true);
            }
        } catch (error: any) {
            if (error.name === "AbortError" || (error instanceof DOMException && error.name === "AbortError")) {
                console.log("Request successfully aborted.");
                return;
            }
            console.error("Failed to load learning data:", error);
            setHasError(true);
        }
    };

    useEffect(() => {
        fetchData(false);
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [activeTopic, activeSubject, activeSource, refreshKey]);

    // Fetch Cheat Sheet dynamically
    useEffect(() => {
        const selectedTopic = data?.selectedTopic || activeTopic;
        if (!selectedTopic || typeof selectedTopic !== "string") return;
        
        async function fetchCheatSheet() {
            try {
                const studentId = getStudentId();
                const res = await getCheatSheet(studentId, selectedTopic as string);
                if (res.success && res.data?.bullets) {
                    setCheatsheetPoints(res.data.bullets.map((b: string, i: number) => ({
                        id: String(i),
                        text: b
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch cheatsheet:", err);
            }
        }
        fetchCheatSheet();
    }, [activeTopic, data?.selectedTopic]);

    const handleSuggestionClick = (id: string) => {
        setSelectedSuggestion(id);
        console.log("Suggestion clicked:", id);
    };
 
    const handleDocumentClick = (id: string) => {
        setSelectedDocument(id);
        console.log("Document clicked:", id);
    };

    const handleMarkAsRead = async () => {
        if (!data?.selectedTopic) return;
        
        const sessionsVal = data.headerResponse?.data?.stats?.find((s: any) => s.label === "Sessions")?.value || "0";
        const sessions = parseInt(sessionsVal, 10);
        
        if (sessions < 2) {
            alert("Please complete the practice sessions first to mark this topic as read!");
            return;
        }
        
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
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        
        setModalContent({
            title: id === 'simpler' ? "Simplifying Concept..." : id === 'example' ? "Generating Examples..." : "Generating Summary...",
            type: id as 'explain' | 'example' | 'summarize',
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
            } else if (id === 'summary') {
                await streamSummarizeTopic(studentId, data.selectedTopic, (text) => {
                    setModalContent(prev => prev ? {
                        ...prev,
                        title: `Summary & Key Points: ${data.selectedTopic}`,
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

    const quickActions = [
        ...(data.learningAssistantResponse?.data?.actions?.map((action: any) => ({
            ...action,
            icon: ICON_MAP[action.iconName] || FileText
        })) || []),
        {
            id: "mark_as_read",
            icon: CheckCircle,
            label: isTopicCompleted ? "Already Read" : isMarkingRead ? "Marking..." : "Mark as Read",
            onClick: isTopicCompleted ? undefined : handleMarkAsRead,
            primary: true,
            variant: isTopicCompleted ? "green" : "primary"
        }
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
            suggestions: data.rightSidebarData?.data?.aiSuggestions?.suggestions?.map((s: any) => ({
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
            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-r border-white/10">
                <LearningSidebar data={data} onSelectTopic={handleSelectTopic} />
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
                    
                    <QuickActions
                        actions={quickActions}
                        onActionClick={handleQuickActionClick}
                    />
                    
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
                    onSuggestionClick={handleSuggestionClick}
                    onDocumentClick={handleDocumentClick}
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
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                                    <ReactMarkdown>{modalContent.data || ""}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
