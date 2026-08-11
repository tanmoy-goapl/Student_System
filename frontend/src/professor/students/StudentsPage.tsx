"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  classId: string;
  className: string;
}

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "at-risk" | "inactive" | "top">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [allStudents, setAllStudents] = useState<StudentCardData[]>([]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem("user_id");
        const professorId = userId ? parseInt(userId, 10) : 1;
        
        // 1. Fetch classes
        const classesRes = await fetch(`/api/classroom/my_classes/${professorId}`);
        if (!classesRes.ok) throw new Error("Failed to load classes");
        const classesData = await classesRes.json();
        const myClasses = classesData.classes || [];
        setClasses(myClasses);

        // 2. Fetch student analytics for each class
        const studentsAccumulator: StudentCardData[] = [];
        const avatarBgs = [
          "from-emerald-500 to-teal-650",
          "from-blue-500 to-indigo-650",
          "from-purple-500 to-violet-650",
          "from-pink-500 to-rose-650",
          "from-amber-500 to-orange-650",
        ];

        for (const cls of myClasses) {
          const analyticsRes = await fetch(`/api/professor/class/${cls.id}`);
          if (!analyticsRes.ok) continue;
          const analyticsData = await analyticsRes.json();
          const classStudents = analyticsData.students || [];

          classStudents.forEach((st: any, idx: number) => {
            const accuracy = st.accuracy || 0;
            const progress = st.progress || 0;
            const exposure = st.exposure || 0;

            let badge: StudentCardData["badge"] = "NEEDS ATTENTION";
            let badgeColor = "text-amber-400 border-amber-500/20 bg-amber-500/10";
            let badgeBg = "bg-amber-400";
            let note = "Needs assistance with calculus. Suggest remedial material.";

            const lastPracticed = st.last_practiced_at ? new Date(st.last_practiced_at) : null;
            const daysSinceActive = lastPracticed 
              ? (new Date().getTime() - lastPracticed.getTime()) / (1000 * 3600 * 24) 
              : 999;
            const isInactive = daysSinceActive > 7;

            if (st.is_at_risk) {
              badge = "AT RISK";
              badgeColor = "text-rose-400 border-rose-500/20 bg-rose-500/10";
              badgeBg = "bg-rose-400";
              note = "Critical drop in scores. Immediate intervention required.";
            } else if (accuracy >= 75) {
              badge = "TOP PERFORMER";
              badgeColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
              badgeBg = "bg-emerald-400";
              note = "Ready for advanced problem sets. Keep up the good work!";
            } else if (isInactive) {
              badge = "INACTIVE";
              badgeColor = "text-slate-400 border-slate-500/20 bg-slate-500/10";
              badgeBg = "bg-slate-400";
              note = "Inactive for several days. Send reminder nudge.";
            } else {
              note = "Consistent performer. Maintain current pace.";
            }

            studentsAccumulator.push({
              id: st.id,
              name: st.name,
              rollNumber: st.id.replace("S", "22CSE100"),
              cgpa: ((accuracy / 10) * 0.8 + 2.0).toFixed(1),
              performance: Math.round(accuracy),
              engagement: Math.round(progress),
              attendance: Math.round(exposure || 85),
              badge,
              badgeColor,
              badgeBg,
              note,
              avatarBg: avatarBgs[idx % avatarBgs.length],
              classId: String(cls.id),
              className: cls.name
            });
          });
        }

        setAllStudents(studentsAccumulator);

      } catch (err) {
        console.error("Error fetching students page data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter students based on classroom selection, then DEDUPLICATE if looking at "All Classes"
  const currentClassStudents = useMemo(() => {
    let list = selectedClassId === "all" 
      ? allStudents 
      : allStudents.filter(s => s.classId === selectedClassId);
      
    if (selectedClassId === "all") {
      // Deduplicate by student id globally
      const seen = new Set();
      list = list.filter(st => {
        if (seen.has(st.id)) return false;
        seen.add(st.id);
        return true;
      });
    }
    return list;
  }, [allStudents, selectedClassId]);

  // Compute metrics and KPIs reactively based on the filtered list of students
  const activeClassStats = useMemo(() => {
    const total = currentClassStudents.length;
    const atRisk = currentClassStudents.filter(s => s.badge === "AT RISK").length;
    const topPerformer = currentClassStudents.filter(s => s.badge === "TOP PERFORMER").length;
    const inactive = currentClassStudents.filter(s => s.badge === "INACTIVE").length;
    const needsAttention = currentClassStudents.filter(s => s.badge === "NEEDS ATTENTION").length;
    
    const sumAccuracy = currentClassStudents.reduce((acc, s) => acc + s.performance, 0);
    const avgScore = total > 0 ? Math.round(sumAccuracy / total) : 0;
    
    const highEngagementCount = currentClassStudents.filter(s => s.engagement >= 70).length;
    
    return {
      total,
      atRisk,
      topPerformer,
      inactive,
      needsAttention,
      avgScore,
      highEngagementCount
    };
  }, [currentClassStudents]);

  const summaryCards = [
    {
      label: "Total Students",
      value: String(activeClassStats.total),
      subtitle: selectedClassId === "all" ? `${classes.map(c => c.name).join(" • ")}` : classes.find(c => String(c.id) === selectedClassId)?.name || "",
      icon: Users,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "At-Risk Students",
      value: String(activeClassStats.atRisk),
      subtitle: `${activeClassStats.total > 0 ? Math.round((activeClassStats.atRisk / activeClassStats.total) * 100) : 0}% of class enrollment`,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
    },
    {
      label: "Avg Performance",
      value: `${activeClassStats.avgScore}%`,
      subtitle: "Average accuracy rate",
      icon: TrendingUp,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "High Engagement",
      value: `${activeClassStats.total > 0 ? Math.round((activeClassStats.highEngagementCount / activeClassStats.total) * 100) : 0}%`,
      subtitle: `${activeClassStats.highEngagementCount} of ${activeClassStats.total} students`,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  // Dynamic alerts
  const alerts = [
    {
      type: "Topic Alert",
      text: activeClassStats.atRisk > 0 ? `${activeClassStats.atRisk} Students Struggling in Core Curriculum Topics` : "All students currently performing above critical threshold.",
      btn1: "Review Students",
      btn2: "Generate Practice Set",
      border: "border-amber-500/20 bg-amber-500/[0.02] text-amber-300",
    },
    {
      type: "Inactivity Alert",
      text: activeClassStats.inactive > 0 ? `${activeClassStats.inactive} Students Inactive for 7+ Days` : "No student inactivity flags this week.",
      btn1: "Send Reminder",
      btn2: "View Profiles",
      border: "border-rose-500/20 bg-rose-500/[0.02] text-rose-300",
    },
    {
      type: "Completion Alert",
      text: `Average Engagement stands at ${activeClassStats.total > 0 ? Math.round((activeClassStats.highEngagementCount / activeClassStats.total) * 100) : 0}%`,
      btn1: "Notify Students",
      btn2: "View Assignments",
      border: "border-blue-500/20 bg-blue-500/[0.02] text-blue-300",
    },
  ];

  // Filter students based on active tabs & search query
  const filteredStudents = useMemo(() => {
    return currentClassStudents.filter(st => {
      const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.rollNumber.includes(searchQuery);
      if (!matchesSearch) return false;
      if (activeTab === "all") return true;
      if (activeTab === "at-risk") return st.badge === "AT RISK";
      if (activeTab === "inactive") return st.badge === "INACTIVE";
      if (activeTab === "top") return st.badge === "TOP PERFORMER";
      return true;
    });
  }, [currentClassStudents, searchQuery, activeTab]);

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
            <p className="text-[10px] text-slate-400">Monitor student performance and engagement</p>
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
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setActiveTab("all"); // Reset tab on class change
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 text-xs font-semibold hover:border-white/20 transition cursor-pointer appearance-none pr-8 relative"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

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
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <p className="text-xs text-slate-400 font-medium">Loading student list and analytics...</p>
              </div>
            </div>
          ) : (
            <>
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
                          <p className="text-[9px] text-slate-400/80 mt-0.5 max-w-[200px] truncate">{card.subtitle}</p>
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
                    {activeClassStats.atRisk > 0 ? "Active" : "Stable"}
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
                      { id: "all", label: `All (${activeClassStats.total})` },
                      { id: "at-risk", label: `At-Risk (${activeClassStats.atRisk})` },
                      { id: "inactive", label: `Inactive (${activeClassStats.inactive})` },
                      { id: "top", label: `Top Performers (${activeClassStats.topPerformer})` },
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
                {filteredStudents.length === 0 ? (
                  <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-white/5 bg-slate-900/10">
                    <p className="text-xs text-slate-400 font-medium">No students match the current filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map(st => (
                      <div key={st.id + "-" + st.classId} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[220px] backdrop-blur-sm group hover:border-blue-500/30 hover:bg-slate-900/60 transition duration-300">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${st.avatarBg} flex items-center justify-center text-xs font-bold`}>
                                {getInitials(st.name)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{st.name}</h4>
                                <p className="text-[9px] text-slate-400 font-medium">Roll: {st.rollNumber} • CGPA: {st.cgpa} ({st.className})</p>
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
                )}
              </div>

              {/* Student Segmentation Section */}
              {/* <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Segmentation</h2>
                  <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                    AI Grouped
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-emerald-400">High Performers</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{activeClassStats.topPerformer} Students</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">75%+: correctness scores with consistent engagement</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {currentClassStudents.filter(s => s.badge === "TOP PERFORMER").slice(0, 4).map((st, idx) => (
                          <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                            {getInitials(st.name)}
                          </div>
                        ))}
                        {activeClassStats.topPerformer > 4 && (
                          <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                            +{activeClassStats.topPerformer - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 italic">💡 Assign advanced quizzes to maintain momentum</p>
                    </div>
                    <button className="w-full py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition mt-2">
                      Assign Advanced Quizzes
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-amber-400">Needs Attention</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{activeClassStats.needsAttention} Students</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Underperforming concepts requiring guided support</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {currentClassStudents.filter(s => s.badge === "NEEDS ATTENTION").slice(0, 4).map((st, idx) => (
                          <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                            {getInitials(st.name)}
                          </div>
                        ))}
                        {activeClassStats.needsAttention > 4 && (
                          <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                            +{activeClassStats.needsAttention - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 italic">💡 Create targeted practice sets for identified weak topics</p>
                    </div>
                    <button className="w-full py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/5 text-[9px] font-bold uppercase tracking-wider text-amber-400 transition mt-2">
                      Create Remedial Plans
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-rose-400">At Risk</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{activeClassStats.atRisk} Students</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Immediate intervention required</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {currentClassStudents.filter(s => s.badge === "AT RISK").slice(0, 4).map((st, idx) => (
                          <div key={idx} className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-800 text-[8px] font-bold flex items-center justify-center">
                            {getInitials(st.name)}
                          </div>
                        ))}
                        {activeClassStats.atRisk > 4 && (
                          <div className="inline-block h-6 w-6 rounded-full border border-[#090b1f] bg-slate-950 text-[8px] font-bold flex items-center justify-center text-slate-500">
                            +{activeClassStats.atRisk - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 italic">💡 Organize student support plans and schedule remediation</p>
                    </div>
                    <button className="w-full py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/5 text-[9px] font-bold uppercase tracking-wider text-rose-400 transition mt-2">
                      Generate Support Plans
                    </button>
                  </div>
                </div>
              </div> */}

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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
