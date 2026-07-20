"use client";

import React, { useState } from "react";
import { 
  Users, AlertTriangle, TrendingUp, CheckCircle, Search, 
  ChevronDown, UserPlus, FileText, Bell, Send, Compass
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";

interface StudentCardData {
  id: string;
  name: string;
  rollNumber: string;
  cgpa: string;
  performance: number;
  engagement: number;
  attendance: number;
  badge: "TOP PERFORMER" | "NEEDS ATTENTION" | "AT RISK" | "INACTIVE";
  badgeColor: string;
  badgeBg: string;
  note: string;
  avatarBg: string;
}

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "at-risk" | "inactive" | "top">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const summaryCards = [
    {
      label: "Total Students",
      value: "136",
      subtitle: "45 Physics • 39 Chem • 52 Math",
      icon: Users,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "At-Risk Students",
      value: "8",
      subtitle: "6% of total enrollment (+3% vs last week)",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
    },
    {
      label: "Avg Performance",
      value: "68%",
      subtitle: "-2% this week",
      icon: TrendingUp,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "High Engagement",
      value: "73%",
      subtitle: "99 of 136 students",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  const alerts = [
    {
      type: "Topic Alert",
      text: "5 Students Struggling in Thermodynamics",
      btn1: "Review Students",
      btn2: "Generate Practice Set",
      border: "border-amber-500/20 bg-amber-500/[0.02] text-amber-300",
    },
    {
      type: "Inactivity Alert",
      text: "3 Students Inactive for 7+ Days",
      btn1: "Send Reminder",
      btn2: "View Profiles",
      border: "border-rose-500/20 bg-rose-500/[0.02] text-rose-300",
    },
    {
      type: "Completion Alert",
      text: "Assignment Completion Dropped to 62%",
      btn1: "Notify Students",
      btn2: "View Assignment",
      border: "border-blue-500/20 bg-blue-500/[0.02] text-blue-300",
    },
  ];

  const students: StudentCardData[] = [
    {
      id: "1",
      name: "Aisha Khan",
      rollNumber: "22CSE1001",
      cgpa: "9.4",
      performance: 94,
      engagement: 88,
      attendance: 96,
      badge: "TOP PERFORMER",
      badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      badgeBg: "bg-emerald-400",
      note: "Ready for advanced problem set. Keep up the good work!",
      avatarBg: "from-emerald-500 to-teal-600",
    },
    {
      id: "2",
      name: "Marcus Torres",
      rollNumber: "22CSE1002",
      cgpa: "7.2",
      performance: 58,
      engagement: 61,
      attendance: 82,
      badge: "NEEDS ATTENTION",
      badgeColor: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      badgeBg: "bg-amber-400",
      note: "Needs assistance with calculus. Suggest remedial material.",
      avatarBg: "from-amber-500 to-orange-600",
    },
    {
      id: "3",
      name: "Sofia Reyes",
      rollNumber: "22CSE1003",
      cgpa: "5.4",
      performance: 48,
      engagement: 52,
      attendance: 74,
      badge: "AT RISK",
      badgeColor: "text-rose-400 border-rose-500/20 bg-rose-500/10",
      badgeBg: "bg-rose-400",
      note: "Critical drop in scores. Immediate intervention required.",
      avatarBg: "from-rose-500 to-red-650",
    },
    {
      id: "4",
      name: "Liam Park",
      rollNumber: "22CSE1004",
      cgpa: "6.5",
      performance: 63,
      engagement: 34,
      attendance: 71,
      badge: "INACTIVE",
      badgeColor: "text-slate-400 border-slate-500/20 bg-slate-500/10",
      badgeBg: "bg-slate-400",
      note: "Inactive for 5+ days. Send reminder nudge.",
      avatarBg: "from-slate-500 to-slate-700",
    },
    {
      id: "5",
      name: "Rachel Johnson",
      rollNumber: "22CSE1005",
      cgpa: "9.1",
      performance: 91,
      engagement: 95,
      attendance: 99,
      badge: "TOP PERFORMER",
      badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      badgeBg: "bg-emerald-400",
      note: "Excellent consistent performer on OS & DBMS assignments.",
      avatarBg: "from-emerald-500 to-teal-600",
    },
    {
      id: "6",
      name: "Omar Sheikh",
      rollNumber: "22CSE1006",
      cgpa: "6.8",
      performance: 61,
      engagement: 67,
      attendance: 80,
      badge: "NEEDS ATTENTION",
      badgeColor: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      badgeBg: "bg-amber-400",
      note: "Showing downward trend in recent test. Guide on databases.",
      avatarBg: "from-amber-500 to-orange-600",
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.rollNumber.includes(searchQuery);
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "at-risk") return matchesSearch && st.badge === "AT RISK";
    if (activeTab === "inactive") return matchesSearch && st.badge === "INACTIVE";
    if (activeTab === "top") return matchesSearch && st.badge === "TOP PERFORMER";
    return matchesSearch;
  });

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Students</h1>
            <p className="text-[10px] text-slate-400">Mentor student performance and engagement</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 w-44"
              />
            </div>

            {/* Class Dropdown */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>All Classes</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Import Students */}
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition">
              <UserPlus className="w-3.5 h-3.5 text-slate-300" />
              <span>Import Students</span>
            </button>

            {/* Generate Report */}
            <button className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Generate Report</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card, idx) => {
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

          {/* AI Alerts Column Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Alerts</h2>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                3 Active
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {alerts.map((al, idx) => (
                <div key={idx} className={`rounded-xl border p-4 flex flex-col justify-between min-h-[110px] ${al.border}`}>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-60">{al.type}</span>
                    <p className="text-[11px] font-bold text-white mt-1 leading-snug">{al.text}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <button className="text-[9px] font-bold tracking-wider uppercase text-white/50 hover:text-white transition">
                      {al.btn1}
                    </button>
                    <span className="text-white/10">|</span>
                    <button className="text-[9px] font-bold tracking-wider uppercase text-blue-400 hover:text-blue-300 transition">
                      {al.btn2}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Students Grid Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Students</h2>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  AI Monitored
                </span>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                  { id: "all", label: `All (${students.length})` },
                  { id: "at-risk", label: "At-Risk (1)" },
                  { id: "inactive", label: "Inactive (1)" },
                  { id: "top", label: "Top Performers (2)" },
                ].map(tb => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      activeTab === tb.id ? "bg-blue-500 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(st => (
                <div key={st.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[220px] backdrop-blur-sm group hover:border-blue-500/30 hover:bg-slate-900/60 transition duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${st.avatarBg} flex items-center justify-center text-xs font-bold`}>
                          {getInitials(st.name)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{st.name}</h4>
                          <p className="text-[9px] text-slate-400 font-medium">Roll: {st.rollNumber} • CGPA: {st.cgpa}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] font-extrabold tracking-wider rounded border ${st.badgeColor}`}>
                        {st.badge}
                      </span>
                    </div>

                    {/* Stats Metrics Row */}
                    <div className="grid grid-cols-3 gap-1 text-center py-2.5 border-y border-white/5">
                      <div className="bg-black/20 rounded py-1 border border-white/5">
                        <p className="text-xs font-bold text-white">{st.performance}%</p>
                        <p className="text-[7px] uppercase tracking-widest text-slate-500">Perf</p>
                      </div>
                      <div className="bg-black/20 rounded py-1 border border-white/5">
                        <p className="text-xs font-bold text-blue-400">{st.engagement}%</p>
                        <p className="text-[7px] uppercase tracking-widest text-slate-500">Eng</p>
                      </div>
                      <div className="bg-black/20 rounded py-1 border border-white/5">
                        <p className="text-xs font-bold text-teal-400">{st.attendance}%</p>
                        <p className="text-[7px] uppercase tracking-widest text-slate-500">Attd</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-300 italic min-h-[30px] leading-relaxed">
                      💡 {st.note}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      View Profile
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition shadow shadow-blue-500/10">
                      Assign Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Segmentation Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Segmentation</h2>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                AI Grouped
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* High Performers */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-emerald-400">High Performers</h3>
                    <span className="text-[10px] text-slate-500 font-semibold">24 Students</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">90%+ scores with consistent engagement</p>
                  {/* Avatars */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {["AK", "RJ", "SK", "LP"].map((av, idx) => (
                      <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                        {av}
                      </div>
                    ))}
                    <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                      +20
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">💡 Assign advanced quizzes to maintain momentum</p>
                </div>
                <button className="w-full py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition mt-2">
                  Assign Advanced Quizzes
                </button>
              </div>

              {/* Needs Attention */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-amber-400">Needs Attention</h3>
                    <span className="text-[10px] text-slate-500 font-semibold">42 Students</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Declining trends requiring guided support</p>
                  {/* Avatars */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {["MT", "OS", "LW", "TR"].map((av, idx) => (
                      <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                        {av}
                      </div>
                    ))}
                    <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                      +38
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">💡 Create targeted practice sets for identified weak topics</p>
                </div>
                <button className="w-full py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/5 text-[9px] font-bold uppercase tracking-wider text-amber-400 transition mt-2">
                  Create Remedial Plans
                </button>
              </div>

              {/* At Risk */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-rose-400">At Risk</h3>
                    <span className="text-[10px] text-slate-500 font-semibold">8 Students</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Immediate intervention required</p>
                  {/* Avatars */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {["SR", "KN", "PL", "YT"].map((av, idx) => (
                      <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                        {av}
                      </div>
                    ))}
                    <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                      +4
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">💡 Organize parent-teacher support plans and notify parents</p>
                </div>
                <button className="w-full py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/5 text-[9px] font-bold uppercase tracking-wider text-rose-400 transition mt-2">
                  Generate Support Plans
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Generate Support Plan", desc: "AI-powered per Student", icon: FileText, color: "text-blue-400" },
                { title: "Create Practice Set", desc: "Targeted to weak topics", icon: Compass, color: "text-indigo-400" },
                { title: "Send Reminder", desc: "Nudge inactive students", icon: Bell, color: "text-emerald-400" },
                { title: "Review Weak Students", desc: "Pattern verification", icon: AlertTriangle, color: "text-rose-400" },
              ].map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/20 p-4 hover:border-blue-500/20 hover:bg-slate-900/30 transition cursor-pointer flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${act.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-white leading-tight">{act.title}</h4>
                      <p className="text-[9px] text-slate-400 leading-none mt-0.5">{act.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
