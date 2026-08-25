'use client';

import { useEffect, useState } from 'react';
import { Timer, Activity, Network, Brain, AlertTriangle, Sparkles, Star, ShieldCheck, LucideIcon } from 'lucide-react';
import InsightCard from './InsightCard';
import WeaknessBar from './WeaknessBar';
import StatCard from './StatCard';
import ActionCard from './ActionCard';
import ReadinessCard from './ReadinessCard';
import SectionTitle from './SectionTitle';
import { getPerformanceSidebar, PerformanceSidebarResponse } from '../../../lib/api';

// Fallback static icons for sections
const sectionIcons = {
    insights: Brain,
    weakness: AlertTriangle,
    stats: Star,
    actions: Sparkles,
    readiness: ShieldCheck,
};

// Map string names to actual Lucide components
const iconMap: Record<string, LucideIcon> = {
    Timer,
    Activity,
    Network,
    Brain,
    AlertTriangle,
    Sparkles,
    Star,
    ShieldCheck
};

interface PerformanceSidebarProps {
    studentId?: string | number;
}

export default function PerformanceSidebar({ studentId }: PerformanceSidebarProps) {
    const [data, setData] = useState<PerformanceSidebarResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!studentId) {
                setLoading(false);
                return;
            }
            try {
                const response = await getPerformanceSidebar(studentId);
                setData(response);
            } catch (error) {
                console.error("Failed to load performance sidebar data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [studentId]);

    if (loading) {
        return <div className="space-y-6 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
        </div>;
    }

    if (!data) return null;

    return (
        <div className="w-[20vw] h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col border-l border-white/10 overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Insights */}
                <div className="px-4 py-4 border-b border-white/10 space-y-2.5">
                    <SectionTitle
                        title="AI BEHAVIORAL INSIGHTS"
                        Icon={sectionIcons.insights}
                        className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3"
                        iconClassName="text-violet-400"
                    />

                    <div className="space-y-2">
                        {data.insights.map((item) => {
                            const IconComponent = iconMap[item.iconName] || Activity;
                            return (
                                <InsightCard
                                    key={item.id}
                                    text={item.text}
                                    color={item.color as any}
                                    Icon={IconComponent}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Weak Areas */}
                <div className="px-4 py-4 border-b border-white/10 space-y-2.5">
                    <SectionTitle
                        title="WEAK AREAS"
                        Icon={sectionIcons.weakness}
                        className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3"
                        iconClassName="text-rose-400"
                        rightContent={<span className="text-[10px] text-red-400 font-medium">{data.weakTopics.length} topics</span>}
                    />

                    <div className="space-y-2.5">
                        {data.weakTopics.map((topic) => (
                            <WeaknessBar
                                key={topic.name}
                                name={topic.name}
                                percentage={topic.percentage}
                                subject={topic.subject}
                                questionsCount={topic.questionsCount}
                            />
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="px-4 py-4 border-b border-white/10 space-y-2.5">
                    <SectionTitle
                        title="AI PREDICTIONS"
                        Icon={sectionIcons.stats}
                        className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3"
                        iconClassName="text-amber-400"
                    />

                    <div className="grid grid-cols-1 gap-2.5">
                        {data.statCards.map((card) => (
                            <StatCard
                                key={card.title}
                                title={card.title}
                                value={card.value}
                                subtitle={card.subtitle}
                                color={card.color as any}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-4 border-b border-white/10 space-y-2.5">
                    <SectionTitle
                        title="Smart Actions"
                        Icon={sectionIcons.actions}
                        className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3"
                        iconClassName="text-sky-400"
                    />

                    <div className="space-y-2.5">
                        {data.actionCards.map((card) => (
                            <ActionCard
                                key={card.title}
                                title={card.title}
                                subtitle={card.subtitle}
                                tag={card.tag}
                                color={card.color as any}
                            />
                        ))}
                    </div>
                </div>

                {/* Readiness */}
                <div className="px-4 py-4 space-y-2.5">
                    <ReadinessCard readiness={data.readiness} />
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.3);
                    border-radius: 3px;
                    transition: background 0.2s;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 92, 246, 0.5);
                }
            `}</style>
        </div>
    );
}