"use client";

type Entry = { label: string; value: string };
type Props = { entries: Entry[] };

export default function AIConfig({ entries }: Props) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-3">
      <p className="text-xs font-semibold text-white mb-2">⚙ AI Configuration</p>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.label} className="flex items-center justify-between">
            <span className="text-[11px] text-white/50">{e.label}</span>
            <span className="text-[11px] font-medium text-white bg-white/10 px-2 py-0.5 rounded-md">
              {e.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}