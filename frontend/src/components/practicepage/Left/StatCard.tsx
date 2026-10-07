interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color?: "default" | "amber" | "cyan";
}

const COLOR_CLASSES: Record<string, string> = {
  default: "text-blue-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
};

export default function StatCard({
  label,
  value,
  icon,
  color = "default",
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-xs">{icon}</span>
        <span className="text-[0.65rem] text-white/70">
          {label}
        </span>
      </div>
      <span className={`text-xs font-semibold ${COLOR_CLASSES[color]}`}>
        {value}
      </span>
    </div>
  );
}