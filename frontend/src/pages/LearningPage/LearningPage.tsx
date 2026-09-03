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
import { notesBlocksToMarkdown, parseRevisionPayload } from "@/lib/learningContent";
import { normalizeReadableMath } from "@/lib/readableMath";

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
    const [showSummary, setShowSummary] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isTypewriting, setIsTypewriting] = useState(false);
    const [isSummaryReady, setIsSummaryReady] = useState(false);
    const [isAddingRevision, setIsAddingRevision] = useState(false);
    const [revisionError, setRevisionError] = useState<string | null>(null);

    const [modalContent, setModalContent] = useState<{
        title: string;
        type: 'explain' | 'example' | 'flashcard';
        data: any;
        loading?: boolean;
    } | null>(null);
    const quickActionAbortRef = useRef<AbortController | null>(null);
    const quickActionRequestRef = useRef(0);


    const [cheatsheetPoints, setCheatsheetPoints] = useState<any[]>([]);
    const [revealedFlashcardIds, setRevealedFlashcardIds] = useState<number[]>([]);


    useEffect(() => {
        const urlTopic = searchParams?.get("topic") || undefined;
        const urlSubject = searchParams?.get("subject") || undefined;
        const urlSource = searchParams?.get("source") || "courses";
        
        if (urlTopic !== activeTopic) setActiveTopic(urlTopic);
        if (urlSubject !== activeSubject) setActiveSubject(urlSubject);
        if (urlSource !== activeSource) setActiveSource(urlSource);
    }, [searchParams, activeTopic, activeSubject, activeSource]);

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

    const getStudentId = (): number | null => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("user_id");
            const parsed = id ? parseInt(id, 10) : NaN;
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        }
        return null;
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
    const cachedSidebarContextRef = useRef<string | null>(null);
    const summaryGenerationActiveRef = useRef(false);
    const summaryReadyRef = useRef(false);
    const streamCompletedRef = useRef(false);

    const fetchData = async (forceRegenerate: boolean = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
            typewriterIntervalRef.current = null;
        }
        targetTextRef.current = ""; // Reset immediately to prevent old text leakage
        summaryGenerationActiveRef.current = true;
        summaryReadyRef.current = false;
        streamCompletedRef.current = false;
        setIsSummaryReady(false);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Sidebar contents depend on both the source and the selected roadmap.
        // Reusing a sidebar from a specific roadmap after switching to "All Topics"
        // would hide the other roadmaps until a full reload.
        const sidebarContext = `${activeSource}:${roadmapIdParam ?? "all"}`;
        const canSkipSidebar = hasSidebarRef.current &&
            cachedSidebarContextRef.current === sidebarContext &&
            !!activeTopic &&
            !forceRegenerate;

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
        if (studentId === null) {
            setHasError(true);
            setIsContentLoading(false);
            setIsTypewriting(false);
            return;
        }
        const roadmapId = searchParams?.get("roadmap_id") ? parseInt(searchParams.get("roadmap_id") as string) : undefined;
        setHasError(false);

        setIsTypewriting(true);
        const finishSummaryWhenDisplayed = () => {
            if (
                abortControllerRef.current !== abortController ||
                abortController.signal.aborted ||
                !streamCompletedRef.current ||
                !targetTextRef.current.trim() ||
                currentTypewriterLength < targetTextRef.current.length
            ) {
                return;
            }

            setIsTypewriting(false);
            summaryGenerationActiveRef.current = false;
            summaryReadyRef.current = true;
            setIsSummaryReady(true);
            if (typewriterIntervalRef.current) {
                clearInterval(typewriterIntervalRef.current);
                typewriterIntervalRef.current = null;
            }
        };

        let currentTypewriterLength = 0;
        const startTypewriter = () => {
            setIsTypewriting(true);
            currentTypewriterLength = 0;
            typewriterIntervalRef.current = setInterval(() => {
                if (currentTypewriterLength < targetTextRef.current.length) {
                    const diff = targetTextRef.current.length - currentTypewriterLength;
                    // Faster catch-up steps so text flows continuously and doesn't lag behind fast streaming
                    const step = diff > 400 ? 120 : diff > 150 ? 50 : diff > 50 ? 20 : diff > 15 ? 8 : 3;
                    currentTypewriterLength += step;
                    const nextTextChunk = targetTextRef.current.slice(0, currentTypewriterLength);
                    
                    setData(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            notesResponse: { content: nextTextChunk }
                        };
                    });
                } else {
                    finishSummaryWhenDisplayed();
                }
            }, 20); // Faster interval for fluid rendering
        };

        const runStream = async (topicToStream: string): Promise<boolean> => {
            activeRequestTopicRef.current = topicToStream;
            
            try {
                await streamLearningContent(topicToStream, studentId, activeSubject, (text) => {
                    if (abortController.signal.aborted) return;
                    if (activeRequestTopicRef.current !== topicToStream) return;
                    const parsedContent = parseRevisionPayload(text);
                    targetTextRef.current = parsedContent.content;

                    if (parsedContent.revision) {
                        setData(prev => {
                            if (!prev) return prev;
                            if (activeRequestTopicRef.current !== topicToStream) return prev;
                            return {
                                ...prev,
                                learningAssistantResponse: {
                                    ...prev.learningAssistantResponse,
                                    data: {
                                        ...prev.learningAssistantResponse?.data,
                                        revision: parsedContent.revision
                                    }
                                }
                            };
                        });
                    }
                }, abortController.signal, forceRegenerate);
                if (
                    abortController.signal.aborted ||
                    abortControllerRef.current !== abortController
                ) {
                    return false;
                }
                streamCompletedRef.current = true;
                finishSummaryWhenDisplayed();
                return true;
            } catch (streamingError: any) {
                if (
                    streamingError.name !== "AbortError" &&
                    abortControllerRef.current === abortController
                ) {
                    setHasError(true);
                }
                return false;
            }
        };

        try {
            const response = await getLearningData(activeTopic, studentId, activeSubject, roadmapId, activeSource, undefined, abortController.signal, canSkipSidebar);
            
            if (abortController.signal.aborted) return;
            if (!response) {
                setHasError(true);
                setIsContentLoading(false);
                if (abortControllerRef.current === abortController) {
                    summaryGenerationActiveRef.current = false;
                }
                return;
            }

            const selectedTopic = response.selectedTopic || activeTopic || "General Topic";

            if (response.notesResponse && Array.isArray(response.notesResponse.content)) {
                response.notesResponse.content = notesBlocksToMarkdown(
                    response.notesResponse.content,
                    response.selectedTopic || activeTopic || "Topic"
                );
            }

            if (response.notesResponse && typeof response.notesResponse.content === "string") {
                const parsedContent = parseRevisionPayload(response.notesResponse.content);
                response.notesResponse.content = parsedContent.content;
                if (parsedContent.revision) {
                    if (!response.learningAssistantResponse) {
                        response.learningAssistantResponse = { data: {} };
                    }
                    if (!response.learningAssistantResponse.data) {
                        response.learningAssistantResponse.data = {};
                    }
                    response.learningAssistantResponse.data.revision = parsedContent.revision;
                }
            }

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
                cachedSidebarContextRef.current = sidebarContext;
                hasSidebarRef.current = true;
            }

            const hasCachedContent = response.notesResponse && 
                                     typeof response.notesResponse.content === "string" && 
                                     response.notesResponse.content.length > 0;

            if (hasCachedContent && !forceRegenerate) {
                setData(response);
                setIsContentLoading(false);
                setIsTypewriting(false);
                streamCompletedRef.current = true;
                summaryGenerationActiveRef.current = false;
                summaryReadyRef.current = true;
                setIsSummaryReady(true);
                activeRequestTopicRef.current = selectedTopic;
                return;
            }

            // Cache miss / force regenerate: Start typewriter and request stream
            startTypewriter();
            response.notesResponse.content = "";
            setData(response);

            await runStream(selectedTopic);
            setIsContentLoading(false);
            finishSummaryWhenDisplayed();
        } catch (e: any) {
            if (
                e.name !== "AbortError" &&
                abortControllerRef.current === abortController
            ) {
                setHasError(true);
                setIsContentLoading(false);
            }
            if (abortControllerRef.current === abortController) {
                summaryGenerationActiveRef.current = false;
                summaryReadyRef.current = false;
                setIsSummaryReady(false);
            }
        }
    };

    const debounceTimerRef = useRef<any>(null);
    useEffect(() => {
        summaryGenerationActiveRef.current = true;
        summaryReadyRef.current = false;
        setIsSummaryReady(false);
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
            if (typewriterIntervalRef.current) {
                clearInterval(typewriterIntervalRef.current);
                typewriterIntervalRef.current = null;
            }
        };
    }, [activeTopic, activeSubject, activeSource, roadmapIdParam]);

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
        const subjectQuery = activeSubject ? `&subject=${encodeURIComponent(activeSubject)}` : "";
        const roadmapQuery = roadmapIdParam ? `&roadmap_id=${encodeURIComponent(roadmapIdParam)}` : "";
        if (id === "s1") {
            // Standard Practice
            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}&mode=topic${subjectQuery}${roadmapQuery}`);
        } else if (id === "s2") {
            // Take short quiz
            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}&mode=quiz${subjectQuery}${roadmapQuery}`);
        }
    };
 
    const handleDocumentClick = (id: string) => {
        setSelectedDocument(id);
        console.log("Document clicked:", id);
    };

    const handleMarkAsRead = async () => {
        const hasSummaryContent =
            typeof data?.notesResponse?.content === "string" &&
            data.notesResponse.content.trim().length > 0;
        const isCurrentTopic = !activeTopic || data?.selectedTopic === activeTopic;

        // Completion is only valid after the current summary stream and
        // typewriter have both finished. The ref guards the same click event
        // that starts regeneration, before React can commit the next render.
        if (
            !data?.selectedTopic ||
            !isCurrentTopic ||
            isMarkingRead ||
            summaryGenerationActiveRef.current ||
            !summaryReadyRef.current ||
            !hasSummaryContent
        ) {
            return;
        }
        
        setIsMarkingRead(true);
        try {
            const studentId = getStudentId();
            if (studentId === null) return;
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

    useEffect(() => {
        return () => {
            quickActionAbortRef.current?.abort();
        };
    }, []);

    const closeQuickAction = () => {
        quickActionAbortRef.current?.abort();
        quickActionAbortRef.current = null;
        quickActionRequestRef.current += 1;
        setModalContent(null);
    };

    const handleQuickActionClick = async (id: string) => {
        if (id === 'mark_as_read') return;
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        if (studentId === null) return;

        quickActionAbortRef.current?.abort();
        const controller = new AbortController();
        const requestId = quickActionRequestRef.current + 1;
        quickActionRequestRef.current = requestId;
        quickActionAbortRef.current = controller;
        const topic = data.selectedTopic;

        setModalContent({
            title: id === 'simpler' ? "Simplifying Concept..." : id === 'example' ? "Generating Examples..." : "Generating Flashcards...",
            type: id === 'simpler' ? 'explain' : id === 'example' ? 'example' : 'flashcard',
            data: "",
            loading: true
        });

        const isCurrentRequest = () => (
            quickActionRequestRef.current === requestId && !controller.signal.aborted
        );
        const updateStream = (text: string) => {
            if (!isCurrentRequest()) return;
            // Keep the modal in its loading state while tagged output is incomplete.
            // The renderer must never expose protocol markers such as [TITLE].
            setModalContent(prev => prev ? {
                ...prev,
                data: text,
                loading: true
            } : null);
        };
        const completeStream = (title: string, text: string) => {
            if (!isCurrentRequest()) return;
            setModalContent(prev => prev ? {
                ...prev,
                title,
                data: text,
                loading: false
            } : null);
        };

        try {
            if (id === 'simpler') {
                const text = await streamExplainSimpler(studentId, topic, updateStream, controller.signal);
                completeStream(`Explain Simpler: ${topic}`, text);
            } else if (id === 'example') {
                const text = await streamGiveExamples(studentId, topic, updateStream, controller.signal);
                completeStream(`Real-world Examples: ${topic}`, text);
            } else if (id === 'flashcard') {
                const text = await streamFlashcards(studentId, topic, updateStream, controller.signal);
                completeStream(`Study Flashcards: ${topic}`, text);
            }

        } catch (err) {
            if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                return;
            }
            console.error("Failed to execute quick action stream:", err);
            if (isCurrentRequest()) setModalContent(null);
        } finally {
            if (quickActionAbortRef.current === controller) {
                quickActionAbortRef.current = null;
            }
        }
    };

    const handleSaveNotes = async () => {
        if (!data?.selectedTopic) return;
        const studentId = getStudentId();
        if (studentId === null) return;
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
        if (!data?.selectedTopic || isAddingRevision) return;
        if (data.learningAssistantResponse?.data?.revisionStatus?.is_queued) return;

        const studentId = getStudentId();
        if (studentId === null) return;
        setIsAddingRevision(true);
        setRevisionError(null);
        try {
            const res = await addToRevision(studentId, data.selectedTopic, "high", activeSubject);
            if (!res.success) {
                throw new Error(res.message || "Could not add this topic to revision.");
            }

            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    learningAssistantResponse: {
                        ...prev.learningAssistantResponse,
                        data: {
                            ...prev.learningAssistantResponse?.data,
                            revisionStatus: {
                                is_queued: true,
                                priority: res.revision_item?.priority || "high",
                                item_id: res.revision_item?.id || null,
                            },
                        },
                    },
                };
            });
        } catch (err) {
            console.error("Failed to add to revision:", err);
            setRevisionError(err instanceof Error ? err.message : "Could not add this topic to revision.");
        } finally {
            setIsAddingRevision(false);
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
        
        const subjectQuery = activeSubject ? `&subject=${encodeURIComponent(activeSubject)}` : "";
        const roadmapQuery = roadmapIdParam ? `&roadmap_id=${encodeURIComponent(roadmapIdParam)}` : "";
        if (id === "practice_topic") {
            router.push(`/practice?topic=${encodeURIComponent(data.selectedTopic)}&source=${activeSource}${subjectQuery}${roadmapQuery}`);
        } else if (id === "take_quiz") {
            router.push(`/practice?topic=${encodeURIComponent(data.selectedTopic)}&mode=exam&source=${activeSource}${subjectQuery}${roadmapQuery}`);
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
    const isSummaryGenerating = !isSummaryReady || isContentLoading || isTypewriting;

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
                        <NotesCard notesResponse={data.notesResponse} onRegenerate={() => fetchData(true)} isGenerating={isTypewriting} />
                    </div>

                    <button
                        onClick={isTopicCompleted || isSummaryGenerating ? undefined : handleMarkAsRead}
                        disabled={isMarkingRead || isSummaryGenerating}
                        aria-busy={isSummaryGenerating}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                            isTopicCompleted
                                ? "bg-green-500/10 text-green-400 border-green-500/20 cursor-default"
                                : isSummaryGenerating
                                    ? "bg-slate-800/70 text-zinc-400 border-white/10 cursor-not-allowed"
                                    : "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white border-[#7276ff]/20 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/10 cursor-pointer"
                        }`}
                    >
                        <CheckCircle className="h-4 w-4" />
                        <span>
                            {isTopicCompleted
                                ? "Already Read"
                                : isMarkingRead
                                    ? "Marking..."
                                    : isSummaryGenerating
                                        ? "Generating summary..."
                                        : "Mark as Read"}
                        </span>
                    </button>

                    <QuickRevisionCard
                        points={cheatsheetPoints.length > 0 ? cheatsheetPoints : (data.learningAssistantResponse?.data?.revision?.points || [])}
                        onSaveNotes={handleSaveNotes}
                        onAddRevision={handleAddRevision}
                        isRevisionAdded={Boolean(data.learningAssistantResponse?.data?.revisionStatus?.is_queued)}
                        isAddingRevision={isAddingRevision}
                        revisionError={revisionError}
                    />
                    <button
                        onClick={() => {
                            const targetTopic = data?.selectedTopic || activeTopic || "";
                            const subjectQuery = activeSubject ? `&subject=${encodeURIComponent(activeSubject)}` : "";
                            const roadmapQuery = roadmapIdParam ? `&roadmap_id=${encodeURIComponent(roadmapIdParam)}` : "";
                            router.push(`/practice?topic=${encodeURIComponent(targetTopic)}&source=${activeSource}${subjectQuery}${roadmapQuery}`);
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/20 active:scale-[0.98] mt-6"
                    >
                        <span>📝 Practice Topic</span>
                    </button>
                </div>
            </div>

            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-l border-white/10 bg-[#090D1F]">
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
                                onClick={closeQuickAction}
                                className="text-white/40 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-white/5"
                            >
                                Close
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-zinc-300 custom-scrollbar">
                            {modalContent.loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-zinc-400 text-xs animate-pulse">AI is preparing a clean response, please wait...</p>
                                </div>
                            ) : modalContent.type === 'explain' ? (() => {
                                // Inline Parser for Explain
                                const text = normalizeReadableMath(modalContent.data || "");
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
                                const text = normalizeReadableMath(modalContent.data || "");
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
                                const text = normalizeReadableMath(modalContent.data || "");
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
