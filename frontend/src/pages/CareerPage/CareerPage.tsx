'use client';

import CareerKPICards from "@/components/careerpage/Main/CareerKPICards";
import CareerAIActions from "@/components/careerpage/Main/CareerAIActions";
import JobMatching from "@/components/careerpage/Main/JobMatching";
import ResumeBuilder from "@/components/careerpage/Main/ResumeBuilder";
import SkillRoadmap from "@/components/careerpage/Main/SkillRoadmap";
import MockInterviewSession from "@/components/careerpage/Main/MockInterviewSession";
import { CheckCircle2, Zap, Cpu, Mic } from "lucide-react";
import CareerIntelligenceSidebar from "@/components/careerpage/Right/CareerIntelligenceSidebar";
import AIHelpSection from '@/components/practicepage/Main/AIHelpSection';
import { useState, useEffect } from "react";
import { getCareerData, CareerDataResponse } from "@/lib/api";

export default function CareerPage() {
    const [aiQuery, setAiQuery] = useState("");
    const [data, setData] = useState<CareerDataResponse | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getCareerData();
                setData(response);
            } catch (error) {
                console.error("Failed to load career data:", error);
            }
        }
        fetchData();
    }, []);

    const handleAIHelp = (query: string) => {
        console.log(query)
        setAiQuery("");
    };

    return (
        <div className="flex gap-6 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4">
            <div className="flex-1 space-y-6">
                {data ? (
                    <>
                        <CareerKPICards careerKpi={data.careerKpi} />
                        <CareerAIActions actions={data.aiActions} />
                        <JobMatching jobs={data.mockJobs} />
                        <MockInterviewSession
                            questions={data.mockInterviewQuestions}
                            onStartInterview={() => console.log("Start full interview")}
                            onStartQuestion={(questionId) => console.log(`Start question ${questionId}`)}
                        />
                        <ResumeBuilder
                            fileName="Gaurav_Resume_2025.pdf"
                            score={74}
                            uploadedAt="2 days ago"
                            onReplace={() => console.log("Replace resume")}
                            onImprove={() => console.log("Improve resume")}
                            suggestions={data.mockSuggestions}
                        />
                        <SkillRoadmap
                            title="SDE-II Placement Path"
                            duration="11 weeks"
                            phaseCount={4}
                            skillCount={24}
                            currentPhase={2}
                            phases={data.mockPhases}
                        />
                        <AIHelpSection
                            query={aiQuery}
                            onQueryChange={setAiQuery}
                            onSubmitQuery={handleAIHelp}
                        />
                    </>
                ) : (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-24 bg-slate-800 rounded-xl"></div>
                        <div className="h-32 bg-slate-800 rounded-xl"></div>
                        <div className="h-64 bg-slate-800 rounded-xl"></div>
                        <div className="h-64 bg-slate-800 rounded-xl"></div>
                    </div>
                )}
            </div>
            {data && <CareerIntelligenceSidebar data={data} />}
        </div>
    );
}