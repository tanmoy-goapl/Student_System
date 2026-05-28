import { BookMarked, Lightbulb, Beaker, Zap } from "lucide-react";

export type SubjectOption = "all" | "physics" | "mathematics" | "chemistry";

interface SubjectFilterProps {
  selected: SubjectOption;
  onSelect: (subject: SubjectOption) => void;
}

const subjectOptions = [
  { id: "all" as SubjectOption, label: "All Subjects", icon: BookMarked },
  { id: "physics" as SubjectOption, label: "Physics", icon: Zap },
  { id: "mathematics" as SubjectOption, label: "Mathematics", icon: Lightbulb },
  { id: "chemistry" as SubjectOption, label: "Chemistry", icon: Beaker },
];

export default function SubjectFilter({
  selected,
  onSelect,
}: SubjectFilterProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/50 mb-3">
        Subject
      </h3>

      <div className="space-y-2">
        {subjectOptions.map((subject) => {
          const Icon = subject.icon;
          const isSelected = selected === subject.id;

          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject.id)}
              className={`w-full px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isSelected
                  ? "bg-blue-600/20 border border-blue-500/50 text-white"
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium flex-1 text-left">
                {subject.label}
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