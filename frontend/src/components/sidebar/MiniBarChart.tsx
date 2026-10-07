"use client";

type Bar = { label: string; score: number; color?: string };

type Props =
  | { type: "topic"; bars: Bar[]; classAvg?: number }
  | { type: "trend"; values: number[]; labels: string[] };

export default function MiniBarChart(props: Props) {
  if (props.type === "topic") {
    return (
      <div className="space-y-2">
        {props.bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 w-16 shrink-0 truncate">{b.label}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.score}%`, background: b.color || "#6366f1" }}
              />
            </div>
            <span className="text-[11px] text-white/70 w-8 text-right">{b.score}%</span>
          </div>
        ))}
      </div>
    );
  }

  const max = Math.max(...props.values, 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {props.values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{
              height: `${(v / max) * 52}px`,
              background: v > 60 ? "#6366f1" : "#334155",
              minHeight: 4,
            }}
          />
          <span className="text-[9px] text-white/30">{props.labels[i]}</span>
        </div>
      ))}
    </div>
  );
}