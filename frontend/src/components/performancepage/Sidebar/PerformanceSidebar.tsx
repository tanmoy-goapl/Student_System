import InsightCard from './InsightCard';
import WeaknessBar from './WeaknessBar';
import StatCard from './StatCard';
import ActionCard from './ActionCard';
import ReadinessCard from './ReadinessCard';
import SectionTitle from './SectionTitle';

import {
    actionCards,
    insights,
    readiness,
    sectionIcons,
    statCards,
    weakTopics,
} from '../../../constants/performance-sidebar-data';

export default function PerformanceSidebar() {
    return (
        <div className="space-y-6">
            {/* Insights */}
            <div className="space-y-3">
                <SectionTitle
                    title="AI Insights"
                    Icon={sectionIcons.insights}
                />

                {insights.map((item) => (
                    <InsightCard
                        key={item.id}
                        text={item.text}
                        color={item.color as any}
                    />
                ))}
            </div>

            {/* Weak Areas */}
            <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-800/60 p-4">
                <SectionTitle
                    title="Weak Areas"
                    Icon={sectionIcons.weakness}
                />

                {weakTopics.map((topic) => (
                    <WeaknessBar
                        key={topic.name}
                        name={topic.name}
                        percentage={topic.percentage}
                        color={topic.color}
                    />
                ))}
            </div>

            {/* Stats */}
            <div className="space-y-3">
                <SectionTitle
                    title="Performance Snapshot"
                    Icon={sectionIcons.stats}
                />

                {statCards.map((card) => (
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

                {actionCards.map((card) => (
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
            <ReadinessCard readiness={readiness} />
        </div>
    );
}