import IndividualPrepCard from "./IndividualPrepCard";
import { HomepageDataResponse } from "@/lib/api";
import { Target, Flame, BookOpenText, Trophy, Activity } from "lucide-react";

const iconMap: Record<string, any> = {
  Target,
  Flame,
  BookOpenText,
  Trophy,
  Activity
};

export default function PerformanceSnapshots({ snapshots }: { snapshots: HomepageDataResponse["performanceSnapshots"] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          Performance Snapshots
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {snapshots.map((stat: any) => (
          <IndividualPrepCard key={stat.id} stat={{ ...stat, icon: iconMap[stat.iconName] || Target }} />
        ))}
      </div>
    </section>
  )
}