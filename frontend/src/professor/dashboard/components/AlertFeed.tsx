"use client";

import React from "react";
import { AlertTriangle, TrendingDown, BookOpen, Clock } from "lucide-react";

export default function AlertFeed() {
  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const atRiskStudents = [
    "Aisha Khan",
    "Marcus Torres",
    "Sofia Reyes",
    "Liam Park",
    "Rachel Johnson"
  ];

  return (
    <section className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Student Alerts</h2>
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
            4 Active Alerts
          </span>
        </div>
        <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
          View All Students &rarr;
        </button>
      </div>

      {/* Alert Rows Stack */}
      <div className="space-y-3">
        {/* Alert 1: 5 Students at Risk */}
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">5 Students at Risk</h3>
              <p className="text-[10px] text-slate-400">
                Low scores + declining engagement over 7 consecutive days
              </p>
              {/* Student Avatars Row */}
              <div className="flex items-center gap-1.5 pt-2">
                {atRiskStudents.map((st, idx) => (
                  <div
                    key={idx}
                    title={st}
                    className="h-6 w-6 rounded-full border border-slate-900 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[8px] font-bold text-white shadow-md cursor-pointer hover:scale-115 transition-all"
                  >
                    {getAvatarInitials(st)}
                  </div>
                ))}
                <span className="text-[9px] text-slate-500 font-semibold pl-1">+2 others</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-wider uppercase transition">
              Review Students
            </button>
            <button className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[10px] font-bold tracking-wider uppercase text-white shadow-md transition">
              Generate Revision Quiz
            </button>
          </div>
        </div>

        {/* Alert 2: Deadlock Avoidance Poorly Understood */}
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <TrendingDown className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-1.5 w-full">
              <h3 className="text-xs font-bold text-white">Deadlock Avoidance Poorly Understood</h3>
              <p className="text-[10px] text-slate-400">
                Class average 52% — 14 students performing significantly below threshold
              </p>
              {/* Progress Bar */}
              <div className="max-w-xs space-y-1">
                <div className="flex justify-between text-[8px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Topic Mastery</span>
                  <span className="text-amber-400">52%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full" style={{ width: "52%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-wider uppercase transition">
              View Topic
            </button>
            <button className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[10px] font-bold tracking-wider uppercase text-amber-400 transition">
              Generate Revision Notes
            </button>
          </div>
        </div>

        {/* Alert 3: DBMS normalization accuracy dropped */}
        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">DBMS Normalization Accuracy Dropped</h3>
              <p className="text-[10px] text-slate-400">
                62% current submission rate — significantly down from 88% average last week
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-wider uppercase transition">
              View Assignment
            </button>
            <button className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[10px] font-bold tracking-wider uppercase text-white shadow-md transition">
              Notify Class
            </button>
          </div>
        </div>

        {/* Alert 4: 3 Students Inactive */}
        <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
              <Clock className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">3 Students Inactive for 5+ Days</h3>
              <p className="text-[10px] text-slate-400">
                No login or activity recorded this week across any assigned materials
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-wider uppercase transition">
              Review Students
            </button>
            <button className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-[10px] font-bold tracking-wider uppercase text-white shadow-md transition">
              Send Reminder
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
