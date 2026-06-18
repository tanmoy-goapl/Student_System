import { SessionStats } from "@/constants/practicepage-data";
import StatCard from "./StatCard";

interface SessionInfoSectionProps {
  stats: SessionStats;
}

export default function SessionInfoSection({
  stats,
}: SessionInfoSectionProps) {
  return (
    <div className="px-4 py-4">
      <h3 className="text-xs text-white/40 mb-3">
        Session Info
      </h3>
      <div className="space-y-1">
        <StatCard
          label="Attempted"
          value={stats.attempted.toString()}
          icon="✓"
        />
        <StatCard
          label="Accuracy"
          value={`${stats.accuracy}%`}
          icon="📊"
          color="amber"
        />
        <StatCard
          label="Time"
          value={stats.time}
          icon="⏱️"
          color="cyan"
        />
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[0.65rem] text-white/50">
              Progress
            </span>
            <span className="text-[0.65rem] text-white/70 font-medium">
              {stats.progress} of {stats.total} questions completed
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#5B5FFF] to-[#7C3AED] transition-all duration-300"
              style={{
                width: `${(stats.progress / stats.total) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}