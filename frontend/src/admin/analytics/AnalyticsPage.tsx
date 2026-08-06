"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, Calendar, Download, Sparkles, TrendingUp,
  Users, BookOpen, AlertTriangle, Play, GraduationCap,
  Activity, UserCheck, UserX, ChevronRight
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

interface ClassroomStat {
  id: number;
  name: string;
  code: string;
  professor: string;
  student_count: number;
  avg_confidence: number;
  avg_readiness: number;
  active_students: number;
  inactive_students: number;
  status: "STRONG" | "STABLE" | "NEEDS ATTENTION" | "EMPTY";
}

export default function AnalyticsPage() {
  const [timeRange] = useState("Last 30 Days");
  const [simulatorValue, setSimulatorValue] = useState(20);
  const [selectedScenario, setSelectedScenario] = useState("participation");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<ClassroomStat[]>([]);
  const [clsLoading, setClsLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  useEffect(() => {
    async function loadDash() {
      try {
        const r = await fetch("/api/admin/dashboard");
        if (r.ok) setDashboardData(await r.json());
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDash();
  }, []);

  useEffect(() => {
    async function loadClassrooms() {
      try {
        const r = await fetch("/api/admin/classrooms-analytics");
        if (r.ok) setClassrooms(await r.json());
      } catch (err) {
        console.error("Classrooms analytics fetch error:", err);
      } finally {
        setClsLoading(false);
      }
    }
    loadClassrooms();
  }, []);

  const kpi = {
    confidence: loading ? "…" : dashboardData ? `${dashboardData.average_confidence}%` : "—",
    readiness: loading ? "…" : dashboardData ? `${dashboardData.average_readiness}%` : "—",
    faculty: loading ? "…" : dashboardData ? `${dashboardData.total_professors}` : "—",
    active: loading ? "…" : dashboardData ? `${dashboardData.active_students_today}` : "—",
  };

  const overviewCards = [
    { label: "Student Confidence", value: kpi.confidence, subtitle: "Average across all classrooms", icon: TrendingUp, gradient: "from-blue-600 to-indigo-500", trend: "+2%" },
    { label: "Placement Readiness", value: kpi.readiness, subtitle: "Based on overall roadmap progress", icon: BookOpen, gradient: "from-emerald-500 to-teal-500", trend: "+4%" },
    { label: "Faculty Members", value: kpi.faculty, subtitle: "Registered instructor profiles", icon: Users, gradient: "from-indigo-600 to-purple-600", trend: "Stable" },
    { label: "Active Today", value: kpi.active, subtitle: "Daily engaged student users", icon: AlertTriangle, gradient: "from-rose-500 to-red-500", trend: "Live" },
  ];

  const weakCount = dashboardData?.weak_students || 0;
  const inactiveCount = dashboardData?.inactive_students || 0;

  const executiveInsights = [
    {
      title: `${weakCount} Students Identified with Low Confidence (<60%)`,
      reason: "These student accounts show low test completion and overall accuracy.",
      affected: `${weakCount} Students`, score: "Needs Practice",
      btns: ["View Students", "Notify Faculty", "Generate Plan"],
    },
    {
      title: `${inactiveCount} Students Currently Inactive`,
      reason: "No study guides reviewed or quizzes taken in the past 7 days.",
      affected: `${inactiveCount} Inactive`, score: "At Risk",
      btns: ["Review Students", "Contact Support", "Notify Faculty"],
    },
    {
      title: "Placement Readiness Improved After Mock Interviews",
      reason: "Confidence scores rose by 14% across CS majors after mock session.",
      affected: "318 Students Ready", score: "88% Target Score",
      btns: ["Expand Workshops", "View Placements"],
    },
    {
      title: "Classroom Participation Trends",
      reason: "Active usage spikes right before classroom quiz deadlines.",
      affected: "All Departments", score: "Normal",
      btns: ["View Analytics", "Notify Faculty", "Create Plan"],
    },
  ];

  const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
    STRONG: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    STABLE: { color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25" },
    "NEEDS ATTENTION": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
    EMPTY: { color: "text-slate-500", bg: "bg-white/5", border: "border-white/5" },
  };

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Analytics</h1>
            <p className="text-[10px] text-slate-400">Institution-wide academic intelligence and trends</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <span>{timeRange}</span>
              <Calendar className="w-3.5 h-3.5 opacity-60" />
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition">
              <Download className="w-3.5 h-3.5 text-slate-350" />
              <span>Export Analytics</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
              <span>Generate Report</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">

          {/* KPI Overview */}
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
                      <span className={`text-[10px] font-bold ${card.trend.startsWith("+") ? "text-emerald-400" : "text-slate-400"}`}>
                        {card.trend}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════ Course-wise Performance Breakdown ═══════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Course-wise Performance</h2>
              </div>
              {!clsLoading && (
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""} total
                </span>
              )}
            </div>

            {clsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/30 p-5 animate-pulse h-44" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-10 text-center">
                <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No classrooms found</p>
                <p className="text-xs text-slate-600 mt-1">Create a classroom to see course analytics here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map(cls => {
                  const sc = statusConfig[cls.status] ?? statusConfig["STABLE"];
                  const isExpanded = expandedCourse === cls.id;
                  const confPct = Math.min(cls.avg_confidence, 100);
                  const readyPct = Math.min(cls.avg_readiness, 100);

                  return (
                    <div key={cls.id} className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl hover:border-white/10 transition-all duration-200 overflow-hidden">
                      {/* Card Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white truncate">{cls.name}</h3>
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">{cls.code}</p>
                          </div>
                          <span className={`shrink-0 px-1.5 py-0.5 text-[7px] font-extrabold rounded border ${sc.color} ${sc.bg} ${sc.border}`}>
                            {cls.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <Users className="w-3 h-3" />
                          <span className="font-semibold">{cls.professor}</span>
                          <span className="text-slate-600">·</span>
                          <span>{cls.student_count} student{cls.student_count !== 1 ? "s" : ""}</span>
                        </div>

                        {/* Confidence */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Avg Confidence</span>
                            <span className="text-white">{cls.avg_confidence}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${confPct >= 75 ? "bg-emerald-500" : confPct >= 50 ? "bg-sky-500" : "bg-rose-500"}`}
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Readiness */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Avg Readiness</span>
                            <span className="text-white">{cls.avg_readiness}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${readyPct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="border-t border-white/5 bg-black/20 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <UserCheck className="w-3 h-3" />
                            {cls.active_students} active
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <UserX className="w-3 h-3" />
                            {cls.inactive_students} inactive
                          </span>
                        </div>
                        <button
                          onClick={() => setExpandedCourse(isExpanded ? null : cls.id)}
                          className="flex items-center gap-0.5 text-[8px] font-bold text-slate-500 hover:text-violet-400 transition"
                        >
                          <Activity className="w-3 h-3" />
                          <span>{isExpanded ? "Hide" : "Details"}</span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/30 px-5 py-4 grid grid-cols-2 gap-3">
                          {[
                            { label: "Enrolled", value: `${cls.student_count}`, color: "text-white" },
                            { label: "Active 7d", value: `${cls.active_students}`, color: "text-emerald-400" },
                            { label: "Confidence", value: `${cls.avg_confidence}%`, color: "text-sky-400" },
                            { label: "Readiness", value: `${cls.avg_readiness}%`, color: "text-violet-400" },
                          ].map((item, i) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                              <span className="text-[7px] font-extrabold uppercase tracking-widest text-slate-500 block">{item.label}</span>
                              <span className={`text-xl font-extrabold mt-1 block ${item.color}`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                    {insight.btns.map((btn, bi) => (
                      <button
                        key={bi}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${
                          bi === insight.btns.length - 1 && insight.btns.length > 1
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "border border-white/10 hover:bg-white/5"
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
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
                        <input type="radio" name="scenario" checked={selectedScenario === sc.id}
                          onChange={() => setSelectedScenario(sc.id)} className="accent-violet-500 h-3.5 w-3.5" />
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
                  <input type="range" min="5" max="50" step="5" value={simulatorValue}
                    onChange={e => setSimulatorValue(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                  <div className="flex justify-between text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">
                    <span>Moderate</span><span>High Impact</span>
                  </div>
                </div>
                <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold transition shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 text-white" />
                  <span>Run Simulator Projection</span>
                </button>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/25 p-5 space-y-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">AI Predicted Outcomes</span>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Placement Readiness", value: "+9%", sub: "Target: 77%", red: false },
                    { label: "Engagement Rate", value: "+7%", sub: "Target: 79%", red: false },
                    { label: "Academic Score", value: "+5%", sub: "Target: 76%", red: false },
                    { label: "Dropout Risk", value: "-18%", sub: "24 students saved", red: true },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">{item.label}</span>
                      <span className={`text-2xl font-extrabold mt-2 block ${item.red ? "text-rose-400" : "text-emerald-400"}`}>{item.value}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">{item.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
