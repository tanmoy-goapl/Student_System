'use client';

import AIHelpSection from '@/components/practicepage/Main/AIHelpSection';
import AccuracyTrend from '../../components/performancepage/Main/AccuracyTrend';
import StatsGrid from '../../components/performancepage/Main/StatsGrid';
import TopicMastery from '../../components/performancepage/Main/TopicMastery';
import { useState } from 'react';
import ActivityHeatmap from '@/components/performancepage/Main/ActivityHeatmap';
import SpeedVsAccuracy from '@/components/performancepage/Main/SpeedVsAccuracy';
import PracticeStats from '@/components/performancepage/Main/PracticeStats';
import PerformanceSidebar from '@/components/performancepage/Sidebar/PerformanceSidebar';

export default function PerformancePage() {
    const [aiQuery, setAiQuery] = useState("");

    const handleAIHelp = (query: string) => {
        console.log(query)
        setAiQuery("");
    };

    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4">
            <div className="flex-1 space-y-4">
                <StatsGrid />
                <AccuracyTrend />

                <TopicMastery />

                <div className="grid grid-cols-2 gap-4">
                    <SpeedVsAccuracy />
                    <PracticeStats />
                </div>
                <ActivityHeatmap />


                <AIHelpSection
                    query={aiQuery}
                    onQueryChange={setAiQuery}
                    onSubmitQuery={handleAIHelp}
                />
            </div>

            <div className="w-[20vw]">
                <PerformanceSidebar/>
            </div>
        </div>
    );
}