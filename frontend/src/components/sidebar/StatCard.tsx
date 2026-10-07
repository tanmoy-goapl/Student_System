"use client";

type Props = {
  label: string;
  value: string;
  delta?: string;
  up?: boolean | null;
  icon?: React.ReactNode;
};

export default function StatCard({ label, value, delta, up, icon }: Props) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-3 flex flex-col gap-1 min-w-0">
      <div className="flex items-start justify-between">
        {icon && <span className="text-white/40">{icon}</span>}
        {delta !== undefined && up !== null && (
          <span className={`text-[10px] font-medium ml-auto ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "↗" : "↘"} {delta}
          </span>
        )}
      </div>
      <span className="text-lg font-bold text-white leading-none">{value}</span>
      <span className="text-[11px] text-white/50">{label}</span>
    </div>
  );
}