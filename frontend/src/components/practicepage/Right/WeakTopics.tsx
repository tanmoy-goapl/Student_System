interface WeakTopic {
  topic: string;
  subject: string;
  accuracy: number;
  reason?: string;
}

interface WeakTopicsProps {
  topics?: WeakTopic[];
  maxTopics?: number;
}

export default function WeakTopics({
  topics = [],
  maxTopics = 4,
}: WeakTopicsProps) {
  const visibleTopics = topics.slice(0, maxTopics);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy === 0) return "bg-white/10";
    if (accuracy < 40) return "bg-red-500/60";
    if (accuracy < 60) return "bg-orange-500/60";
    return "bg-yellow-500/60";
  };

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
          📍 Weak Topics
        </h3>
        {topics.length > 0 && (
          <span className="text-[9px] font-medium text-red-400">
            {Math.min(topics.length, maxTopics)} topics
          </span>
        )}
      </div>

      <div className="space-y-3">
        {visibleTopics.map((topic, idx) => (
          <div key={idx} className="group">
            <div className="flex flex-col mb-1.5 min-w-0">
              <div className="flex justify-between items-start gap-1">
                <span className="text-xs font-semibold text-white truncate max-w-[70%]">
                  {topic.topic}
                </span>
                <span className="text-[8px] text-white/30 truncate shrink-0">
                  {topic.subject}
                </span>
              </div>
              {topic.reason && (
                <div className="text-[9px] text-red-400/90 leading-snug mt-0.5">
                  {topic.reason}
                </div>
              )}
            </div>

            {/* Progress Bar (representing confidence) */}
            <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${getAccuracyColor(
                  topic.accuracy
                )}`}
                style={{ width: `${topic.accuracy || 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}