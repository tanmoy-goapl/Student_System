import { PracticeMode } from "@/constants/practicepage-data";

interface PracticeModeCardProps {
  mode: PracticeMode;
  isSelected: boolean;
  onSelect: () => void;
}

const ICON_MAP: Record<string, string> = {
  "alert-circle": "⚠️",
  "book-2": "📖",
  "clipboard-check": "✓",
  bookmark: "🔖",
};

export default function PracticeModeCard({
  mode,
  isSelected,
  onSelect,
}: PracticeModeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full py-2 px-3 rounded-xl transition-all duration-200
        text-left border
        ${
          isSelected
            ? "border-red-500/40 bg-red-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-medium text-white">
          {mode.title}
        </h4>
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-red-500" />
        )}
      </div>
      <p className="text-[0.65rem] text-white/50 leading-tight">
        {mode.description}
      </p>
    </button>
  );
}