import { PERFORMANCE_STATS } from "@/constants/performance-sidebar-data";
import StatsCard from "./StatsCard";

export default function StatsGrid() {
    return (
        <div className="grid grid-cols-4 gap-2">
            {PERFORMANCE_STATS.map((stat) => (
                <StatsCard
                    key={stat.title}
                    stat={stat}
                />
            ))}
        </div>
    );
}