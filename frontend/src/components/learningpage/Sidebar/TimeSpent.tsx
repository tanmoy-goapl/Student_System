import { TrendingUp, TrendingDown } from "lucide-react";
import { TimeMetric, TimeSpentData } from "./types";

interface TimeMetricCardProps {
  metric: TimeMetric;
}

function TimeMetricCard({ metric }: TimeMetricCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-slate-900/30 px-4 py-3">
      <p className={`text-lg font-bold ${metric.color}`}>
        {metric.value}
      </p>
      <p className="text-xs text-slate-400 mt-1">{metric.label}</p>
    </div>
  );
}

interface TimeSpentProps {
  data: TimeSpentData;
}

export function TimeSpent({ data }: TimeSpentProps) {
  const TrendIcon =
    data.comparison.trend === "up"
      ? TrendingUp
      : data.comparison.trend === "down"
        ? TrendingDown
        : null;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-400">
        Time Spent
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {data.metrics.map((metric) => (
          <TimeMetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {TrendIcon && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
          <TrendIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div className="flex items-center gap-1">
            <p className="text-xs text-emerald-300">
              {data.comparison.value}
            </p>
            <p className="text-xs text-emerald-200/70">
              {data.comparison.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}