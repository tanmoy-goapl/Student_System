"use client";

import { PROFESSOR_DATA } from "@/constants/chat-sidebar-data";
import StatCard from "../StatCard";
import MiniBarChart from "../MiniBarChart";
import AlertItem from "../AlertItem";
import QuickActionItem from "../QuickActionItem";
import AIConfig from "../AIConfig";



export default function ProfessorPanel() {
  const d = PROFESSOR_DATA;

  return (
    <div className="space-y-4">
      {/* Class stats */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Class Overview</p>
        <div className="grid grid-cols-2 gap-2">
          {d.stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} up={s.up} />
          ))}
        </div>
      </div>

      {/* Topic scores */}
      <div className="bg-white/5 border border-white/8 rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white">Topic Scores</span>
          <span className="text-[10px] text-white/40">Class avg</span>
        </div>
        <MiniBarChart type="topic" bars={d.topicScores} classAvg={d.classAvg} />
      </div>

      {/* Student spotlight */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">⭐ Student Spotlight</p>
          <button className="text-[10px] text-blue-400 hover:text-blue-300">View all</button>
        </div>
        <div className="space-y-1.5">
          {d.spotlight.map((s) => (
            <div key={s.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <div className="w-6 h-6 rounded-full bg-indigo-500/40 text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                {s.initial}
              </div>
              <span className="flex-1 text-xs text-white">{s.name}</span>
              <span className={`text-xs font-semibold ${s.up === true ? "text-emerald-400" : s.up === false ? "text-red-400" : "text-white/70"}`}>
                {s.up === true ? "↗ " : s.up === false ? "↘ " : ""}{s.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">🛡 Alerts</p>
        <div className="space-y-1.5">
          {d.alerts.map((a, i) => (
            <AlertItem key={i} level={a.level as any} message={a.message} affected={a.affected} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="space-y-1.5">
          {d.quickActions.map((q) => <QuickActionItem key={q} label={q} />)}
        </div>
      </div>

      <AIConfig entries={d.aiConfig} />
    </div>
  );
}