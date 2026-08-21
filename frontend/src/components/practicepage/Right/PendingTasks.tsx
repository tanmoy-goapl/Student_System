import { ArrowRight, ClipboardList, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface PendingTask {
  topic: string;
  subject: string;
  task_type: string;
  task_types: string[];
  reason: string;
  days_since_practice: number;
  priority_score: number;
  action_url: string;
}

interface PendingTasksProps {
  tasks?: PendingTask[];
}

const taskLabels: Record<string, string> = {
  quiz: "Quiz due",
  revision: "Revision due",
  practice: "Practice needed",
  learning: "Learning incomplete",
  overdue: "Overdue",
};

export default function PendingTasks({ tasks = [] }: PendingTasksProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const visibleTasks = showAll ? tasks : tasks.slice(0, 5);

  return (
    <div className="rounded-2xl border border-violet-500/10 bg-[#090B1A] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-rose-400" />
          <h2 className="text-base font-semibold text-white">Pending Tasks</h2>
        </div>
        <span className="text-xs text-white/45">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      <p className="mb-4 text-xs text-white/45">
        Complete any task to reduce your pending dues.
      </p>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-white/60">
          No pending tasks right now.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleTasks.map((task) => (
            <button
              key={task.topic}
              type="button"
              onClick={() => router.push(task.action_url)}
              className="w-full rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors group hover:border-violet-400/40 hover:bg-violet-500/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate group-hover:text-violet-200">
                    {task.topic}
                  </div>
                  <div className="mt-0.5 text-xs text-white/45 truncate">
                    {task.subject} · {taskLabels[task.task_type] || "Action needed"}
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-violet-300 shrink-0 mt-0.5" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="truncate">{task.reason}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {tasks.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-violet-300 transition hover:border-violet-400/35 hover:bg-violet-500/10"
        >
          {showAll ? "Show less" : `View all ${tasks.length} tasks`}
          {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
