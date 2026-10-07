import { Zap, Book, Target, Activity, Calendar } from "lucide-react";

interface AdaptiveEngineConfig {
  recommended_difficulty: string;
  study_pace: string;
  focus_topic: string;
  last_active: string;
}

interface AdaptiveEngineProps {
  config?: AdaptiveEngineConfig;
}

export default function AdaptiveEngine({
  config,
}: AdaptiveEngineProps) {
  if (!config) return null;
  const settings = [
    {
      label: "Recommended Difficulty",
      value: config.recommended_difficulty,
      icon: Target,
      colorClass: config.recommended_difficulty === "Hard" ? "text-red-400" : (config.recommended_difficulty === "Medium" ? "text-amber-400" : "text-green-400"),
      bgClass: config.recommended_difficulty === "Hard" ? "bg-red-500/5 border-red-500/10" : (config.recommended_difficulty === "Medium" ? "bg-amber-500/5 border-amber-500/10" : "bg-green-500/5 border-green-500/10"),
    },
    {
      label: "Study Pace",
      value: config.study_pace,
      icon: Activity,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/5 border-blue-500/10",
    },
    {
      label: "Last Active",
      value: config.last_active,
      icon: Calendar,
      colorClass: "text-zinc-300",
      bgClass: "bg-zinc-500/5 border-zinc-500/10",
    },
  ];

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
          🎓 Adaptive Coach
        </h3>
      </div>

      <div className="space-y-2">
        {settings.map((setting, idx) => {
          const Icon = setting.icon;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-lg border ${setting.bgClass} backdrop-blur-sm hover:border-white/15 transition-all`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <Icon className="w-3.5 h-3.5 text-white/35 flex-shrink-0" />
                <span className="text-[10px] text-white/60 font-semibold truncate">
                  {setting.label}
                </span>
              </div>
              <span className={`text-[11px] font-bold shrink-0 ${setting.colorClass}`}>
                {setting.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}