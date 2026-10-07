import { BookOpen, Users, CheckCircle2 } from "lucide-react";

export type ModeOption = "all" | "learning" | "practice" | "tests";

interface ModeFilterProps {
  selected: ModeOption;
  onSelect: (mode: ModeOption) => void;
}

const modeOptions = [
  { id: "all" as ModeOption, label: "All Modes", icon: Users },
  { id: "learning" as ModeOption, label: "Learning", icon: BookOpen },
  { id: "practice" as ModeOption, label: "Practice", icon: CheckCircle2 },
  { id: "tests" as ModeOption, label: "Tests", icon: CheckCircle2 },
];

export default function ModeFilter({ selected, onSelect }: ModeFilterProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/50 mb-3">
        Mode
      </h3>

      <div className="space-y-2">
        {modeOptions.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selected === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`w-full px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isSelected
                  ? "bg-blue-600/20 border border-blue-500/50 text-white"
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium flex-1 text-left">
                {mode.label}
              </span>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}