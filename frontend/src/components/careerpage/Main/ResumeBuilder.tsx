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
  let statusText = 'bad';
  let strokeColor = 'stroke-red-500';
  let textColor = 'text-red-400';

  if (score >= 90) {
    statusText = 'excellent';
    strokeColor = 'stroke-emerald-500';
    textColor = 'text-emerald-400';
  } else if (score >= 70) {
    statusText = 'good';
    strokeColor = 'stroke-amber-500';
    textColor = 'text-amber-400';
  }

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

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
            <div className="relative flex h-20 w-20 items-center justify-center flex-shrink-0">
              <svg className="w-full h-full" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-white/[0.06]"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Foreground circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className={`${strokeColor} transition-all duration-500 ease-out`}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-lg font-bold leading-none text-white">{score}%</p>
                <p className={`text-[10px] leading-none mt-1 font-medium uppercase tracking-wider ${textColor}`}>{statusText}</p>
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