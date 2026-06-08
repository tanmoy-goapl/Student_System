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
                    title="AI BEHAVIORAL INSIGHTS"
                    Icon={sectionIcons.insights}
                    className="text-slate-400 text-xs font-bold tracking-wider uppercase"
                    iconClassName="text-violet-500"
                />

                {insights.map((item) => (
                    <InsightCard
                        key={item.id}
                        text={item.text}
                        color={item.color as any}
                        Icon={item.icon as any}
                    />
                ))}
            </div>

            {/* Weak Areas */}
            <div className="space-y-3">
                <SectionTitle
                    title="WEAK AREAS"
                    Icon={sectionIcons.weakness}
                    className="text-slate-400 text-xs font-bold tracking-wider uppercase"
                    iconClassName="text-rose-500"
                    rightContent={<span className="text-[11px] text-rose-500 font-medium lowercase">4 topics</span>}
                />

                <div className="space-y-3">
                    {weakTopics.map((topic) => (
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