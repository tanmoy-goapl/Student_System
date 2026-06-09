'use client';

import AIHelpSection from '@/components/practicepage/Main/AIHelpSection';
import AccuracyTrend from '../../components/performancepage/Main/AccuracyTrend';
import StatsGrid from '../../components/performancepage/Main/StatsGrid';
import TopicMastery from '../../components/performancepage/Main/TopicMastery';
import { useEffect, useState } from 'react';
import ActivityHeatmap from '@/components/performancepage/Main/ActivityHeatmap';
import SpeedVsAccuracy from '@/components/performancepage/Main/SpeedVsAccuracy';
import PracticeStats from '@/components/performancepage/Main/PracticeStats';
import PerformanceSidebar from '@/components/performancepage/Sidebar/PerformanceSidebar';
import { getPerformanceMain, PerformanceMainResponse } from '@/lib/api';

export default function PerformancePage() {
    const [aiQuery, setAiQuery] = useState("");
    const [mainData, setMainData] = useState<PerformanceMainResponse | null>(null);

    useEffect(() => {
        async function fetchMainData() {
            try {
                const data = await getPerformanceMain();
                setMainData(data);
            } catch (error) {
                console.error("Failed to load performance main data:", error);
            }
        }
        fetchMainData();
    }, []);

    const handleAIHelp = (query: string) => {
        console.log(query)
        setAiQuery("");
    };

    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4">
            <div className="flex-1 space-y-4">
                {mainData ? (
                    <>
                        <StatsGrid stats={mainData.stats} />
                        <AccuracyTrend trendData={mainData.trend} />
                        <TopicMastery masteryData={mainData.mastery} />
                    </>
                ) : (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-24 bg-slate-800 rounded-xl"></div>
                        <div className="h-48 bg-slate-800 rounded-xl"></div>
                        <div className="h-64 bg-slate-800 rounded-xl"></div>
                    </div>
                )}

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