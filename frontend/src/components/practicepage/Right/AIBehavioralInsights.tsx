import { AlertCircle, Lightbulb, TrendingUp, Bug, Clock, Zap } from "lucide-react";

interface APIInsight {
  type: string;
  title: string;
  description: string;
  frequency: number;
}

interface AIBehavioralInsightsProps {
  insights?: APIInsight[];
  loading?: boolean;
  answeredQuestions?: number;
  overallAccuracy?: number;
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
  steady_progress: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: "text-emerald-400" },
};

const defaultColors = { bg: "bg-violet-500/5", border: "border-violet-500/20", icon: "text-violet-400" };

export default function AIBehavioralInsights({
  insights = [],
  loading = false,
  answeredQuestions = 0,
  overallAccuracy = 0,
}: AIBehavioralInsightsProps) {
  if (loading) {
    return (
      <div className="px-4 py-4 border-b border-white/10">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
          🧠 AI Behavioral Insights
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
          Analyzing recent practice...
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    const remaining = Math.max(0, 3 - answeredQuestions);
    const message = answeredQuestions === 0
      ? "Complete a few practice questions to unlock behavior-based feedback."
      : remaining > 0
        ? "Answer " + remaining + " more question" + (remaining === 1 ? "" : "s") + " to detect a reliable pattern."
        : "No recurring pattern is dominant right now. Current accuracy: " + overallAccuracy.toFixed(0) + "%.";
    return (
      <div className="px-4 py-4 border-b border-white/10">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
          🧠 AI Behavioral Insights
        </h3>
        <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 text-[11px] text-white/55 leading-snug">
          {message}
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