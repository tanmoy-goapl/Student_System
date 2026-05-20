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
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      icon: "text-indigo-400",
      hover: "hover:bg-indigo-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: "text-amber-400",
      hover: "hover:bg-amber-500/20",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      icon: "text-cyan-400",
      hover: "hover:bg-cyan-500/20",
    },
  };

  const config = colorConfig[suggestion.color];

  return (
    <button
      onClick={() => onClick?.(suggestion.id)}
      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${config.bg} ${config.border} ${config.hover}`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${config.icon}`} />
      <span className="flex-1 text-left text-xs text-slate-200">
        {suggestion.label}
      </span>
      <ArrowRight className={`h-4 w-4 flex-shrink-0 ${config.icon}`} />
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