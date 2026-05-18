import { PERFORMANCE_SNAPSHOTS } from "@/constants/homepage-data";
import IndividualPrepCard from "./IndividualPrepCard";

export default function PerformanceSnapshots() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          Performance Snapshots
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {PERFORMANCE_SNAPSHOTS.map((stat) => (
          <IndividualPrepCard key={stat.id} stat={stat} />
        ))}
      </div>
    </section>
  )
}