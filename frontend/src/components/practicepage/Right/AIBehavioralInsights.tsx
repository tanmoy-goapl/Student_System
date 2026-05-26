import { AlertCircle, Lightbulb, TrendingUp, Bug } from "lucide-react";

interface InsightItem {
  icon: "alert" | "lightbulb" | "trending" | "bug";
  title: string;
  description: string;
  type: "warning" | "tip" | "positive" | "issue";
}

interface AIBehavioralInsightsProps {
  insights?: InsightItem[];
}

const iconMap = {
  alert: AlertCircle,
  lightbulb: Lightbulb,
  trending: TrendingUp,
  bug: Bug,
};

const colorMap = {
  warning: { bg: "bg-orange-500/5", border: "border-orange-500/20", icon: "text-orange-400" },
  tip: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "text-blue-400" },
  positive: { bg: "bg-green-500/5", border: "border-green-500/20", icon: "text-green-400" },
  issue: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-400" },
};

export default function AIBehavioralInsights({
  insights = [
    {
      icon: "alert",
      title: "You rush on formula-based questions",
      description: "— slow down by ~1s for better accuracy.",
      type: "warning",
    },
    {
      icon: "lightbulb",
      title: "Strong pattern: you miss sign conventions",
      description: "in vector/field problems.",
      type: "tip",
    },
    {
      icon: "trending",
      title: "Performance improves after a 2-min break.",
      description: "Take one now?",
      type: "positive",
    },
  ],
}: AIBehavioralInsightsProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
        🧠 AI Behavioral Insights
      </h3>

      <div className="space-y-2">
        {insights.map((insight, idx) => {
          const Icon = iconMap[insight.icon];
          const colors = colorMap[insight.type];

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${colors.bg} ${colors.border} backdrop-blur-sm hover:border-white/30 transition-all`}
            >
              <div className="flex gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white leading-snug">
                    {insight.title}
                  </div>
                  <div className="text-[10px] text-white/50 mt-1 leading-snug">
                    {insight.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}