export type ProgressTrackingItem = {
  id: string;
  label: string;
  current: number;
  total: number;
  color: string;
};

type Props = { items: ProgressTrackingItem[] };

export default function ProgressTracking({ items }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-violet-400" />
        <h2 className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-white/55">
          Progress Tracking
        </h2>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const pct = Math.round((item.current / item.total) * 100);
          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">{item.label}</span>
                <span className="text-xs font-semibold text-white">
                  {item.current}
                  <span className="text-white/35 font-normal"> / {item.total}</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}