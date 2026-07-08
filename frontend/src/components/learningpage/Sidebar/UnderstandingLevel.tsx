import { SkillMetric, UnderstandingLevelData } from "./types";

interface SkillBarProps {
  metric: SkillMetric;
}

function SkillBar({ metric }: SkillBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{metric.label}</span>
        <span 
          className="text-xs font-medium"
          style={{ color: metric.color }}
        >
          {metric.percentage}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${metric.percentage}%`,
            backgroundColor: metric.color,
          }}
        />
      </div>
    </div>
  );
}

interface UnderstandingLevelProps {
  data: UnderstandingLevelData;
}

export function UnderstandingLevel({ data }: UnderstandingLevelProps) {
  const statusUpper = data.status.toUpperCase();
  const statusColor =
    statusUpper === "WEAK"
      ? "text-red-400"
      : (statusUpper === "LEARNING" || statusUpper === "NOT_STARTED")
        ? "text-amber-400"
        : "text-green-400";

  const statusBgColor =
    statusUpper === "WEAK"
      ? "bg-red-500/10 border-red-500/30"
      : (statusUpper === "LEARNING" || statusUpper === "NOT_STARTED")
        ? "bg-amber-500/10 border-amber-500/30"
        : "bg-green-500/10 border-green-500/30";

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-400">
        Understanding Level
      </h3>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">Accuracy</p>
          <div className="flex flex-col">
            <p 
              className="text-3xl font-bold"
              style={{ color: statusColor }}
            >
              {data.mainPercentage}%
            </p>
            {data.confidence !== undefined && (
              <p className="text-xs text-indigo-400 mt-1 font-medium">
                Confidence: {data.confidence}%
              </p>
            )}
          </div>
        </div>

        <div
          className={`rounded-lg border px-3 py-2 ${statusBgColor}`}
        >
          <span className={`text-xs font-medium capitalize ${statusColor}`}>
            {data.status}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {data.skillBreakdown.map((metric) => (
          <SkillBar key={metric.id} metric={metric} />
        ))}
      </div>

      <p className="text-xs text-slate-500 border-t border-slate-700/50 pt-3">
        {data.baselineText}
      </p>
    </div>
  );
}