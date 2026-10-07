import { ArrowRight, BookmarkCheck, Clock3 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PracticeRevisionQueueItem {
  topic: string;
  subject: string;
  confidence: number;
  accuracy: number;
  last_practiced?: string | null;
  days_since_practice: number;
  priority_score: number;
  reason: string;
}

interface RevisionQueueProps {
  items?: PracticeRevisionQueueItem[];
}

export default function RevisionQueue({ items = [] }: RevisionQueueProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 4);

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookmarkCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest truncate">
            AI Revision Queue
          </h3>
        </div>
        {items.length > 0 && (
          <span className="text-[9px] font-semibold text-violet-300 shrink-0">
            {items.length} due
          </span>
        )}
        {items.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-[9px] text-violet-300 hover:text-violet-200 shrink-0"
          >
            {showAll ? "Show less" : "View all"}
          </button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 text-[11px] text-white/55 leading-snug">
          No topics currently need revision. Your recent practice is on track.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <button
              key={item.subject + "-" + item.topic}
              type="button"
              onClick={() => router.push("/practice?topic=" + encodeURIComponent(item.topic))}
              className="w-full p-2.5 rounded-lg border border-violet-500/15 bg-violet-500/5 text-left hover:border-violet-400/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate group-hover:text-violet-200">
                    {item.topic}
                  </div>
                  <div className="text-[9px] text-white/45 mt-0.5 truncate">
                    {item.subject} · {item.reason}
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-violet-300 shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-2 mt-2 text-[9px] text-white/45">
                <Clock3 className="w-3 h-3" />
                <span>{item.days_since_practice}d since practice</span>
                <span className="text-white/25">·</span>
                <span>{Math.round(item.accuracy)}% accuracy</span>
              </div>
            </button>
          ))}
          {items.length > visibleItems.length && (
            <div className="text-[9px] text-white/35 text-center pt-0.5">
              +{items.length - visibleItems.length} more in your queue
            </div>
          )}
        </div>
      )}
    </div>
  );
}
