import { Play, RefreshCw, BookOpen, ArrowRight } from "lucide-react";

interface SuggestedAction {
  id: string;
  title: string;
  subtitle: string;
  icon: "play" | "refresh" | "book";
  color: "blue" | "red" | "amber";
  action: () => void;
}

interface SuggestedNextProps {
  actions?: SuggestedAction[];
}

const iconMap = {
  play: Play,
  refresh: RefreshCw,
  book: BookOpen,
};

const colorMap = {
  blue: {
    bg: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
    border: "border-blue-500/30",
    icon: "text-blue-400",
    hover: "hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/20",
  },
  red: {
    bg: "bg-gradient-to-br from-red-500/10 to-red-600/5",
    border: "border-red-500/30",
    icon: "text-red-400",
    hover: "hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/20",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/30",
    icon: "text-amber-400",
    hover: "hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/20",
  },
};

export default function SuggestedNext({
  actions = [
    {
      id: "continue",
      title: "Continue Practice",
      subtitle: "(4 more in session)",
      icon: "play",
      color: "blue",
      action: () => console.log("Continue"),
    },
    {
      id: "mistakes",
      title: "Review Mistakes",
      subtitle: "(3 errors this session)",
      icon: "refresh",
      color: "red",
      action: () => console.log("Review"),
    },
    {
      id: "learning",
      title: "Go to Learning",
      subtitle: "(Wave Optics theory)",
      icon: "book",
      color: "amber",
      action: () => console.log("Learning"),
    },
  ],
}: SuggestedNextProps) {
  return (
    <div className="px-4 py-4">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
        Suggested Next
      </h3>

      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = iconMap[action.icon];
          const colors = colorMap[action.color];

          return (
            <button
              key={action.id}
              onClick={action.action}
              className={`w-full group p-3.5 rounded-lg border ${colors.bg} ${colors.border} ${colors.hover} backdrop-blur-sm transition-all duration-300 text-left`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={`w-4 h-4 mt-1 ${colors.icon} flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-white/90 transition-colors">
                      {action.title}
                    </div>
                    <div className="text-[10px] text-white/50 mt-0.5">
                      {action.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}