import { PerformanceMainResponse } from "@/lib/api";
import StatsCard from "./StatsCard";
import { Target, TrendingUp, Flame, BookOpen } from "lucide-react";

const iconMap: Record<string, any> = {
    Target,
    TrendingUp,
    Flame,
    BookOpen
};

export default function StatsGrid({ stats }: { stats: PerformanceMainResponse["stats"] }) {
    if (!stats || !Array.isArray(stats)) return null;
    return (
        <div className="grid grid-cols-4 gap-2">
            {stats.map((stat) => (
                <StatsCard
                    key={stat.title}
                    stat={{
                        ...stat,
                        icon: iconMap[stat.iconName] || Target
                    }}
                />
            ))}
        </div>
    );
}