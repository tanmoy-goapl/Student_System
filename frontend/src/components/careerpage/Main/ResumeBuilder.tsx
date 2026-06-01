import { FileText, Zap, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';

export type ResumeSuggestion = {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
};

type ResumeBuilderProps = {
  fileName: string;
  score: number;
  uploadedAt: string;
  onReplace: () => void;
  onImprove: () => void;
  suggestions: ResumeSuggestion[];
};

function SuggestionItem({ suggestion }: { suggestion: ResumeSuggestion }) {
  const iconClass =
    suggestion.type === 'error'
      ? 'text-red-400'
      : suggestion.type === 'warning'
        ? 'text-amber-400'
        : 'text-emerald-400';

  const bgClass =
    suggestion.type === 'error'
      ? 'bg-red-500/15 border-red-500/30'
      : suggestion.type === 'warning'
        ? 'bg-amber-500/15 border-amber-500/30'
        : 'bg-emerald-500/15 border-emerald-500/30';

  const Icon =
    suggestion.type === 'error'
      ? AlertCircle
      : suggestion.type === 'warning'
        ? AlertCircle
        : CheckCircle;

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${bgClass} group cursor-pointer hover:bg-opacity-40 transition`}>
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">{suggestion.title}</p>
        <p className="text-xs text-white/55 mt-1">{suggestion.description}</p>
      </div>
      <div className="text-white/40 group-hover:text-white/60 transition">
        →
      </div>
    </div>
  );
}

export default function ResumeBuilder({
  fileName,
  score,
  uploadedAt,
  onReplace,
  onImprove,
  suggestions,
}: ResumeBuilderProps) {
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreBgColor = score >= 80 ? 'from-emerald-500/20' : score >= 60 ? 'from-amber-500/20' : 'from-red-500/20';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          Resume Builder
        </h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br ${scoreBgColor} to-transparent border border-white/10`}>
              <div className="text-center">
                <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-xs text-white/55">/100</p>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{fileName}</h3>
                  <p className="text-xs text-white/55 mt-1">Uploaded {uploadedAt}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={onReplace}
                  className="flex items-center justify-center gap-2 text-xs font-medium text-white/70 hover:text-white/90 rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5"
                >
                  Replace
                </button>
                <button
                  onClick={onImprove}
                  className="flex items-center justify-center gap-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition"
                >
                  <Zap className="h-3 w-3" />
                  AI Improve
                </button>
              </div>
            </div>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="border-t border-white/10 bg-white/[0.01] p-5">
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionItem key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}