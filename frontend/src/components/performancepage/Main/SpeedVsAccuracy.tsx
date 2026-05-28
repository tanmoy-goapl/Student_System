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
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 backdrop-blur-xl">
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
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-cyan-400"
                                    style={{
                                        width: `${item.speed}%`,
                                    }}
                                />
                            </div>

                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
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

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/15 p-4">
                <p className="text-xs text-amber-200 leading-relaxed">
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