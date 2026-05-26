import { Zap, Book, Target } from "lucide-react";

interface AdaptiveEngineConfig {
  calibration: {
    status: string;
    color: "green" | "yellow" | "red";
  };
  nextQuestion: {
    status: string;
    color: "red" | "yellow" | "blue";
  };
  focusArea: string;
  learningPace: {
    status: string;
    color: "blue" | "green";
  };
}

interface AdaptiveEngineProps {
  config?: AdaptiveEngineConfig;
}

const statusColorMap = {
  "Active": { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  "Hard (adapting)": {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  "YDSE formulas": {
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  "Slightly fast": { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

export default function AdaptiveEngine({
  config = {
    calibration: { status: "Active", color: "green" },
    nextQuestion: { status: "Hard (adapting)", color: "red" },
    focusArea: "YDSE formulas",
    learningPace: { status: "Slightly fast", color: "blue" },
  },
}: AdaptiveEngineProps) {
  const settings = [
    {
      label: "Difficulty Calibration",
      value: config.calibration.status,
      color: config.calibration.color,
      icon: Target,
    },
    {
      label: "Next Question",
      value: config.nextQuestion.status,
      color: config.nextQuestion.color,
      icon: Book,
    },
    {
      label: "Focus Area",
      value: config.focusArea,
      color: "yellow" as const,
      icon: Zap,
    },
    {
      label: "Learning Pace",
      value: config.learningPace.status,
      color: config.learningPace.color,
      icon: Zap,
    },
  ];

  return (
    <div className="px-4 py-4 border-b border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          🎓 Adaptive Engine
        </h3>
      </div>

      <div className="space-y-2.5">
        {settings.map((setting, idx) => {
          // Get color styling from the status map
          const colorKey = setting.value as keyof typeof statusColorMap;
          const colors = statusColorMap[colorKey] || {
            text: "text-white/60",
            bg: "bg-white/5",
            border: "border-white/10",
          };
          const Icon = setting.icon;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg border ${colors.bg} ${colors.border} backdrop-blur-sm hover:border-white/20 transition-all`}
            >
              <div className="flex items-center gap-2 flex-1">
                <Icon className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <span className="text-[11px] text-white/60 font-medium">
                  {setting.label}
                </span>
              </div>
              <span className={`text-xs font-semibold ${colors.text}`}>
                {setting.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 flex-shrink-0" />
        <span className="text-[10px] text-green-300 leading-snug">
          Engine running · analyzing in real-time
        </span>
      </div>
    </div>
  );
}