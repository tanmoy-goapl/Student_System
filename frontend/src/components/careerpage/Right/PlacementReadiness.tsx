export type PlacementReadinessData = {
  overallScore: number;
  note: string;
  categories: { id: string; label: string; value: number; color: string }[];
};

type Props = { data: PlacementReadinessData };

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PlacementReadiness({ data }: Props) {
  const dashOffset = CIRCUMFERENCE * (1 - data.overallScore / 100);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-400" />
        <h2 className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-white/55">
          Placement Readiness
        </h2>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        {/* Ring + text */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44" cy="44" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
              />
              <circle
                cx="44" cy="44" r={RADIUS}
                fill="none"
                stroke="url(#readinessGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
              <span className="text-base font-bold text-white leading-none">{data.overallScore}%</span>
              <span className="text-[0.55rem] text-white/40 mt-0.5">ready</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">Overall Readiness</p>
            <p className="text-[0.65rem] text-white/45 mt-1 leading-relaxed">{data.note}</p>
          </div>
        </div>

        {/* Category bars */}
        <div className="space-y-2.5">
          {data.categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="text-[0.65rem] text-white/55 w-24 flex-shrink-0">{cat.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.color}`}
                  style={{ width: `${cat.value}%` }}
                />
              </div>
              <span className="text-[0.65rem] font-medium text-white/70 w-7 text-right flex-shrink-0">
                {cat.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}