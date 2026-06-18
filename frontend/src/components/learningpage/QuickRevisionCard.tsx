import { RevisionPoint } from "@/constants/learningpage-data";
import { Sparkles } from "lucide-react";

interface QuickRevisionCardProps {
  title: string;
  points: RevisionPoint[];
  cta?: string;
  onAddRevision?: () => void;
  onSaveNotes?: () => void;
}

interface RevisionItemProps {
  item: RevisionPoint;
}

function RevisionItem({ item }: RevisionItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5B5FFF] shadow-[0_0_8px_rgba(91,95,255,0.8)]" />

      <p className="text-sm text-zinc-300 leading-relaxed">
        {item.text}
      </p>
    </div>
  );
}

export function QuickRevisionCard({
  title,
  points,
  cta,
  onAddRevision,
  onSaveNotes
}: QuickRevisionCardProps) {
  return (
    <div className="border-t border-white/10 pt-6 mt-6 pb-2">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />

          <h2 className="text-sm font-semibold text-white">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSaveNotes}
            className="rounded-lg border border-white/10 bg-transparent px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
          >
            Save Notes
          </button>

          <button
            onClick={onAddRevision}
            className="rounded-lg border border-indigo-500/20 bg-indigo-600/20 px-3.5 py-1.5 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-600/35 hover:text-white"
          >
            Add to Revision
          </button>
        </div>
      </div>

      {/* ITEMS */}
      <div className="space-y-3">
        {points.map((point) => (
          <RevisionItem
            key={point.id}
            item={point}
          />
        ))}
      </div>
    </div>
  );
}