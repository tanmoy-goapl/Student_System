import { AlertTriangle } from "lucide-react";
import { CommonMistake, CommonMistakesData } from "./types";

interface MistakeItemProps {
  mistake: CommonMistake;
}

function MistakeItem({ mistake }: MistakeItemProps) {
  const severityColor =
    mistake.severity === "high"
      ? "text-amber-400"
      : mistake.severity === "medium"
        ? "text-amber-300"
        : "text-amber-200";

  return (
    <div className="flex gap-3">
      <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${severityColor}`} />
      <p className="text-xs text-slate-300 leading-relaxed">
        {mistake.text}
      </p>
    </div>
  );
}

interface CommonMistakesProps {
  data: CommonMistakesData;
}

export function CommonMistakes({ data }: CommonMistakesProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-400">
        Common Mistakes
      </h3>

      <div className="space-y-3">
        {data.mistakes.map((mistake) => (
          <MistakeItem key={mistake.id} mistake={mistake} />
        ))}
      </div>
    </div>
  );
}