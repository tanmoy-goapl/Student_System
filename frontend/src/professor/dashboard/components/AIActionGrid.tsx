"use client";

import React from "react";
import { 
  BookOpen, ClipboardCheck, CheckCircle2, FileText, Lightbulb, GraduationCap, Sparkles
} from "lucide-react";

interface ActionItem {
  title: string;
  description: string;
  icon: any;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  notificationCount?: number;
}

export default function AIActionGrid() {
  const actions: ActionItem[] = [
    {
      title: "Generate Lesson",
      description: "Create AI-powered lesson plans from your curriculum",
      icon: BookOpen,
      badge: "LESSON PLAN",
      badgeColor: "text-blue-400",
      badgeBg: "bg-blue-500/10",
      badgeBorder: "border-blue-500/20",
    },
    {
      title: "Create Quiz",
      description: "Auto-generate questions from topic or documents",
      icon: ClipboardCheck,
      badge: "ASSESSMENT",
      badgeColor: "text-purple-400",
      badgeBg: "bg-purple-500/10",
      badgeBorder: "border-purple-500/20",
    },
    {
      title: "Review Submissions",
      description: "AI-graded with detailed feedback per student",
      icon: CheckCircle2,
      badge: "GRADING",
      badgeColor: "text-emerald-400",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/20",
      notificationCount: 2,
    },
    {
      title: "Generate Revision Notes",
      description: "Concise topic summaries for student revision",
      icon: FileText,
      badge: "CONTENT",
      badgeColor: "text-amber-400",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/20",
    },
    {
      title: "Simplify Topic",
      description: "Break down complex concepts into easy explanations",
      icon: Lightbulb,
      badge: "EXPLAIN",
      badgeColor: "text-cyan-400",
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-500/20",
    },
    {
      title: "Create Practice Set",
      description: "Structured problem sets matched to learning gaps",
      icon: GraduationCap,
      badge: "PRACTICE",
      badgeColor: "text-indigo-400",
      badgeBg: "bg-indigo-500/10",
      badgeBorder: "border-indigo-500/20",
    },
  ];

  return (
    <section className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">AI Actions</h2>
        <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
          <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4 Turbo
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-5 backdrop-blur-xl group transition-all duration-300 hover:scale-[1.01] hover:border-blue-500/30 hover:bg-slate-900/40 cursor-pointer flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-blue-500/30 group-hover:text-blue-400 transition shrink-0">
                  <Icon className="h-4.5 w-4.5 text-slate-300 group-hover:text-blue-400 transition" />
                </div>
                {act.notificationCount && (
                  <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[#090b1f] shadow-lg animate-pulse">
                    {act.notificationCount}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-white mb-1 group-hover:text-blue-400 transition">
                  {act.title}
                </h3>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                  {act.description}
                </p>
              </div>

              <div>
                <span className={`inline-block px-2 py-0.5 text-[8px] font-extrabold tracking-wider rounded-md border ${act.badgeBg} ${act.badgeColor} ${act.badgeBorder}`}>
                  {act.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
