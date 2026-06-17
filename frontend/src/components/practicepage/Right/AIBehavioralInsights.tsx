import { AlertCircle, Lightbulb, TrendingUp, Bug, Clock, Zap } from "lucide-react";

interface APIInsight {
  type: string;
  title: string;
  description: string;
  frequency: number;
}

interface AIBehavioralInsightsProps {
  insights?: APIInsight[];
}

const typeToIcon: Record<string, any> = {
  guessing: Zap,
  time_pressure: Clock,
  repeated_error: AlertCircle,
  conceptual_gap: Bug,
  formula_misuse: Lightbulb,
};

const typeToColor: Record<string, { bg: string; border: string; icon: string }> = {
  guessing: { bg: "bg-orange-500/5", border: "border-orange-500/20", icon: "text-orange-400" },
  time_pressure: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "text-blue-400" },
  repeated_error: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-400" },
  conceptual_gap: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-400" },
  formula_misuse: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "text-amber-400" },
};

const defaultColors = { bg: "bg-violet-500/5", border: "border-violet-500/20", icon: "text-violet-400" };

export default function AIBehavioralInsights({
  insights = [],
}: AIBehavioralInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="px-4 py-4 border-b border-white/10">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
          🧠 AI Behavioral Insights
        </h3>
        <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
          <p className="text-[10px] text-white/40 leading-relaxed">
            Practice more questions to unlock AI-powered behavioral insights about your learning patterns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
        🧠 AI Behavioral Insights
      </h3>

      <div className="space-y-2">
        {insights.map((insight, idx) => {
          const Icon = typeToIcon[insight.type] || TrendingUp;
          const colors = typeToColor[insight.type] || defaultColors;

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