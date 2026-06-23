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
import { getLearningData, getLearningContent, completeTopic, LearningDataResponse } from "@/lib/api";
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
    const [refreshKey, setRefreshKey] = useState(0);
 
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
                
                // Pass source argument to strictly filter out roadmaps when on courses tab
                const response = await getLearningData(topic, studentId, subject, roadmapId, source);
                setData(response);
                
                const contentResponse = await getLearningContent(response.selectedTopic || topic, studentId, subject);
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
            } catch (error) {
                console.error("Failed to load learning data:", error);
            }
        }
        fetchData();
    }, [topic, subject, source, refreshKey]);

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
        
        setIsMarkingRead(true);
        try {
            const studentId = getStudentId();
            const res = await completeTopic(studentId, data.selectedTopic, "learning");
            if (res.success) {
                console.log("Topic marked as complete");
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Failed to mark topic as complete:", error);
        } finally {
            setIsMarkingRead(false);
        }
    };
 
    if (!data) {
        return (
            <div className="flex w-full h-[calc(100vh-4rem)] items-center justify-center bg-slate-950">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    const quickActions = [
        ...(data.learningAssistantResponse?.data?.actions?.map((action: any) => ({
            ...action,
            icon: ICON_MAP[action.iconName] || FileText
        })) || []),
        {
            id: "mark_as_read",
            icon: CheckCircle,
            label: isMarkingRead ? "Marking..." : "Mark as Read",
            onClick: handleMarkAsRead,
            primary: true,
            variant: "primary"
        }
    ];

    const learningActions = data.learningAssistantResponse?.data?.learningActions?.map((action: any) => ({
        ...action,
        icon: ICON_MAP[action.iconName] || FileText,
        onClick: action.id === "practice_topic" ? () => {
            if (data?.selectedTopic) {
                window.location.href = `/practice?topic=${encodeURIComponent(data.selectedTopic)}`;
            }
        } : undefined
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

            <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto purple-scrollbar">
                <div className="flex-1 space-y-4 px-6 py-4 w-full">
                    <Header data={data.headerResponse?.data} />
                    <NotesCard notesResponse={data.notesResponse} />
                    <QuickActions
                        actions={quickActions}
                    />
                    <RelatedConcepts
                        concepts={data.learningAssistantResponse?.data?.relatedConcepts || []}
                    />
                    <QuickRevisionCard
                        title={data.learningAssistantResponse?.data?.revision?.title || ""}
                        points={data.learningAssistantResponse?.data?.revision?.points || []}
                    />
                    <LearningActions 
                        actions={learningActions} 
                        onActionClick={(id) => {
                            if (id === "practice_topic" && data?.selectedTopic) {
                                window.location.href = `/practice?topic=${encodeURIComponent(data.selectedTopic)}&source=${source}`;
                            }
                        }}
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
        </div>
    );
}
