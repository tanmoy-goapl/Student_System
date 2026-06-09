import { useState } from 'react';
import TopicSubjectCard from './TopicSubjectCard';
import { PerformanceMainResponse } from '@/lib/api';
import { Atom, BookOpen, Activity } from 'lucide-react';

const iconMap: Record<string, any> = {
    Atom,
    BookOpen,
    Activity
};

export default function TopicMastery({ masteryData }: { masteryData: PerformanceMainResponse["mastery"] }) {
    const [expandedSubjects, setExpandedSubjects] =
        useState<string[]>(['physics']);

    const toggleExpand = (id: string) => {
        setExpandedSubjects((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h2 className="text-white text-sm font-semibold">
                        Topic Mastery
                    </h2>

                    <p className="text-slate-500 text-xs mt-1">
                        Click to expand subject
                    </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Strong
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Weak
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {masteryData.map((subject) => (
                    <TopicSubjectCard
                        key={subject.id}
                        subject={{
                            ...subject,
                            icon: iconMap[subject.iconName] || Atom
                        }}
                        expanded={expandedSubjects.includes(subject.id)}
                        onToggle={() => toggleExpand(subject.id)}
                    />
                ))}
            </div>
        </div>
    );
}