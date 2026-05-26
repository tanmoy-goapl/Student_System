interface WeakTopic {
  name: string;
  subject: string;
  accuracy: number;
}

interface WeakTopicsProps {
  topics?: WeakTopic[];
  maxTopics?: number;
}

export default function WeakTopics({
  topics = [
    { name: "Wave Optics", subject: "Physics", accuracy: 38 },
    { name: "Calculus", subject: "Mathematics", accuracy: 42 },
    { name: "Electrostatics", subject: "Physics", accuracy: 51 },
    { name: "Electrochemistry", subject: "Chemistry", accuracy: 0 },
  ],
  maxTopics = 4,
}: WeakTopicsProps) {
  const visibleTopics = topics.slice(0, maxTopics);
  const hasMore = topics.length > maxTopics;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy === 0) return "bg-white/10";
    if (accuracy < 40) return "bg-red-500/60";
    if (accuracy < 60) return "bg-orange-500/60";
    return "bg-yellow-500/60";
  };

  return (
    <div className="px-4 py-4 border-b border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          📍 Weak Topics
        </h3>
        {topics.length > 0 && (
          <span className="text-[10px] font-medium text-red-400">
            {maxTopics} topics
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visibleTopics.map((topic, idx) => (
          <div key={idx} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <div className="text-xs font-medium text-white">
                  {topic.name}
                </div>
                <div className="text-[10px] text-white/40">{topic.subject}</div>
              </div>
              {topic.accuracy > 0 && (
                <span className="text-xs font-bold text-red-400">
                  {topic.accuracy}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${getAccuracyColor(
                  topic.accuracy
                )}`}
                style={{ width: `${topic.accuracy}%` }}
              />
            </div>
          </div>
        ))}

        {hasMore && (
          <div className="pt-2 border-t border-white/10">
            <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
              View all {topics.length} weak topics →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}