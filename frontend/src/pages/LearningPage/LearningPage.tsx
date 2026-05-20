'use client';

import { Header } from "@/components/learningpage/Header";
import { LearningActions } from "@/components/learningpage/LearningActions";
import NotesCard from "@/components/learningpage/NotesCard";
import { QuickActions } from "@/components/learningpage/QuickActions";
import { QuickRevisionCard } from "@/components/learningpage/QuickRevisionCard";
import { RelatedConcepts } from "@/components/learningpage/RelatedConcepts";
import { Sidebar } from "@/components/learningpage/Sidebar/Sidebar";
import { HEADER_RESPONSE, LEARNING_ASSISTANT_RESPONSE, RIGHT_SIDEBAR_DATA } from "@/constants/learningpage-data";
import { useState } from "react";

export default function LearningPage() {
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
 
    const handleSuggestionClick = (id: string) => {
        setSelectedSuggestion(id);
        // Handle suggestion action
        console.log("Suggestion clicked:", id);
    };
 
    const handleDocumentClick = (id: string) => {
        setSelectedDocument(id);
        // Handle document open
        console.log("Document clicked:", id);
    };
 

    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4 space-y-4">
            <div className="flex-1 space-y-4">
                <Header data={HEADER_RESPONSE.data} />
                <NotesCard />
                <QuickActions
                    actions={LEARNING_ASSISTANT_RESPONSE.data.actions}
                />
                <RelatedConcepts
                    concepts={LEARNING_ASSISTANT_RESPONSE.data.relatedConcepts}
                />
                <QuickRevisionCard
                    title={LEARNING_ASSISTANT_RESPONSE.data.revision.title}
                    points={LEARNING_ASSISTANT_RESPONSE.data.revision.points}
                />

                <LearningActions actions={LEARNING_ASSISTANT_RESPONSE.data.learningActions} />
            </div>

            <div className="w-[20vw]">
                <Sidebar 
                    data={RIGHT_SIDEBAR_DATA.data}
                    onSuggestionClick={handleSuggestionClick}
                    onDocumentClick={handleDocumentClick}
                />
            </div>
        </div>
    )
}