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
    <div className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-[#F59E0B0D] px-4 py-3 backdrop-blur-md">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-300/20 bg-none text-[10px] font-bold text-amber-100">
        {item.id}
      </div>

      <p className="text-sm text-white">
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
    <div className="overflow-hidden rounded-xl border border-amber-300/20 bg-[#F59E0B0D] p-5 shadow-2xl">
      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-100" />

          <h2 className="text-sm text-amber-50">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onSaveNotes}
            className="rounded-xl border border-amber-300/20 bg-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-100 transition-all hover:bg-amber-500/40"
          >
            Save Notes
          </button>

          <button
            onClick={onAddRevision}
            className="rounded-xl border border-indigo-300/20 bg-indigo-500/30 px-4 py-2 text-xs font-semibold text-indigo-100 transition-all hover:bg-indigo-500/40"
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