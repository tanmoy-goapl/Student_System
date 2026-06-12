interface StatsCardProps {
    stat: any;
}

export default function StatsCard({
    stat,
}: StatsCardProps) {
    const Icon = stat.icon;

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-4 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-2">
                <div
                    className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${stat.iconColor}`}
                >
                    <Icon size={15} />
                </div>

                <div className="min-h-[36px] max-w-[80px] px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[0.5rem] leading-tight text-center flex items-center justify-center">
                    {stat.badge}
                </div>
            </div>

            <div>
                <h3
                    className={`text-sm font-bold ${stat.valueColor}`}
                >
                    {stat.value}
                </h3>

                <p className="text-slate-300 text-xs font-medium mt-2">
                    {stat.title}
                </p>

                <p className="text-slate-500 text-[0.65rem] mt-1">
                    {stat.subtitle}
                </p>
            </div>
        </div>
    );
}