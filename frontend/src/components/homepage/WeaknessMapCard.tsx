import { WEAKNESS_MAP_RESPONSE } from '@/constants/homepage-data';
import { getStrengthClasses } from '@/utils/getStrengthClasses';
import { ChevronDown, ChevronRight, Layers3 } from 'lucide-react';
import { useState } from 'react';

export default function WeaknessMapCard() {
    const [expandedSubjects, setExpandedSubjects] = useState<string[]>(
        WEAKNESS_MAP_RESPONSE.subjects
            .filter((subject) => subject.expanded)
            .map((subject) => subject.id)
    );

    const toggleSubject = (subjectId: string) => {
        setExpandedSubjects((prev) =>
            prev.includes(subjectId)
                ? prev.filter((id) => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    return (
        <div className="rounded-2xl border border-violet-500/10 bg-[#090B1A] p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-violet-400" />

                    <h2 className="text-base font-semibold text-white">
                        Weakness Map
                    </h2>
                </div>

                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1 text-white/50">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        weak
                    </div>

                    <div className="flex items-center gap-1 text-white/50">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        medium
                    </div>

                    <div className="flex items-center gap-1 text-white/50">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        strong
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {WEAKNESS_MAP_RESPONSE.subjects.map((subject) => {
                    const isExpanded = expandedSubjects.includes(subject.id);

                    return (
                        <div key={subject.id} className="space-y-2">
                            {/* Subject Header */}
                            <button
                                onClick={() => toggleSubject(subject.id)}
                                className="flex w-full items-center justify-between rounded-xl border border-violet-500/20 bg-white/[0.03] px-3 py-3 transition hover:bg-white/[0.05]"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`h-2.5 w-2.5 rounded-full ${subject.color === 'cyan'
                                            ? 'bg-cyan-400'
                                            : 'bg-violet-400'
                                            }`}
                                    />

                                    <p className="text-sm font-medium text-white">
                                        {subject.subject}
                                    </p>
                                </div>

                                {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                                )}
                            </button>

                            {/* Topics */}
                            {isExpanded && (
                                <div className="space-y-2 pl-3">
                                    {subject.topics.map((topic) => {
                                        const styles = getStrengthClasses(topic.strength);

                                        return (
                                            <div
                                                key={topic.id}
                                                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${styles.card}`}
                                            >
                                                <p className="text-sm text-white/80">
                                                    {topic.name}
                                                </p>

                                                <div
                                                    className={`rounded-md px-2 py-1 text-[10px] font-medium capitalize ${styles.badge}`}
                                                >
                                                    {topic.strength}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}