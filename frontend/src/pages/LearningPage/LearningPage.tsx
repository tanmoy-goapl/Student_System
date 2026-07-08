'use client';

import { Header } from "@/components/learningpage/Header";
import { LearningActions } from "@/components/learningpage/LearningActions";
import NotesCard from "@/components/learningpage/NotesCard";
import { QuickActions } from "@/components/learningpage/QuickActions";
import { QuickRevisionCard } from "@/components/learningpage/QuickRevisionCard";
import { RelatedConcepts } from "@/components/learningpage/RelatedConcepts";
import { Sidebar } from "@/components/learningpage/Sidebar/Sidebar";
import LearningSidebar from "@/components/learningpage/LearningSidebar";
import { useState, useEffect } from "react";
import {
  getLearningData,
  getLearningContent,
  streamLearningContent,
  completeTopic,
  explainSimpler,
  giveExamples,
  summarizeTopic,
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
    const topic = searchParams?.get("topic") || undefined;
    const subject = searchParams?.get("subject") || undefined;
    const source = searchParams?.get("source") || "courses";
    
    const [data, setData] = useState<LearningDataResponse | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [isMarkingRead, setIsMarkingRead] = useState(false);
    const [isCompletedSession, setIsCompletedSession] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showSummary, setShowSummary] = useState(false);

    const [modalContent, setModalContent] = useState<{
        title: string;
        type: 'explain' | 'example' | 'summarize';
        data: any;
        loading?: boolean;
    } | null>(null);

    const [cheatsheetPoints, setCheatsheetPoints] = useState<any[]>([]);

    useEffect(() => {
        setIsCompletedSession(false);
        setShowSummary(false);
    }, [topic]);

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

    useEffect(() => {
        async function fetchData() {
            try {
                const studentId = getStudentId();
                const roadmapId = searchParams?.get("roadmap_id") ? parseInt(searchParams.get("roadmap_id") as string) : undefined;
                
                const response = await getLearningData(topic, studentId, subject, roadmapId, source);
                setData(response);
                
                const selectedTopic = response.selectedTopic || topic || "General Topic";
                try {
                    await streamLearningContent(selectedTopic, studentId, subject, (text) => {
                        let displayMarkdown = text;
                        let revisionData = undefined;
                        if (text.includes("---REVISION---")) {
                            const parts = text.split("---REVISION---");
                            displayMarkdown = parts[0].trim();
                            try {
                                revisionData = JSON.parse(parts[1].trim());
                            } catch (e) {}
                        }
                        
                        setData(prev => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                notesResponse: { content: displayMarkdown },
                                learningAssistantResponse: revisionData ? {
                                    ...prev.learningAssistantResponse,
                                    data: {
                                        ...prev.learningAssistantResponse?.data,
                                        revision: revisionData
                                    }
                                } : prev.learningAssistantResponse
                            };
                        });
                    });
                } catch (streamingError) {
                    console.warn("Streaming failed, falling back:", streamingError);
                    const contentResponse = await getLearningContent(selectedTopic, studentId, subject);
                    setData(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            notesResponse: contentResponse.notesResponse,
                            learningAssistantResponse: {
                                ...prev.learningAssistantResponse,
                                data: {
                                    ...prev.learningAssistantResponse?.data,
                                    revision: contentResponse.revision
                                }
                            }
                        };
                    });
                }
            } catch (error) {
                console.error("Failed to load learning data:", error);
            }
        }
        fetchData();
    }, [topic, subject, source, refreshKey]);

    // Fetch Cheat Sheet dynamically
    useEffect(() => {
        const selectedTopic = data?.selectedTopic || topic;
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
    }, [topic, data?.selectedTopic]);

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
            data: null,
            loading: true
        });
        
        try {
            if (id === 'simpler') {
                const res = await explainSimpler(studentId, data.selectedTopic);
                if (res.success) {
                    setModalContent({
                        title: `Explain Simpler: ${data.selectedTopic}`,
                        type: 'explain',
                        data: res.data,
                        loading: false
                    });
                } else {
                    setModalContent(null);
                }
            } else if (id === 'example') {
                const res = await giveExamples(studentId, data.selectedTopic);
                if (res.success) {
                    setModalContent({
                        title: `Real-world Examples: ${data.selectedTopic}`,
                        type: 'example',
                        data: res.data,
                        loading: false
                    });
                } else {
                    setModalContent(null);
                }
            } else if (id === 'summary') {
                const res = await summarizeTopic(studentId, data.selectedTopic);
                if (res.success) {
                    setModalContent({
                        title: `Summary & Key Points: ${data.selectedTopic}`,
                        type: 'summarize',
                        data: res.data,
                        loading: false
                    });
                } else {
                    setModalContent(null);
                }
            }
        } catch (err) {
            console.error("Failed to execute quick action:", err);
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
            const subjQuery = subject ? `&subject=${encodeURIComponent(subject)}` : "";
            router.push(`/learning?topic=${encodeURIComponent(concept.topic)}${subjQuery}&source=${source}`);
        }
    };

    const handleLearningActionClick = async (id: string) => {
        if (!data?.selectedTopic) return;
        
        if (id === "practice_topic") {
            window.location.href = `/practice?topic=${encodeURIComponent(data.selectedTopic)}&source=${source}`;
        } else if (id === "take_quiz") {
            window.location.href = `/practice?topic=${encodeURIComponent(data.selectedTopic)}&mode=exam&source=${source}`;
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
 
    if (!data) {
        return (
            <div className="flex w-full h-[calc(100vh-4rem)] items-center justify-center bg-slate-950">
                <div className="text-white">Loading...</div>
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
        <div className="flex w-full h-[calc(100vh-4rem)]">
            <div className="w-[20vw] shrink-0 h-full overflow-y-auto purple-scrollbar border-r border-white/10">
                <LearningSidebar />
            </div>

            <div id="learning-content-container" className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto purple-scrollbar">
                <div className="flex-1 space-y-4 px-6 py-4 w-full">
                    <Header data={data.headerResponse?.data} />
                    <div id="notes-section">
                        <NotesCard notesResponse={data.notesResponse} showSummary={showSummary} setShowSummary={setShowSummary} />
                    </div>
                    
                    <QuickActions
                        actions={quickActions}
                        onActionClick={handleQuickActionClick}
                    />
                    
                    <RelatedConcepts
                        concepts={data.learningAssistantResponse?.data?.relatedConcepts || []}
                        onConceptClick={handleConceptClick}
                    />
                    
                    <QuickRevisionCard
                        title="Interview Cheat Sheet"
                        points={cheatsheetPoints.length > 0 ? cheatsheetPoints : (data.learningAssistantResponse?.data?.revision?.points || [])}
                        onSaveNotes={handleSaveNotes}
                        onAddRevision={handleAddRevision}
                    />
                    
                    <LearningActions 
                        actions={learningActions} 
                        onActionClick={handleLearningActionClick}
                    />
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
                            {modalContent.loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-zinc-400 text-xs animate-pulse">AI is generating content, please wait...</p>
                                </div>
                            ) : (
                                <>
                                    {modalContent.type === 'explain' && (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Concept</h4>
                                                <p className="leading-relaxed bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">{modalContent.data.simplified_explanation}</p>
                                            </div>
                                            {modalContent.data.examples && modalContent.data.examples.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Analogy / Example</h4>
                                                    <ul className="space-y-2">
                                                        {modalContent.data.examples.map((ex: string, i: number) => (
                                                            <li key={i} className="flex gap-2 items-start bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl">
                                                                <span className="text-indigo-400 font-bold"># {i + 1}</span>
                                                                <span>{ex}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {modalContent.data.key_idea && (
                                                <div className="border-t border-white/5 pt-4">
                                                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Key Idea</h4>
                                                    <p className="font-medium text-white italic">"{modalContent.data.key_idea}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {modalContent.type === 'example' && (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Scenarios</h4>
                                                <div className="grid gap-3">
                                                    {modalContent.data.examples?.map((ex: any, i: number) => (
                                                        <div key={i} className="bg-cyan-500/5 border border-cyan-500/10 p-3.5 rounded-xl">
                                                            <div className="text-xs font-bold text-cyan-400 mb-1">{ex.title}</div>
                                                            <p className="text-xs leading-relaxed text-zinc-300">{ex.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {modalContent.data.practical_applications && (
                                                <div className="border-t border-white/5 pt-4">
                                                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Practical Applications</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {modalContent.data.practical_applications.map((app: string, i: number) => (
                                                            <span key={i} className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-white/80">{app}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {modalContent.type === 'summarize' && (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Key Revision Points</h4>
                                                <ul className="space-y-2">
                                                    {modalContent.data.summary_points?.map((pt: string, i: number) => (
                                                        <li key={i} className="flex gap-2.5 items-start bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl">
                                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                                            <span className="text-xs leading-relaxed">{pt}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            {modalContent.data.important_concepts && (
                                                <div className="border-t border-white/5 pt-4">
                                                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Key Concepts to Remember</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {modalContent.data.important_concepts.map((concept: string, i: number) => (
                                                            <span key={i} className="text-xs bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-purple-300 font-medium">{concept}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
