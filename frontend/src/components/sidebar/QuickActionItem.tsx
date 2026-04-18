"use client";

type Props = { label: string; onClick?: () => void };

export default function QuickActionItem({ label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition text-left"
    >
      <span className="text-xs text-white font-medium">{label}</span>
      <span className="text-white/30 text-xs">›</span>
    </button>
  );
}