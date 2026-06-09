'use client';

import { Header } from "@/components/learningpage/Header";
import { LearningActions } from "@/components/learningpage/LearningActions";
import NotesCard from "@/components/learningpage/NotesCard";
import { QuickActions } from "@/components/learningpage/QuickActions";
import { QuickRevisionCard } from "@/components/learningpage/QuickRevisionCard";
import { RelatedConcepts } from "@/components/learningpage/RelatedConcepts";
import { Sidebar } from "@/components/learningpage/Sidebar/Sidebar";
import { useState, useEffect } from "react";
import { getLearningData, LearningDataResponse } from "@/lib/api";
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

export default function LearningPage() {
    const [data, setData] = useState<LearningDataResponse | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
 
    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getLearningData();
                setData(response);
            } catch (error) {
                console.error("Failed to load learning data:", error);
            }
        }
        fetchData();
    }, []);

    const handleSuggestionClick = (id: string) => {
        setSelectedSuggestion(id);
        console.log("Suggestion clicked:", id);
    };
 
    const handleDocumentClick = (id: string) => {
        setSelectedDocument(id);
        console.log("Document clicked:", id);
    };
 
    if (!data) {
        return (
            <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4 space-y-4 animate-pulse">
                <div className="flex-1 space-y-4">
                    <div className="h-24 bg-white/5 rounded-xl"></div>
                    <div className="h-64 bg-white/5 rounded-xl"></div>
                </div>
                <div className="w-[20vw] bg-white/5 rounded-xl"></div>
            </div>
        );
    }

    // Map the string iconNames to actual Lucide components for the children
    const quickActions = data.learningAssistantResponse.data.actions.map((a: any) => ({
        ...a,
        icon: ICON_MAP[a.iconName] || FileText
    }));

    const learningActions = data.learningAssistantResponse.data.learningActions.map((a: any) => ({
        ...a,
        icon: ICON_MAP[a.iconName] || FileText
    }));

    const rightSidebarData = {
        ...data.rightSidebarData.data,
        aiSuggestions: {
            ...data.rightSidebarData.data.aiSuggestions,
            suggestions: data.rightSidebarData.data.aiSuggestions.suggestions.map((s: any) => ({
                ...s,
                icon: ICON_MAP[s.iconName] || FileText
            }))
        },
        relatedDocuments: {
            ...data.rightSidebarData.data.relatedDocuments,
            documents: data.rightSidebarData.data.relatedDocuments.documents.map((d: any) => ({
                ...d,
                icon: ICON_MAP[d.iconName] || FileText
            }))
        }
    };

    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4 space-y-4">
            <div className="flex-1 space-y-4">
                <Header data={data.headerResponse.data} />
                <NotesCard notesResponse={data.notesResponse} />
                <QuickActions
                    actions={quickActions}
                />
                <RelatedConcepts
                    concepts={data.learningAssistantResponse.data.relatedConcepts}
                />
                <QuickRevisionCard
                    title={data.learningAssistantResponse.data.revision.title}
                    points={data.learningAssistantResponse.data.revision.points}
                />

                <LearningActions actions={learningActions} />
            </div>

            <div className="w-[20vw]">
                <Sidebar 
                    data={rightSidebarData}
                    onSuggestionClick={handleSuggestionClick}
                    onDocumentClick={handleDocumentClick}
                />
            </div>
        </div>
    )
}