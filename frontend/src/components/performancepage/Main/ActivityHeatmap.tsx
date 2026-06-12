const heatmapRows = [
    [60, 0, 85, 92, 88],
    [0, 76, 84, 78, 0],
    [92, 73, 65, 81, 77],
    [86, 80, 0, 90, 88],
    [82, 74, 78, 69, 84],
    [88, 76, 82, 85, 79],
];

const legendColors = [
    "bg-white/[0.03] border border-white/5",
    "bg-cyan-500/30",
    "bg-cyan-500/60",
    "bg-cyan-500/85",
    "bg-cyan-500"
];

export default function ActivityHeatmap() {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-5 overflow-hidden hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h2 className="text-white text-sm font-semibold">
                        Activity Heatmap
                    </h2>

                    <p className="text-slate-500 text-xs mt-1">
                        Daily practice consistency
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    {legendColors.map((colorClass, idx) => (
                        <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-sm ${colorClass}`}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                {heatmapRows.map((row, rowIndex) => (
                    <div
                        key={rowIndex}
                        className="flex gap-1.5"
                    >
                        {row.map((value, colIndex) => (
                            <div
                                key={colIndex}
                                className={`h-3.5 flex-1 rounded-sm transition-all ${
                                    value === 0
                                        ? 'bg-white/[0.03] border border-white/5'
                                        : value > 85
                                        ? 'bg-cyan-500'
                                        : value > 70
                                        ? 'bg-cyan-500/85'
                                        : 'bg-cyan-500/50'
                                }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}