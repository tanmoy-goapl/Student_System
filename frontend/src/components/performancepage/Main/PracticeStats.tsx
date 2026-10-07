const weakestTopics = [
    {
        label: 'Avg time/question',
        value: '1m 48s',
        color: 'cyan'
    },
    {
        label: 'Sessions this week',
        value: '6 sessions',
        color: 'violet'
    },
    {
        label: 'Best subject',
        value: 'Chemistry',
        color: 'emerald'
    },
    {
        label: 'Needs Focus',
        value: 'Wave Optics',
        color: 'red'
    }
];

const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
};

export default function PracticeStats() {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-5 hover:border-white/20 transition-all">
            <div className="mb-4">
                <h2 className="text-white text-sm font-semibold">
                    Practice Stats
                </h2>

                <p className="text-slate-500 text-xs mt-1">
                    Session and topic analytics
                </p>
            </div>

            <div className="space-y-4">
                {/* Left */}
                <div className="flex items-center gap-5">
                    {/* Circular score */}
                    <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-400">
                                71%
                            </p>

                            <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">
                                correct
                            </p>
                        </div>
                    </div>

                    {/* Numbers */}
                    <div className="space-y-2">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-200">
                                400
                            </h3>
                            <p className="text-slate-500 text-sm">Questions attempted</p>
                        </div>

                        <div className="flex items-center gap-5 text-lg font-semibold">
                            <div className="flex flex-col">
                                <span className="text-emerald-400">
                                    284
                                </span>
                                <p className="text-slate-500 text-xs">Correct</p>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-red-400">
                                    116
                                </span>
                                <p className="text-slate-500 text-xs">Incorrect</p>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right */}
                <div className="space-y-1">
                    {weakestTopics.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span className="text-slate-500 text-sm">{item.label}</span>
                            <p
                                key={idx}
                                className={`text-sm font-semibold ${colorMap[item.color] || 'text-slate-200'}`}
                            >
                                {item.value}
                            </p>
                        </div>

                    ))}
                </div>
            </div>
        </div>
    );
}