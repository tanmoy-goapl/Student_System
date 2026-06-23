import { ArrowRight, BookOpen, Pen, Circle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Task {
  id: number;
  task_type: string;
  topic: string;
  description: string;
  status: string;
}

export default function TodayMissionCard({ tasks, roadmapTitle, activeWeek }: { tasks: Task[], roadmapTitle: string, activeWeek?: number }) {
  // Use all tasks for the week, sorting chronologically by day number, then learning before quiz
  const todaysTasks = [...tasks].sort((a, b) => {
    const dayA = parseInt(a.topic.match(/Day\\s*(\\d+)/i)?.[1] || "0");
    const dayB = parseInt(b.topic.match(/Day\\s*(\\d+)/i)?.[1] || "0");
    if (dayA !== dayB) return dayA - dayB;
    return a.task_type === "learning" ? -1 : 1;
  });

  return (
    <div className="bg-[#0f172a] rounded-xl border border-white/5 p-6 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full inline-block"></span>
            {activeWeek ? `Week ${activeWeek} Mission` : "Today's Mission"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Goal: {roadmapTitle}</p>
        </div>
        <Link href="/roadmap" className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1 group transition-colors">
          View Roadmap <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="space-y-4 flex-1">
        {todaysTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
            <p>You're all caught up for today!</p>
          </div>
        ) : (
          todaysTasks.map((task) => {
            const isQuiz = task.task_type === "quiz";
            return (
              <Link 
                key={task.id} 
                href={isQuiz ? `/practice?topic=${encodeURIComponent(task.topic)}&source=personal` : `/learning?topic=${encodeURIComponent(task.topic)}&source=personal`}
                className="group flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 transition-colors"
              >
                <div className="mt-1">
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isQuiz ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Pen className="w-3 h-3" /> Quiz
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Learn
                      </span>
                    )}
                    <h3 className="font-bold text-slate-200 group-hover:text-blue-300 transition-colors">{task.topic}</h3>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 self-center transition-opacity">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
