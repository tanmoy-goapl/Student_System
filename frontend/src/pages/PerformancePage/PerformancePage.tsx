'use client';

import AIHelpSection from '@/components/practicepage/Main/AIHelpSection';
import AccuracyTrend from '../../components/performancepage/Main/AccuracyTrend';
import StatsGrid from '../../components/performancepage/Main/StatsGrid';
import TopicMastery from '../../components/performancepage/Main/TopicMastery';
import { useCallback, useEffect, useState } from 'react';
import ActivityHeatmap from '@/components/performancepage/Main/ActivityHeatmap';
import SpeedVsAccuracy from '@/components/performancepage/Main/SpeedVsAccuracy';
import PracticeStats from '@/components/performancepage/Main/PracticeStats';
import PerformanceSidebar from '@/components/performancepage/Sidebar/PerformanceSidebar';
import { getPerformanceMain, PerformanceMainResponse } from '@/lib/api';

export default function PerformancePage() {
    const [aiQuery, setAiQuery] = useState("");
    const [mainData, setMainData] = useState<PerformanceMainResponse | null>(null);

    const getStudentId = (): number | null => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("user_id");
            return id ? parseInt(id, 10) : null;
        }
        return null;
    };
    const studentId = getStudentId();

    const fetchMainData = useCallback(async (showLoading = false) => {
        if (!studentId) {
            if (showLoading) setMainData(null);
            return;
        }
        if (showLoading) setMainData(null);
        try {
            const data = await getPerformanceMain(studentId);
            setMainData(data);
        } catch (error) {
            console.error("Failed to load performance main data:", error);
        }
    }, [studentId]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => {
            void fetchMainData(true);
        }, 0);
        const refresh = () => {
            if (document.visibilityState === "visible") void fetchMainData(false);
        };
        window.addEventListener("focus", refresh);
        window.addEventListener("mentorai:analytics-updated", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearTimeout(initialLoad);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("mentorai:analytics-updated", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [fetchMainData]);

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
                <PerformanceSidebar studentId={studentId ?? undefined}/>
            </div>
        </div>
    );
}