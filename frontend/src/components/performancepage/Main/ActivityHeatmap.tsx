const heatmapRows = [
    [60, 0, 85, 92, 88],
    [0, 76, 84, 78, 0],
    [92, 73, 65, 81, 77],
    [86, 80, 0, 90, 88],
    [82, 74, 78, 69, 84],
    [88, 76, 82, 85, 79],
];

const weekLegend = [1, 2, 3, 4, 5];

export default function ActivityHeatmap() {
    return (
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 backdrop-blur-xl overflow-hidden">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h2 className="text-white text-sm font-semibold">
                        Activity Heatmap
                    </h2>

                    <p className="text-slate-500 text-xs mt-1">
                        Daily practice consistency
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    {weekLegend.map((item) => (
                        <div
                            key={item}
                            className="w-4 h-4 rounded-sm bg-indigo-500"
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
                                className={`h-4 flex-1 rounded-sm transition-all ${
                                    value === 0
                                        ? 'bg-transparent'
                                        : value > 85
                                        ? 'bg-indigo-500'
                                        : value > 70
                                        ? 'bg-indigo-500/90'
                                        : 'bg-indigo-500/70'
                                }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}