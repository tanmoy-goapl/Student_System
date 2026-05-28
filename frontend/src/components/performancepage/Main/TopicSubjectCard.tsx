import {
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

interface TopicSubjectCardProps {
    subject: any;
    expanded: boolean;
    onToggle: () => void;
}

export default function TopicSubjectCard({
    subject,
    expanded,
    onToggle,
}: TopicSubjectCardProps) {
    const Icon = subject.icon;

    return (
        <div className="rounded-xl border border-slate-700/60 bg-gradient-to-r from-slate-900/80 to-slate-800/30 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-4 py-4 flex items-center gap-4"
            >
                <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject.progressColor} flex items-center justify-center`}
                >
                    <Icon
                        size={15}
                        className="text-white"
                    />
                </div>

                <div className="min-w-[140px] text-left">
                    <h3 className="text-white font-semibold text-sm">
                        {subject.subject}
                    </h3>
                </div>

                <div className="flex-1">
                    <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${subject.progressColor}`}
                            style={{
                                width: `${subject.progress}%`,
                            }}
                        />
                    </div>
                </div>

                <span className="text-slate-200 font-semibold text-sm w-14 text-right">
                    {subject.progress}%
                </span>

                {expanded ? (
                    <ChevronDown
                        size={18}
                        className="text-slate-500"
                    />
                ) : (
                    <ChevronRight
                        size={18}
                        className="text-slate-500"
                    />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-2">
                    {subject.topics.map(
                        (topic: any, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 px-3 py-3 rounded-xl bg-black/20 border border-slate-800/60"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        topic.status ===
                                        'strong'
                                            ? 'bg-emerald-500'
                                            : 'bg-red-500'
                                    }`}
                                />

                                <p className="text-sm text-slate-300 min-w-[160px]">
                                    {topic.name}
                                </p>

                                <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            topic.status ===
                                            'strong'
                                                ? 'bg-emerald-500'
                                                : 'bg-red-500'
                                        }`}
                                        style={{
                                            width: `${topic.progress}%`,
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-2 min-w-[88px] justify-end">
                                    <span
                                        className={`text-xs font-semibold ${
                                            topic.status ===
                                            'strong'
                                                ? 'text-emerald-400'
                                                : 'text-red-400'
                                        }`}
                                    >
                                        {topic.progress}%
                                    </span>

                                    {topic.status ===
                                        'weak' && (
                                        <span className="text-[0.65rem] px-2 py-1 rounded-md bg-red-500/15 border border-red-500/20 text-red-300 font-semibold">
                                            WEAK
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}