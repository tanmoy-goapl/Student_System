import { RevisionPoint } from "@/constants/learningpage-data";
import { BookmarkPlus, Check, LoaderCircle, Sparkles } from "lucide-react";
import { normalizeReadableMath } from "@/lib/readableMath";

interface QuickRevisionCardProps {
  title?: string;
  points: RevisionPoint[];
  cta?: string;
  onAddRevision?: () => void;
  onSaveNotes?: () => void;
  isRevisionAdded?: boolean;
  isAddingRevision?: boolean;
  revisionError?: string | null;
}

export function QuickRevisionCard({
  points,
  onAddRevision,
  onSaveNotes,
  isRevisionAdded = false,
  isAddingRevision = false,
  revisionError,
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

        {onAddRevision && (
          <button
            type="button"
            onClick={onAddRevision}
            disabled={isRevisionAdded || isAddingRevision}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors ${
              isRevisionAdded
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-violet-500/25 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-60"
            }`}
          >
            {isAddingRevision ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : isRevisionAdded ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            {isAddingRevision ? "Adding..." : isRevisionAdded ? "In Revision" : "Add to Revision"}
          </button>
        )}
      </div>
      {revisionError && (
        <p className="mb-3 text-[11px] text-rose-300" role="status">
          {revisionError}
        </p>
      )}

      {/* ITEMS */}
      <ul className="space-y-2.5">
        {displayPoints.map((point) => (
          <li key={point.id} className="flex gap-2.5 items-start">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span className="text-xs leading-relaxed text-zinc-300">{normalizeReadableMath(point.text)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
