interface Props {
    readiness: {
        subject: string;
        value: number;
    }[];
}

export default function ReadinessCard({
    readiness,
}: Props) {
    return (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-sm hover:border-emerald-500/30 transition-all">
            <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white">
                    Exam Readiness
                </h2>

                <span className="text-base font-bold text-emerald-400">
                    68%
                </span>
            </div>

            <div className="space-y-2.5">
                {readiness.map((item) => (
                    <div key={item.subject}>
                        <div className="mb-1 flex justify-between text-[10px] text-white/50">
                            <span>{item.subject} readiness</span>
                            <span>{item.value}%</span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05] border border-white/5">
                            <div
                                className="h-full rounded-full bg-cyan-500/70 transition-all"
                                style={{
                                    width: `${item.value}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3.5 flex items-start gap-1.5 p-2 rounded bg-green-500/5 border border-green-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 flex-shrink-0" />
                <span className="text-[10px] text-green-300 leading-snug">
                    On track · 47 days to exam
                </span>
            </div>
        </div>
    );
}