"use client";

type Props = {
  level: "error" | "warning" | "info";
  message: string;
  affected: number;
};

const CONFIG = {
  error: { border: "border-red-500/30", bg: "bg-red-500/10", badge: "bg-red-500", icon: "⚠" },
  warning: { border: "border-amber-500/30", bg: "bg-amber-500/10", badge: "bg-amber-500", icon: "⚡" },
  info: { border: "border-blue-500/30", bg: "bg-blue-500/10", badge: "bg-blue-500", icon: "ℹ" },
};

export default function AlertItem({ level, message, affected }: Props) {
  const c = CONFIG[level];
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${c.border} ${c.bg}`}>
      <span className="text-xs mt-0.5">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium leading-snug">{message}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{affected} affected</p>
      </div>
      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md ${c.badge} shrink-0`}>
        {affected}
      </span>
    </div>
  );
}