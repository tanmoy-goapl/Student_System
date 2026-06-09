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

export default function PerformanceSidebar() {
    const [data, setData] = useState<PerformanceSidebarResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getPerformanceSidebar();
                setData(response);
            } catch (error) {
                console.error("Failed to load performance sidebar data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return <div className="space-y-6 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
        </div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Insights */}
            <div className="space-y-3">
                <SectionTitle
                    title="AI BEHAVIORAL INSIGHTS"
                    Icon={sectionIcons.insights}
                    className="text-slate-400 text-xs font-bold tracking-wider uppercase"
                    iconClassName="text-violet-500"
                />

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

            {/* Weak Areas */}
            <div className="space-y-3">
                <SectionTitle
                    title="WEAK AREAS"
                    Icon={sectionIcons.weakness}
                    className="text-slate-400 text-xs font-bold tracking-wider uppercase"
                    iconClassName="text-rose-500"
                    rightContent={<span className="text-[11px] text-rose-500 font-medium lowercase">{data.weakTopics.length} topics</span>}
                />

                <div className="space-y-3">
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
            <div className="space-y-3">
                <SectionTitle
                    title="AI PREDICTIONS"
                    Icon={sectionIcons.stats}
                    className="text-slate-400 text-xs font-bold tracking-wider uppercase"
                    iconClassName="text-amber-500"
                />

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

            {/* Actions */}
            <div className="space-y-3">
                <SectionTitle
                    title="Smart Actions"
                    Icon={sectionIcons.actions}
                />

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

            {/* Readiness */}
            <ReadinessCard readiness={data.readiness} />
        </div>
    );
}