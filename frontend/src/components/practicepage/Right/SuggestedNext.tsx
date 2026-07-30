import { Play, RefreshCw, BookOpen, ArrowRight, Target } from "lucide-react";
import { useRouter } from "next/navigation";

interface SuggestedAction {
  title: string;
  topic: string;
  reason: string;
  action_url: string;
}

interface SuggestedNextProps {
  actions?: SuggestedAction[];
}

const actionStyles: Record<string, { icon: any; bg: string; border: string; iconColor: string; hover: string }> = {
  "Continue Practice": {
    icon: Play,
    bg: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
    hover: "hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/20",
  },
  "Review Mistakes": {
    icon: RefreshCw,
    bg: "bg-gradient-to-br from-red-500/10 to-red-600/5",
    border: "border-red-500/30",
    iconColor: "text-red-400",
    hover: "hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/20",
  },
  "Take Quiz": {
    icon: Target,
    bg: "bg-gradient-to-br from-violet-500/10 to-violet-600/5",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
    hover: "hover:border-violet-400/60 hover:shadow-lg hover:shadow-violet-500/20",
  },
  "Read Notes": {
    icon: BookOpen,
    bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
    hover: "hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/20",
  },
};

export default function SuggestedNext({ actions = [] }: SuggestedNextProps) {
  const router = useRouter();

  const handleActionClick = (url: string) => {
    router.push(url);
  };

  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2.5">
        Suggested Next
      </h3>

      <div className="space-y-2">
        {actions.slice(0, 2).map((action, idx) => {
          const style = actionStyles[action.title] || actionStyles["Continue Practice"];
          const Icon = style.icon;

          return (
            <button
              key={idx}
              onClick={() => handleActionClick(action.action_url)}
              className={`w-full group p-3 rounded-lg border ${style.bg} ${style.border} ${style.hover} backdrop-blur-sm transition-all duration-300 text-left`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 ${style.iconColor} flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white group-hover:text-white/90 transition-colors">
                      {action.title}
                    </div>
                    <div className="text-[10px] font-medium text-white/80 mt-0.5 truncate">
                      {action.topic}
                    </div>
                    <div className="text-[9px] text-white/45 mt-0.5 leading-snug line-clamp-2">
                      {action.reason}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}