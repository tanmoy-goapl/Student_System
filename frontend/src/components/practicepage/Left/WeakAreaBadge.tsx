interface WeakAreaBadgeProps {
  area: string;
  color: string;
}

export default function WeakAreaBadge({
  area,
  color,
}: WeakAreaBadgeProps) {
  return (
    <div className="flex items-center gap-2 pl-6">
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-white/70">
        {area}
      </span>
      <span
        className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ml-auto"
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        WEAK
      </span>
    </div>
  );
}