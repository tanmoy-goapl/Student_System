export type MarketInsightStat = {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean;
};

type Props = { data: MarketInsightStat[] };

export default function MarketInsights({ data }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <h2 className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-white/55">
          Market Insights
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.map((stat) => (
          <div
            key={stat.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5"
          >
            <p className="text-[0.6rem] font-medium tracking-wider uppercase text-white/40">
              {stat.label}
            </p>
            <p className="text-base font-bold text-white leading-none">{stat.value}</p>
            <p className={`text-[0.65rem] font-medium flex items-center gap-0.5 ${stat.trendPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{stat.trendPositive ? '↑' : '↓'}</span>
              {stat.trend}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}