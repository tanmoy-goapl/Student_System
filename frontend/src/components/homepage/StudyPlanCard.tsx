import { Play, Check, Clock3, CalendarDays, ArrowRight } from 'lucide-react';
import { HomepageDataResponse } from '@/lib/api';
import Link from 'next/link';

export default function StudyPlanCard({ studyPlan }: { studyPlan: HomepageDataResponse["studyPlan"] }) {
    const sessions = studyPlan?.sessions ?? [];

    return (
        <div id="study-plan" className="rounded-2xl border border-violet-500/10 bg-[#090B1A] p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-violet-400" />
                    <h2 className="text-base font-semibold text-white">
                        Today's Study Plan
                    </h2>
                </div>

                <p className="text-xs text-white/45">
                    {studyPlan?.totalSessions ?? sessions.length} learning sessions
                </p>
            </div>

            {sessions.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-white">No separate learning sessions are due.</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/50">
                                Topics that need review stay in the Revision Queue, so the same topic is not shown twice here.
                            </p>
                            <Link
                                href="/practice"
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                            >
                                Open Practice <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto purple-scrollbar pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="space-y-2.5">
                        {sessions.map((session: any) => {
                            const isLearningSession = session.action === 'Learning Session';
                            const actionUrl = isLearningSession
                                ? `/learning?topic=${encodeURIComponent(session.topic)}&subject=${encodeURIComponent(session.tag || '')}&source=dashboard`
                                : `/practice?topic=${encodeURIComponent(session.topic)}&subject=${encodeURIComponent(session.tag || '')}&source=dashboard`;

                            return (
                                <div
                                    key={`${session.tag || 'general'}-${session.id}`}
                                    className={`flex items-center justify-between rounded-xl border p-3 ${
                                        session.completed
                                            ? 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent'
                                            : 'border-white/5 bg-white/[0.03]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                                session.completed ? 'bg-emerald-500/15' : 'bg-violet-500/10'
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
                                                className={`text-sm font-medium ${
                                                    session.completed ? 'text-white/40 line-through' : 'text-white'
                                                }`}
                                            >
                                                {session.title}
                                            </p>

                                            <p className="mt-0.5 text-xs text-white/35">
                                                {session.action || 'Study Session'} · {session.duration}
                                            </p>
                                            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/45">
                                                {session.time}
                                            </p>
                                        </div>
                                    </div>

                                    {!session.completed && (
                                        <Link
                                            href={actionUrl}
                                            aria-label={`${session.action || 'Start'}: ${session.topic}`}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40 transition hover:bg-violet-500 hover:text-white cursor-pointer"
                                        >
                                            <Play className="ml-0.5 h-3.5 w-3.5" />
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
