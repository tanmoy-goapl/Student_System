"use client";

import React, { useState } from "react";
import { 
  Briefcase, Calendar, Download, Sparkles, TrendingUp, 
  Users, BookOpen, AlertTriangle, Play, HelpCircle, FileText, CheckCircle
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

export default function PlacementsPage() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [simulatorValue, setSimulatorValue] = useState(25);
  const [selectedScenario, setSelectedScenario] = useState("interviews");

  const overviewCards = [
    { label: "Placement Readiness", value: "68%", subtitle: "Across final-year students", icon: BookOpen, gradient: "from-blue-600 to-indigo-500", progress: "+4%" },
    { label: "Resume Quality", value: "61%", subtitle: "Average score vs benchmark", icon: FileText, gradient: "from-amber-500 to-orange-500", progress: "-2%" },
    { label: "Interview Readiness", value: "54%", subtitle: "Based on mock performance", icon: Users, gradient: "from-purple-600 to-violet-650", progress: "-3%" },
    { label: "Active Recruiters", value: "24", subtitle: "Actively hiring this month", icon: Briefcase, gradient: "from-emerald-500 to-teal-500", progress: "+1" },
  ];

  const placementInsights = [
    {
      title: "Resume Quality Below Benchmark",
      desc: "Average ATS score: 58/100. Need revision across CS & Math majors.",
      badge: "ATS CONCERN",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      btn1: "Review Students",
      btn2: "Generate Plan",
    },
    {
      title: "Mock Interview Performance Dropped",
      desc: "Communication scores dropped 11% this cycle. Action required.",
      badge: "INTERVIEW TREND",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      btn1: "View Patterns",
      btn2: "Notify Faculty",
    },
    {
      title: "AI Practice Improved Readiness",
      desc: "Students practicing 5+ times showed 18% improvement.",
      badge: "AI OUTCOME",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      btn1: "Assign Practice",
      btn2: "View Dashboard",
    },
    {
      title: "High-Demand Skills Missing",
      desc: "SQL, System Design, and Communication absent in 40% of profiles.",
      badge: "SKILL GAP",
      badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      btn1: "View Curriculum",
      btn2: "Add Workshops",
    },
  ];

  const skillGaps = [
    { name: "System Design", score: 68 },
    { name: "SQL & Databases", score: 79 },
    { name: "Communication", score: 62 },
    { name: "DSA Advanced", score: 84 },
    { name: "Cloud Basics", score: 56 },
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
            <h1 className="text-sm font-bold text-white leading-tight">Placements</h1>
            <p className="text-[10px] text-slate-400">Career readiness metrics and recruitment insights</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Last 30 Days */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>{timeRange}</span>
              <Calendar className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Export */}
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <Download className="w-3.5 h-3.5 text-slate-350" />
              <span>Export Analytics</span>
            </button>

            {/* Generate Report */}
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <Briefcase className="w-3.5 h-3.5 text-white" />
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

          {/* AI Placement Insights */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Placement Insights</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {placementInsights.map((insight, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[160px] backdrop-blur-sm hover:border-white/10 transition">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 text-[7px] font-extrabold tracking-wider rounded border ${insight.badgeColor}`}>
                        {insight.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{insight.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{insight.desc}</p>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-white/5 mt-3">
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {insight.btn1}
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition">
                      {insight.btn2}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Placement Readiness */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Department Placement Readiness</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Computer Science", enrolled: 120, ready: "78%", placement: "72%" },
                { name: "Physics", enrolled: 80, ready: "66%", placement: "60%" },
                { name: "Mathematics", enrolled: 100, ready: "61%", placement: "54%" },
                { name: "Chemistry", enrolled: 90, ready: "70%", placement: "65%" },
              ].map((dept, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4 hover:border-white/10 transition">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{dept.name}</h3>
                    <span className="text-[8px] text-slate-500 font-bold block mt-0.5">Enrolled: {dept.enrolled} final-years</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Ready</span>
                      <span className="text-sm font-extrabold text-emerald-400 mt-1 block">{dept.ready}</span>
                    </div>
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Placed</span>
                      <span className="text-sm font-extrabold text-white mt-1 block">{dept.placement}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Risk & Skill Gap Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Student Risk Analysis */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-white/5 pb-2">Student Risk Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 text-center space-y-2">
                  <span className="text-xl font-extrabold text-rose-400">42</span>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">High Risk</span>
                  <button className="w-full py-1 rounded bg-rose-600 hover:bg-rose-700 text-[8px] font-bold uppercase text-white transition">Intervene</button>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-center space-y-2">
                  <span className="text-xl font-extrabold text-amber-400">118</span>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Needs Prep</span>
                  <button className="w-full py-1 rounded bg-amber-600/30 border border-amber-500/20 text-amber-300 hover:bg-amber-550/30 text-[8px] font-bold uppercase transition">Assign Training</button>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-center space-y-2">
                  <span className="text-xl font-extrabold text-emerald-400">318</span>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Ready</span>
                  <button className="w-full py-1 rounded bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-550/30 text-[8px] font-bold uppercase transition">Export List</button>
                </div>
              </div>
            </div>

            {/* Skill Gap Analysis */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-white/5 pb-2">Skill Gap Analysis</h3>
              <div className="space-y-3">
                {skillGaps.map((skill, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-300">
                      <span>{skill.name}</span>
                      <span>{skill.score}% Coverage</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${skill.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* AI What-If Simulator */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-4.5 h-4.5 text-violet-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">AI What-If Simulator (Recruitment)</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-5">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select placement scenarios</span>
                  <div className="space-y-2">
                    {[
                      { id: "interviews", label: "If mock placement interviews are increased to 3 rounds/month" },
                      { id: "resume", label: "If resume builder AI validation is made mandatory for final-years" },
                    ].map(sc => (
                      <label key={sc.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/25 cursor-pointer hover:border-white/10 transition">
                        <input
                          type="radio"
                          name="placement_scenario"
                          checked={selectedScenario === sc.id}
                          onChange={() => setSelectedScenario(sc.id)}
                          className="accent-violet-500 h-3.5 w-3.5"
                        />
                        <span className="text-xs font-semibold text-slate-200">{sc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold transition shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 text-white" />
                  <span>Run Placements Projection</span>
                </button>
              </div>

              {/* Outcomes */}
              <div className="rounded-xl border border-white/5 bg-black/25 p-5 space-y-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">AI Predicted Outcomes</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Placement Rate</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">+12%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Interview Success</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">+11%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
