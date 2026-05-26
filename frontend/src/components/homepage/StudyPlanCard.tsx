
import {
    CalendarDays,
    Clock3,
    Check,
} from 'lucide-react';

import { TODAY_STUDY_PLAN_RESPONSE } from '../../constants/homepage-data';

function getTagClasses(color: string) {
    switch (color) {
        case 'emerald':
            return 'bg-emerald-500/15 text-emerald-400';

        default:
            return 'bg-violet-500/15 text-violet-300';
    }
}

export default function StudyPlanCard() {
    return (
        <div className="rounded-2xl border border-violet-500/10 bg-[#090B1A] p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-violet-400" />

                    <h2 className="text-base font-semibold text-white">
                        Today's Study Plan
                    </h2>
                </div>

                <p className="text-xs text-white/45">
                    {TODAY_STUDY_PLAN_RESPONSE.totalSessions} sessions
                </p>
            </div>

            <div className="flex-1 overflow-y-auto purple-scrollbar pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="space-y-2.5">
                    {TODAY_STUDY_PLAN_RESPONSE.sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`flex items-center justify-between rounded-xl border p-3 ${session.completed
                                ? 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent'
                                : 'border-white/5 bg-white/[0.03]'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${session.completed
                                        ? 'bg-emerald-500/15'
                                        : 'bg-violet-500/10'
                                        }`}
                                >
                                    {session.completed ? (
                                        <Check className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                        <Clock3 className="h-3.5 w-3.5 text-violet-300" />
                                    )}
                                </div>

                                <div>
                                    <p
                                        className={`text-sm font-medium ${session.completed
                                            ? 'text-white/40 line-through'
                                            : 'text-white'
                                            }`}
                                    >
                                        {session.title}
                                    </p>

                                    <p className="mt-0.5 text-xs text-white/35">
                                        {session.time} · {session.duration}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${getTagClasses(
                                    session.tagColor
                                )}`}
                            >
                                {session.tag}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 py-3 text-sm font-medium text-white transition hover:opacity-90">
                Start Session
            </button>
        </div>
    );
}