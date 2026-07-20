"use client";

import React, { useState } from "react";
import { 
  BarChart3, Users, TrendingUp, Sparkles, Clock, Calendar, 
  ChevronDown, Download, AlertTriangle, CheckCircle, FileText
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";

export default function InsightsPage() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [selectedClass, setSelectedClass] = useState("All Classes");

  const overviewCards = [
    { label: "Avg Class Score", value: "71%", subtitle: "-3% vs last month", icon: TrendingUp, gradient: "from-blue-600 to-indigo-500" },
    { label: "Engagement Rate", value: "78%", subtitle: "+11% this week", icon: CheckCircle, gradient: "from-emerald-500 to-teal-500" },
    { label: "At-Risk Students", value: "8", subtitle: "3% of enrollment", icon: AlertTriangle, gradient: "from-rose-500 to-red-500" },
    { label: "Topic Mastery", value: "67%", subtitle: "Active topics average", icon: BookOpenPlaceholder, gradient: "from-indigo-600 to-purple-600" },
  ];

  const aiInsights = [
    {
      title: "72% Students Struggle with Wave Optics",
      desc: "Enrollment: 45 • Class avg 52% • Below threshold: 14 students",
      badge: "CRITICAL IMPEDIMENT",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      btn1: "Review Practice Set",
      btn2: "Review Weak Students",
      btn3: "Create Revision Quiz",
    },
    {
      title: "Quiz Performance Dropped by 11% This Month",
      desc: "Sign of declining focus across Mathematics and Chemistry topics",
      badge: "PERFORMANCE TREND",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      btn1: "Analyze Pattern",
      btn2: "Adjust Curriculum",
    },
    {
      title: "Practice Quizzes Improved Scores by 14%",
      desc: "Positive correlation between homework completion and exam grades",
      badge: "POSITIVE IMPACT",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      btn1: "Assign More Practice",
      btn2: "View Details",
    },
    {
      title: "Timed Assessments Causing Performance Anxiety",
      desc: "Average score drops 18% on timed tests vs untimed practice",
      badge: "BEHAVIORAL INSIGHT",
      badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      btn1: "Adjust Time Settings",
      btn2: "Create Untimed Practice",
    },
  ];

  const physicsTopics = [
    { name: "Mechanics", score: 84, status: "GOOD" },
    { name: "Thermodynamics", score: 52, status: "WEAK" },
    { name: "Wave Optics", score: 48, status: "WEAK" },
    { name: "Electricity", score: 70, status: "AVERAGE" },
    { name: "Quantum", score: 61, status: "AVERAGE" },
  ];

  const mathTopics = [
    { name: "Algebra", score: 78, status: "AVERAGE" },
    { name: "Calculus", score: 54, status: "WEAK" },
    { name: "Integration", score: 48, status: "WEAK" },
    { name: "Probability", score: 65, status: "AVERAGE" },
    { name: "Statistics", score: 73, status: "AVERAGE" },
  ];

  const riskColumns = {
    high: {
      title: "High Risk",
      count: "3 students",
      color: "text-rose-400",
      bg: "bg-rose-500/5 border-rose-500/10",
      btn: "Create Support Plans",
      btnColor: "bg-rose-600 hover:bg-rose-700",
      students: [
        { name: "Sofia Reyes", score: 48, avatarBg: "from-rose-500 to-red-650" },
        { name: "Liam Park", score: 51, avatarBg: "from-rose-500 to-red-650" },
        { name: "Marcus Torres", score: 53, avatarBg: "from-rose-500 to-red-650" },
      ],
    },
    medium: {
      title: "Medium Risk",
      count: "3 students",
      color: "text-amber-400",
      bg: "bg-amber-500/5 border-amber-500/10",
      btn: "Assign Practice Sets",
      btnColor: "bg-amber-600/30 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20",
      students: [
        { name: "Omar Sheikh", score: 61, avatarBg: "from-amber-500 to-orange-600" },
        { name: "Rachel Johnson", score: 63, avatarBg: "from-amber-500 to-orange-600" },
        { name: "Aisha Khan", score: 65, avatarBg: "from-amber-500 to-orange-600" },
      ],
    },
    improving: {
      title: "Improving",
      count: "3 students",
      color: "text-emerald-400",
      bg: "bg-emerald-500/5 border-emerald-500/10",
      btn: "Assign Advanced Content",
      btnColor: "bg-emerald-650/30 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20",
      students: [
        { name: "Abir Miah", score: 94, avatarBg: "from-emerald-500 to-teal-600" },
        { name: "Rachel Johnson", score: 91, avatarBg: "from-emerald-500 to-teal-600" },
        { name: "David Chen", score: 87, avatarBg: "from-emerald-500 to-teal-600" },
      ],
    },
  };

  const engagementMetrics = [
    { label: "Attendance", value: "88%", color: "text-blue-400", bg: "bg-blue-500" },
    { label: "Quiz Participation", value: "76%", color: "text-purple-400", bg: "bg-purple-500" },
    { label: "Revision Consistency", value: "54%", color: "text-amber-400", bg: "bg-amber-500" },
    { label: "Content Interaction", value: "83%", color: "text-emerald-400", bg: "bg-emerald-500" },
  ];

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Insights</h1>
            <p className="text-[10px] text-slate-400">Analyze class-wide performance and learning outcomes</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Last 30 Days */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>{timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* All Classes Selector */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>{selectedClass}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Export Insights */}
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition">
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Export Insights</span>
            </button>

            {/* Generate Report */}
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <FileText className="w-3.5 h-3.5 text-white" />
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
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Insights Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Insights</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4 Turbo
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {aiInsights.map((rec, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[160px] backdrop-blur-sm hover:border-white/10 transition">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 text-[7px] font-extrabold tracking-wider rounded border ${rec.badgeColor}`}>
                        {rec.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{rec.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{rec.desc}</p>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-white/5 mt-3">
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {rec.btn1}
                    </button>
                    {rec.btn2 && (
                      <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                        {rec.btn2}
                      </button>
                    )}
                    {rec.btn3 && (
                      <button className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition">
                        {rec.btn3}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Mastery Analysis */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Topic Mastery Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Physics */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-slate-300">Physics - Grade 12</h3>
                  <span className="text-[10px] text-emerald-400 font-semibold">78% Avg</span>
                </div>
                <div className="space-y-3">
                  {physicsTopics.map((top, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-300">
                        <span>{top.name}</span>
                        <span className={top.status === "WEAK" ? "text-rose-400" : top.status === "GOOD" ? "text-emerald-400" : "text-slate-400"}>
                          {top.score}% {top.status}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            top.status === "WEAK" ? "bg-gradient-to-r from-red-500 to-rose-500" : 
                            top.status === "GOOD" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : 
                            "bg-gradient-to-r from-blue-500 to-indigo-500"
                          }`} 
                          style={{ width: `${top.score}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mathematics */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-slate-300">Mathematics - Grade 12</h3>
                  <span className="text-[10px] text-amber-400 font-semibold">68% Avg</span>
                </div>
                <div className="space-y-3">
                  {mathTopics.map((top, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-300">
                        <span>{top.name}</span>
                        <span className={top.status === "WEAK" ? "text-rose-400" : top.status === "GOOD" ? "text-emerald-400" : "text-slate-400"}>
                          {top.score}% {top.status}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            top.status === "WEAK" ? "bg-gradient-to-r from-red-500 to-rose-500" : 
                            top.status === "GOOD" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : 
                            "bg-gradient-to-r from-blue-500 to-indigo-500"
                          }`} 
                          style={{ width: `${top.score}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Student Risk Analysis Columns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Risk Analysis</h2>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                AI Categorized
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.values(riskColumns).map((col, idx) => (
                <div key={idx} className={`rounded-2xl border p-5 space-y-4 flex flex-col justify-between ${col.bg}`}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className={`text-xs font-bold ${col.color}`}>{col.title}</h3>
                      <span className="text-[9px] text-slate-500 font-semibold">{col.count}</span>
                    </div>
                    <div className="space-y-2">
                      {col.students.map((st, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5 hover:border-white/10 transition">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[8px] font-bold text-white">
                              {st.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="text-[10px] text-slate-200 font-semibold">{st.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${col.color}`}>{st.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white transition mt-4 shadow-md ${col.btnColor}`}>
                    {col.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Analytics */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Engagement Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {engagementMetrics.map((met, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm hover:border-white/10 transition flex flex-col justify-between min-h-[110px]">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">{met.label}</span>
                    <h3 className={`text-2xl font-extrabold mt-1 ${met.color}`}>{met.value}</h3>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${met.bg}`} style={{ width: met.value }} />
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

// Fallback stub for missing import
function BookOpenPlaceholder(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
