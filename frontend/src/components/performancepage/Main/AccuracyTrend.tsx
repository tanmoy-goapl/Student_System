import { PerformanceMainResponse } from "@/lib/api";

export default function AccuracyTrend({ trendData }: { trendData: PerformanceMainResponse["trend"] }) {
    if (!trendData || !trendData.labels || !trendData.accuracy) return null;
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-5 overflow-hidden relative">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h2 className="text-white text-sm font-semibold">
                        Accuracy Trend
                    </h2>

                    <p className="text-slate-500 text-xs">
                        Last 7 days · All subjects
                    </p>
                </div>
            </div>

            <div className="relative h-40">
                <div className="absolute inset-0 flex flex-col justify-between opacity-30">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="border-t border-white/5"
                        />
                    ))}
                </div>

                <div className="absolute inset-1 flex items-end justify-between px-2">
                    {trendData.labels.map(
                        (label, index) => (
                            <div
                                key={label}
                                className="flex flex-col items-center justify-end h-full flex-1 relative"
                            >
                                <div
                                    className="absolute w-full flex justify-center"
                                    style={{
                                        bottom: `${trendData.accuracy[index]}%`,
                                    }}
                                >
                                    <div className="w-3 h-3 rounded-full bg-indigo-400 border-[3px] border-slate-950" />
                                </div>

                                {trendData.practiceVolume && trendData.practiceVolume[index] !== undefined && (
                                    <div
                                        className="absolute w-full border-t-2 border-dashed border-emerald-400/80"
                                        style={{
                                            bottom: `${trendData.practiceVolume[index]}%`,
                                        }}
                                    />
                                )}

                                {index !==
                                    trendData.labels
                                        .length -
                                    1 && (
                                        <div
                                            className="absolute left-1/2 border-t-2 border-indigo-400"
                                            style={{
                                                width: '100%',
                                                bottom: `${trendData.accuracy[index]}%`,
                                            }}
                                        />
                                    )}

                                <span className="text-slate-500 text-xs pb-2">
                                    {label}
                                </span>
                            </div>
                        )
                    )}
                </div>

            </div>
        </div>
    );
}