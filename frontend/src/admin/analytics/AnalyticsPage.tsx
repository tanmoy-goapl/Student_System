"use client";

import React, { useState } from "react";
import { 
  BarChart3, Calendar, Download, Sparkles, TrendingUp, 
  Users, BookOpen, AlertTriangle, Play, HelpCircle
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [simulatorValue, setSimulatorValue] = useState(20);
  const [selectedScenario, setSelectedScenario] = useState("participation");

  const overviewCards = [
    { label: "Student Performance", value: "71%", subtitle: "Average of 10 departments", icon: TrendingUp, gradient: "from-blue-600 to-indigo-500", progress: "-3%" },
    { label: "Placement Readiness", value: "68%", subtitle: "+4% vs last semester", icon: BookOpen, gradient: "from-emerald-500 to-teal-500", progress: "+4%" },
    { label: "Faculty Effectiveness", value: "84%", subtitle: "142 faculty • 8 depts", icon: Users, gradient: "from-indigo-600 to-purple-600", progress: "+1%" },
    { label: "Engagement Trend", value: "72%", subtitle: "Weekly active users", icon: AlertTriangle, gradient: "from-rose-500 to-red-500", progress: "-5%" },
  ];

  const executiveInsights = [
    {
      title: "Physics Department Performance Dropped by 9%",
      reason: "Post-midterm assessment scores fell significantly. Offset gains in other courses.",
      affected: "412 Students",
      score: "64% Avg Score",
      btn1: "View Course",
      btn2: "Notify Faculty",
      btn3: "Generate Plan",
    },
    {
      title: "42 Students Identified as High Academic Risk",
      reason: "Attendance dropped below 60% with coinciding drop in quiz scores.",
      affected: "42 High Risk",
      score: "80% Growth Lead",
      btn1: "Review Students",
      btn2: "Contact Support",
      btn3: "Notify Faculty",
    },
    {
      title: "Placement Readiness Improved After Mock Interviews",
      reason: "Confidence scores rose by 14% across CS majors after mock session.",
      affected: "318 Students Ready",
      score: "88% Target Score",
      btn1: "Expand Workshops",
      btn2: "View Placements",
    },
    {
      title: "Engagement Decreased in Grade 11",
      reason: "Average daily active hours dropped by 18 mins over 2 weeks.",
      affected: "62% Engagement",
      score: "-8% Change",
      btn1: "View Analytics",
      btn2: "Notify Faculty",
      btn3: "Create Plan",
    },
  ];

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Analytics</h1>
            <p className="text-[10px] text-slate-400">Institution-wide academic intelligence and trends</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Last 30 Days */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>{timeRange}</span>
              <Calendar className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Export Analytics */}
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <Download className="w-3.5 h-3.5 text-slate-350" />
              <span>Export Analytics</span>
            </button>

            {/* Generate Report */}
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
              <span>Generate Report</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl hover:border-white/10 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-3xl font-extrabold text-white">{card.value}</span>
                      <p className="text-xs font-bold text-slate-300 mt-1">{card.label}</p>
                      <p className="text-[9px] text-slate-400/80 mt-0.5">{card.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className={`text-[10px] font-bold ${card.progress.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
                        {card.progress}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Executive Insights */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Executive AI Insights</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4 Turbo
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {executiveInsights.map((insight, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[185px] backdrop-blur-sm hover:border-white/10 transition">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white leading-snug">{insight.title}</h4>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      💡 <strong>Reasoning:</strong> {insight.reason}
                    </p>
                    <div className="flex gap-4 text-[9px] text-slate-500 font-bold pt-1">
                      <span>AFFECTED: <span className="text-slate-350">{insight.affected}</span></span>
                      <span>METRIC: <span className="text-violet-400">{insight.score}</span></span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {insight.btn1}
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {insight.btn2}
                    </button>
                    {insight.btn3 && (
                      <button className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition">
                        {insight.btn3}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI What-If Simulator */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-4.5 h-4.5 text-violet-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">AI What-If Simulator</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-5">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select scenario parameters</span>
                  <div className="space-y-2">
                    {[
                      { id: "participation", label: "If practice participation increases by" },
                      { id: "mentorship", label: "If mock interview prep is made mandatory" },
                      { id: "curriculum", label: "If faculty assessment response turnaround improves by 3 days" },
                    ].map(sc => (
                      <label key={sc.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/25 cursor-pointer hover:border-white/10 transition">
                        <input
                          type="radio"
                          name="scenario"
                          checked={selectedScenario === sc.id}
                          onChange={() => setSelectedScenario(sc.id)}
                          className="accent-violet-500 h-3.5 w-3.5"
                        />
                        <span className="text-xs font-semibold text-slate-200">{sc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-350">
                    <span>ADJUSTMENT MAGNITUDE</span>
                    <span className="text-violet-400">{simulatorValue}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={simulatorValue}
                    onChange={e => setSimulatorValue(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">
                    <span>Moderate</span>
                    <span>High Impact</span>
                  </div>
                </div>

                <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold transition shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 text-white" />
                  <span>Run Simulator Projection</span>
                </button>
              </div>

              {/* Projections Output */}
              <div className="rounded-xl border border-white/5 bg-black/25 p-5 space-y-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">AI Predicted Outcomes</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Placement Readiness</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">+9%</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Target: 77%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Engagement Rate</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">+7%</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Target: 79%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Academic Score</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">+5%</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Target: 76%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Dropout Risk</span>
                    <span className="text-2xl font-extrabold text-rose-400 mt-2 block">-18%</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">24 students saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Department Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Computer Science", performance: "74%", placement: "72%", status: "ACTIVE" },
                { name: "Physics", performance: "71%", placement: "66%", status: "STABLE" },
                { name: "Mathematics", performance: "68%", placement: "61%", status: "NEEDS ATTENTION" },
                { name: "Chemistry", performance: "79%", placement: "70%", status: "STABLE" },
              ].map((dept, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4 hover:border-white/10 transition">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-200">{dept.name}</h3>
                    <span className={`px-1.5 py-0.5 text-[7px] font-extrabold rounded border ${
                      dept.status === "ACTIVE" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
                      dept.status === "NEEDS ATTENTION" ? "text-rose-400 border-rose-500/20 bg-rose-500/10" :
                      "text-slate-400 border-white/5 bg-white/5"
                    }`}>{dept.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Academic</span>
                      <span className="text-sm font-extrabold text-white mt-1 block">{dept.performance}</span>
                    </div>
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Placement</span>
                      <span className="text-sm font-extrabold text-white mt-1 block">{dept.placement}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
