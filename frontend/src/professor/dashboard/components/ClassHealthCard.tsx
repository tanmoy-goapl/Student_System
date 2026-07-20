"use client";

import React from "react";
import { TrendingUp, Users, AlertTriangle, BookOpen, Lightbulb, Sparkles } from "lucide-react";
import KPICard from "./KPICard";

export default function ClassHealthCard() {
  return (
    <section className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Class Health</h2>
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            AI Powered
          </span>
        </div>
        <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
          View Details &rarr;
        </button>
      </div>

      {/* Grid of 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Score */}
        <KPICard
          label="Average Score"
          value="71%"
          gradient="from-blue-600 to-indigo-500"
          icon={TrendingUp}
          subtitle="-3% vs last week"
          trend={{ value: "↘ 3%", isPositive: false }}
        >
          {/* Mini Bar Chart */}
          <div className="flex items-end gap-1.5 h-6 mt-1.5">
            {[40, 55, 45, 60, 52, 70, 71].map((val, i) => (
              <div
                key={i}
                className={`w-full rounded-sm transition-all duration-300 ${
                  i === 6 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-white/10"
                }`}
                style={{ height: `${val}%` }}
              />
            ))}
          </div>
        </KPICard>

        {/* Card 2: Engagement */}
        <KPICard
          label="Engagement"
          value="84%"
          gradient="from-emerald-500 to-teal-500"
          icon={Users}
          subtitle="+5% this week"
          trend={{ value: "↗ 5%", isPositive: true }}
        >
          {/* Mini Radial Ring */}
          <div className="flex justify-start items-center h-6 mt-1.5 pl-1">
            <svg className="w-6 h-6 transform -rotate-90">
              <circle
                cx="12"
                cy="12"
                r="9"
                className="stroke-white/10"
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                className="stroke-emerald-400"
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={56.5}
                strokeDashoffset={56.5 * (1 - 0.84)}
              />
            </svg>
            <span className="text-[10px] text-slate-400 font-semibold ml-2">84% active</span>
          </div>
        </KPICard>

        {/* Card 3: At-Risk Students */}
        <KPICard
          label="At-Risk Students"
          value="5"
          gradient="from-rose-500 to-red-500"
          icon={AlertTriangle}
          subtitle="Need immediate attention"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-rose-400/90 font-medium mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Critical performance drops</span>
          </div>
        </KPICard>

        {/* Card 4: Weak Topics */}
        <KPICard
          label="Weak Topics"
          value="3"
          gradient="from-amber-500 to-orange-500"
          icon={BookOpen}
          subtitle="Topics below 60% avg"
        >
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold">
              Wave Optics
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-bold">
              Quantum
            </span>
          </div>
        </KPICard>
      </div>

      {/* AI Health Insights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-3 text-blue-200">
          <Lightbulb className="w-4 h-4 text-blue-400 shrink-0" />
          <p>
            Physics Grade 12 overall scores improved by <span className="text-white font-bold">8% this week</span>
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3 text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <p>
            Engagement dropped significantly in <span className="text-white font-bold">Chemistry Grade 11</span> labs
          </p>
        </div>
      </div>
    </section>
  );
}
