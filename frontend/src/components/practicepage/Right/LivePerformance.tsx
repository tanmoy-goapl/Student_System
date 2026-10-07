import { ArrowUpRight, TrendingUp } from "lucide-react";

interface PerformanceMetric {
  label: string;
  value: string;
  subtext: string;
  color: "yellow" | "cyan" | "purple" | "blue";
}

interface LivePerformanceProps {
  accuracy: number;
  avgSpeed: string;
  streak: number;
  pointsEarned: number;
  trendData?: number[];
}

const colorMap = {
  yellow: "text-yellow-400",
  cyan: "text-cyan-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
};

const borderMap = {
  yellow: "border-yellow-400/20",
  cyan: "border-cyan-400/20",
  purple: "border-purple-400/20",
  blue: "border-blue-400/20",
};

export default function LivePerformance({
  accuracy,
  avgSpeed,
  streak,
  pointsEarned,
  trendData = [45, 52, 58, 62, 68, 72],
}: LivePerformanceProps) {
  const metrics: PerformanceMetric[] = [
    {
      label: `${accuracy}%`,
      value: "Session",
      subtext: "Accuracy",
      color: "yellow",
    },
    {
      label: avgSpeed,
      value: "Avg Speed",
      subtext: "per question",
      color: "cyan",
    },
    {
      label: `${streak}`,
      value: "Streak",
      subtext: "correct in a row",
      color: "purple",
    },
    {
      label: `+${pointsEarned}`,
      value: "Points Earned",
      subtext: "this session",
      color: "blue",
    },
  ];

  return (
    <div className="px-4 py-4 border-b border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Live Performance
        </h3>
        <div className="flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-green-400" />
          <span className="text-[10px] text-green-400 font-medium">
            Improving
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg bg-white/[0.02] border ${borderMap[metric.color]} backdrop-blur-sm hover:bg-white/[0.05] transition-colors`}
          >
            <div className={`text-lg font-bold ${colorMap[metric.color]} mb-1`}>
              {metric.label}
            </div>
            <div className="text-[11px] text-white/50 leading-tight">
              <div>{metric.value}</div>
              <div className="text-white/30">{metric.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="space-y-2">
        <div className="text-[10px] text-white/40">Accuracy trend</div>
        <div className="flex items-end gap-1 h-12 bg-white/[0.01] p-2 rounded-lg border border-white/5">
          {trendData.map((value, idx) => {
            const maxValue = Math.max(...trendData);
            const heightPercent = (value / maxValue) * 100;
            const isLatest = idx === trendData.length - 1;

            return (
              <div
                key={idx}
                className={`flex-1 rounded-sm transition-all ${
                  isLatest
                    ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                    : "bg-slate-700/60 hover:bg-slate-600"
                }`}
                style={{
                  height: `${heightPercent}%`,
                  minHeight: "2px",
                }}
                title={`${value}%`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}