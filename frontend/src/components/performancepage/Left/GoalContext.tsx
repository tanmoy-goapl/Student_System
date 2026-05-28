import { Target, CheckCircle2, AlertCircle } from "lucide-react";

export type GoalType = "exam" | "placement" | "none";

interface GoalOption {
  id: GoalType;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
}

interface GoalContextProps {
  selected: GoalType;
  onSelect: (goal: GoalType) => void;
}

export default function GoalContext({ selected, onSelect }: GoalContextProps) {
  const goals: GoalOption[] = [
    {
      id: "exam",
      title: "Exam Prep",
      icon: <Target className="w-4 h-4" />,
      isActive: true,
    },
    {
      id: "placement",
      title: "Placement Prep",
      icon: <AlertCircle className="w-4 h-4" />,
      isActive: false,
    },
  ];

  return (
    <div className="px-4 py-4">
      <h3 className="text-xs text-white/50 mb-3">
        Goal Context
      </h3>

      <div className="space-y-2">
        {goals.map((goal) => {
          const isSelected = selected === goal.id;

          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className={`w-full px-3 py-3 rounded-lg transition-all duration-200 border ${isSelected
                  ? "bg-amber-600/15 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`${isSelected
                        ? "text-amber-400"
                        : goal.isActive
                          ? "text-white/40"
                          : "text-white/30"
                      }`}
                  >
                    {goal.icon}
                  </div>
                  <span
                    className={`text-xs font-semibold ${isSelected ? "text-amber-300" : "text-white/60"
                      }`}
                  >
                    {goal.title}
                  </span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected === "exam" && (
        <div className="mt-4 p-3.5 rounded-lg bg-gradient-to-br from-blue-600/15 to-blue-700/10 border border-blue-500/30 backdrop-blur-sm">
          <div className="space-y-2">
            <div>
              <div className="text-xs text-white/60">
                JEE Advanced 2025
              </div>
            </div>
            <div className="">
              <div className="text-lg font-bold text-white">47</div>
              <div className="text-xs text-white/50">days left</div>
            </div>
            <div>
              <div className="text-xs text-white/50 mb-1">68% readiness</div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                  style={{ width: "68%" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}