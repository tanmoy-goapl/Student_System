const SUBJECT_PERFORMANCE = [
    {
        subject: 'Physics',
        speed: 52,
        accuracy: 64,
    },
    {
        subject: 'Mathematics',
        speed: 38,
        accuracy: 58,
    },
    {
        subject: 'Chemistry',
        speed: 68,
        accuracy: 72,
    },
];

export default function SpeedVsAccuracy() {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-5 hover:border-white/20 transition-all">
            <div className="mb-8">
                <h2 className="text-white text-sm font-semibold">
                    Speed vs. Accuracy
                </h2>

                <p className="text-slate-500 text-xs mt-1">
                    Compare solving pace with precision
                </p>
            </div>

            <div className="space-y-7">
                {SUBJECT_PERFORMANCE.map((item) => (
                    <div key={item.subject}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-300 text-sm font-medium">
                                {item.subject}
                            </span>

                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="text-cyan-400">
                                    Speed {item.speed}%
                                </span>

                                <span className="text-indigo-400">
                                    Acc: {item.accuracy}%
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] border border-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-cyan-400"
                                    style={{
                                        width: `${item.speed}%`,
                                    }}
                                />
                            </div>

                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] border border-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-indigo-400"
                                    style={{
                                        width: `${item.accuracy}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs text-amber-300 leading-relaxed">
                    <span className="">
                        In Maths,
                    </span>{' '}
                    you solve fast but sacrifice
                    accuracy. Slow down by ~12s per
                    question to gain +11% accuracy.
                </p>
            </div>
        </div>
    );
}