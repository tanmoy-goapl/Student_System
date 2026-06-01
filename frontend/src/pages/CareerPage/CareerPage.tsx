'use client';

import CareerKPICards from "@/components/careerpage/Main/CareerKPICards";
import AIActions from "@/components/homepage/AIActions";
import JobMatching, { type JobMatchingJob } from "@/components/careerpage/Main/JobMatching";
import ResumeBuilder, { type ResumeSuggestion } from "@/components/careerpage/Main/ResumeBuilder";
import SkillRoadmap, { type Phase } from "@/components/careerpage/Main/SkillRoadmap";
import MockInterviewSession, { type InterviewQuestion } from "@/components/careerpage/Main/MockInterviewSession";
import { AI_ACTIONS, MOCK_INTERVIEW_QUESTIONS, MOCK_JOBS, MOCK_PHASES, MOCK_SUGGESTIONS } from "@/constants/careerpage-data";
import { CheckCircle2, Zap, Cpu, Mic } from "lucide-react";
import CareerIntelligenceSidebar from "@/components/careerpage/Right/CareerIntelligenceSidebar";
import AIHelpSection from '@/components/practicepage/Main/AIHelpSection';
import { useState } from "react";

export default function CareerPage() {
    const [aiQuery, setAiQuery] = useState("");

    const handleAIHelp = (query: string) => {
        console.log(query)
        setAiQuery("");
    };


    return (
        <div className="flex gap-6 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4">
            <div className="flex-1 space-y-6">
                <CareerKPICards />
                <AIActions data={AI_ACTIONS} />
                <JobMatching jobs={MOCK_JOBS} />
                <MockInterviewSession
                    questions={MOCK_INTERVIEW_QUESTIONS}
                    onStartInterview={() => console.log("Start full interview")}
                    onStartQuestion={(questionId) => console.log(`Start question ${questionId}`)}
                />
                <ResumeBuilder
                    fileName="Gaurav_Resume_2025.pdf"
                    score={74}
                    uploadedAt="2 days ago"
                    onReplace={() => console.log("Replace resume")}
                    onImprove={() => console.log("Improve resume")}
                    suggestions={MOCK_SUGGESTIONS}
                />
                <SkillRoadmap
                    title="SDE-II Placement Path"
                    duration="11 weeks"
                    phaseCount={4}
                    skillCount={24}
                    currentPhase={2}
                    phases={MOCK_PHASES}
                />

                <AIHelpSection
                    query={aiQuery}
                    onQueryChange={setAiQuery}
                    onSubmitQuery={handleAIHelp}
                />

            </div>

            <CareerIntelligenceSidebar />
        </div>
    );
}