import { Calendar } from "lucide-react";

export type TimeRangeOption = "today" | "last7days" | "last30days";

interface TimeRangeProps {
  selected: TimeRangeOption;
  onSelect: (option: TimeRangeOption) => void;
}

const rangeOptions = [
  { id: "today" as TimeRangeOption, label: "Today", icon: Calendar },
  { id: "last7days" as TimeRangeOption, label: "Last 7 days", icon: Calendar },
  { id: "last30days" as TimeRangeOption, label: "Last 30 days", icon: Calendar },
];

export default function TimeRange({ selected, onSelect }: TimeRangeProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/50 mb-3">
        Time Range
      </h3>

      <div className="space-y-2">
        {rangeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`w-full px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isSelected
                  ? "bg-blue-600/20 border border-blue-500/50 text-white"
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium flex-1 text-left">
                {option.label}
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