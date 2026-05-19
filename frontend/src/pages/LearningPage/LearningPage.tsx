'use client';

import { Header } from "@/components/learningpage/Header";
import LearningSidebar from "@/components/learningpage/LearningSidebar";
import NotesCard from "@/components/learningpage/NotesCard";
import { HEADER_RESPONSE } from "@/constants/learningpage-data";

export default function LearningPage() {
    return (
        <div className="flex min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4 space-y-4">
            <div className="flex-1 space-y-4">
                <Header data={HEADER_RESPONSE.data} />
                <NotesCard />
            </div>

            <div className="w-[15vw]">
                hello
            </div>
        </div>
    )
}