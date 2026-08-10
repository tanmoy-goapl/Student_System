import { ArrowRight } from "lucide-react";
import { AISuggestion, AISuggestionsData } from "./types";

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onClick?: (id: string) => void;
}

function SuggestionCard({ suggestion, onClick }: SuggestionCardProps) {
  const Icon = suggestion.icon;

  const colorConfig = {
    indigo: {
      bg: "bg-gradient-to-r from-indigo-500/10 to-indigo-600/5",
      border: "border-indigo-500/30",
      icon: "text-indigo-300",
      hover: "hover:border-indigo-400/50 hover:from-indigo-500/20 hover:to-indigo-600/10",
    },
    amber: {
      bg: "bg-gradient-to-r from-amber-500/10 to-amber-600/5",
      border: "border-amber-500/30",
      icon: "text-amber-300",
      hover: "hover:border-amber-400/50 hover:from-amber-500/20 hover:to-amber-600/10",
    },
    cyan: {
      bg: "bg-gradient-to-r from-cyan-500/10 to-cyan-600/5",
      border: "border-cyan-500/30",
      icon: "text-cyan-300",
      hover: "hover:border-cyan-400/50 hover:from-cyan-500/20 hover:to-cyan-600/10",
    },
  };

  const config = colorConfig[suggestion.color as keyof typeof colorConfig] || colorConfig.indigo;

  return (
    <button
      onClick={() => onClick?.(suggestion.id)}
      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${config.bg} ${config.border} ${config.hover}`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${config.icon}`} />
      <span className="flex-1 text-left text-xs font-semibold text-slate-200">
        {suggestion.label}
      </span>
      <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${config.icon}`} />
    </button>
  );
}

interface AISuggestionsProps {
  data: AISuggestionsData;
  onSuggestionClick?: (id: string) => void;
}

export function AISuggestions({ 
  data, 
  onSuggestionClick 
}: AISuggestionsProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400">
        AI Suggestions
      </h3>

      <div className="space-y-2">
        {data.suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
}