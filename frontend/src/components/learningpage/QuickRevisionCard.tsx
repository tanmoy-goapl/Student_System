import { RevisionPoint } from "@/constants/learningpage-data";
import { Sparkles } from "lucide-react";

interface QuickRevisionCardProps {
  title?: string;
  points: RevisionPoint[];
  cta?: string;
  onAddRevision?: () => void;
  onSaveNotes?: () => void;
}

export function QuickRevisionCard({
  points,
  onAddRevision,
  onSaveNotes
}: QuickRevisionCardProps) {
  // Limit to 4-6 points
  const displayPoints = points.slice(0, 6);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">
            Key Takeaways
          </h2>
        </div>


      </div>

      {/* ITEMS */}
      <ul className="space-y-2.5">
        {displayPoints.map((point) => (
          <li key={point.id} className="flex gap-2.5 items-start">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span className="text-xs leading-relaxed text-zinc-300">{point.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}