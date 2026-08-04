"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, ChevronDown, TrendingUp, Users, AlertTriangle, BookOpen, 
  Lightbulb, Sparkles, ClipboardCheck, CheckCircle2, FileText,
  GraduationCap, TrendingDown, Clock, Loader2
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────
interface ClassInfo { id: number; name: string; code: string; course_code: string }
interface KPI { avgScore: number; engagement: number; atRiskCount: number; weakTopicCount: number; scoreDelta: number }
interface WeekDay { day: string; score: number | null }
interface WeakTopic { name: string; score: number }
interface AlertItem { type: "critical" | "warning" | "info" | "success"; title: string; desc: string; students?: string[]; score?: number }

interface DashboardData {
  classes: ClassInfo[];
  totalStudents: number;
  kpi: KPI;
  weeklyTrend: WeekDay[];
  weakTopics: WeakTopic[];
  atRiskStudents: string[];
  alerts: AlertItem[];
}

// ── Alert styling ───────────────────────────────────────────
const ALERT_STYLES: Record<string, { border: string; bg: string; iconColor: string; icon: any; btnClass: string }> = {
  critical: { border: "border-rose-500/10", bg: "bg-rose-500/[0.02]", iconColor: "text-rose-400", icon: AlertTriangle, btnClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  warning:  { border: "border-amber-500/10", bg: "bg-amber-500/[0.02]", iconColor: "text-amber-400", icon: TrendingDown, btnClass: "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400" },
  info:     { border: "border-blue-500/10", bg: "bg-blue-500/[0.02]", iconColor: "text-blue-400", icon: BookOpen, btnClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  success:  { border: "border-emerald-500/10", bg: "bg-emerald-500/[0.02]", iconColor: "text-emerald-400", icon: Sparkles, btnClass: "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400" },
};

// ── AI Actions (static — these are tool shortcuts, not data) ─
const AI_ACTIONS = [
  { title: "Generate Lesson", description: "Create AI-powered lesson plans from your curriculum", icon: BookOpen, badge: "LESSON PLAN", badgeColor: "text-blue-400", badgeBg: "bg-blue-500/10", badgeBorder: "border-blue-500/20" },
  { title: "Create Quiz", description: "Auto-generate questions from topic or documents", icon: ClipboardCheck, badge: "ASSESSMENT", badgeColor: "text-purple-400", badgeBg: "bg-purple-500/10", badgeBorder: "border-purple-500/20" },
  { title: "Review Submissions", description: "AI-graded with detailed feedback per student", icon: CheckCircle2, badge: "GRADING", badgeColor: "text-emerald-400", badgeBg: "bg-emerald-500/10", badgeBorder: "border-emerald-500/20" },
  { title: "Generate Revision Notes", description: "Concise topic summaries for student revision", icon: FileText, badge: "CONTENT", badgeColor: "text-amber-400", badgeBg: "bg-amber-500/10", badgeBorder: "border-amber-500/20" },
  { title: "Simplify Topic", description: "Break down complex concepts into easy explanations", icon: Lightbulb, badge: "EXPLAIN", badgeColor: "text-cyan-400", badgeBg: "bg-cyan-500/10", badgeBorder: "border-cyan-500/20" },
  { title: "Create Practice Set", description: "Structured problem sets matched to learning gaps", icon: GraduationCap, badge: "PRACTICE", badgeColor: "text-indigo-400", badgeBg: "bg-indigo-500/10", badgeBorder: "border-indigo-500/20" },
];

export default function HomeView() {
  const router = useRouter();
  const [userName, setUserName] = useState("Professor");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  // Greeting based on time
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem("user_id") || "2";
      const res = await fetch(`/api/professor/dashboard?professor_id=${userId}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("user_name") || "Professor");
    }
    fetchDashboard();
  }, []);

  const getAvatarInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase();

  // Active class subtitle
  const classSubtitle = data && data.classes.length > 0
    ? `${data.classes.map(c => c.name).join(", ")} • ${data.totalStudents} Students`
    : "No classes yet";

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      <ProfessorSidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold flex items-center gap-1.5 text-white">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-[10px] text-slate-400">
              {classSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Class Dropdown */}
            {data && data.classes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition cursor-pointer"
                >
                  <span>{data.classes.length === 1 ? `${data.classes[0].name} - ${data.classes[0].course_code || ""}` : `${data.classes.length} Classes`}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
                {classDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
                    {data.classes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setClassDropdownOpen(false); router.push(`/professor/classrooms`); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition flex justify-between items-center"
                      >
                        <span>{c.name}</span>
                        <span className="text-[9px] text-slate-500">{c.course_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 hover:bg-white/5 transition cursor-pointer">
              <Bell className="w-4 h-4 text-slate-300" />
              {data && data.alerts.length > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
              )}
            </button>

            {/* Avatar */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)] select-none">
              {userName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Loading dashboard…</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
              <span className="text-xs text-rose-400 font-semibold">{error}</span>
              <button onClick={fetchDashboard} className="mt-2 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white transition">
                Retry
              </button>
            </div>
          )}

          {/* Data Loaded */}
          {!loading && !error && data && (
            <>
              {/* ─── Class Health KPI Cards ─────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Class Health</h2>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                      AI Powered
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/professor/insights")}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    View Details &rarr;
                  </button>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Average Score */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl group transition-all duration-300 hover:border-white/10 flex flex-col justify-between min-h-[140px]">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-blue-600 to-indigo-500" />
                    <div className="relative flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Average Score</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white tracking-tight">{data.kpi.avgScore}%</span>
                          {data.kpi.scoreDelta !== 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${data.kpi.scoreDelta > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {data.kpi.scoreDelta > 0 ? "↗" : "↘"} {Math.abs(data.kpi.scoreDelta)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {data.kpi.scoreDelta > 0 ? `+${data.kpi.scoreDelta}%` : data.kpi.scoreDelta < 0 ? `${data.kpi.scoreDelta}%` : "No change"} vs last week
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 shadow-lg shadow-indigo-500/10 shrink-0">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {/* Mini Bar Chart from weekly trend */}
                    <div className="flex items-end gap-1.5 h-6 mt-3 relative z-10 w-full">
                      {data.weeklyTrend.map((d, i) => {
                        const val = d.score !== null ? Math.max(d.score, 10) : 10;
                        const isLast = i === data.weeklyTrend.length - 1;
                        return (
                          <div
                            key={i}
                            className={`w-full rounded-sm transition-all duration-300 ${isLast && d.score !== null ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : d.score !== null ? "bg-white/15" : "bg-white/5"}`}
                            style={{ height: `${val}%` }}
                            title={`${d.day}: ${d.score !== null ? `${d.score}%` : "No data"}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Engagement */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl group transition-all duration-300 hover:border-white/10 flex flex-col justify-between min-h-[140px]">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-emerald-500 to-teal-500" />
                    <div className="relative flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Engagement</span>
                        <span className="text-3xl font-extrabold text-white tracking-tight">{data.kpi.engagement}%</span>
                        <p className="text-[10px] text-slate-400 font-medium">Active students this month</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/10 shrink-0">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {/* Mini Radial Ring */}
                    <div className="flex justify-start items-center h-6 mt-3 pl-1 relative z-10 w-full">
                      <svg className="w-6 h-6 transform -rotate-90">
                        <circle cx="12" cy="12" r="9" className="stroke-white/10" strokeWidth="2.5" fill="transparent" />
                        <circle cx="12" cy="12" r="9" className="stroke-emerald-400" strokeWidth="2.5" fill="transparent"
                          strokeDasharray={56.5}
                          strokeDashoffset={56.5 * (1 - data.kpi.engagement / 100)}
                        />
                      </svg>
                      <span className="text-[10px] text-slate-400 font-semibold ml-2">{data.kpi.engagement}% active</span>
                    </div>
                  </div>

                  {/* Card 3: At-Risk Students */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl group transition-all duration-300 hover:border-white/10 flex flex-col justify-between min-h-[140px]">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-rose-500 to-red-500" />
                    <div className="relative flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">At-Risk Students</span>
                        <span className="text-3xl font-extrabold text-white tracking-tight">{data.kpi.atRiskCount}</span>
                        <p className="text-[10px] text-slate-400 font-medium">Need immediate attention</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 shadow-lg shadow-rose-500/10 shrink-0">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {data.kpi.atRiskCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-rose-400/90 font-medium mt-3 relative z-10 w-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>Critical performance drops</span>
                      </div>
                    )}
                    {data.kpi.atRiskCount === 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium mt-3 relative z-10 w-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>All students performing well</span>
                      </div>
                    )}
                  </div>

                  {/* Card 4: Weak Topics */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl group transition-all duration-300 hover:border-white/10 flex flex-col justify-between min-h-[140px]">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-amber-500 to-orange-500" />
                    <div className="relative flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Weak Topics</span>
                        <span className="text-3xl font-extrabold text-white tracking-tight">{data.kpi.weakTopicCount}</span>
                        <p className="text-[10px] text-slate-400 font-medium">Topics below 60% avg</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/10 shrink-0">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {data.weakTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 relative z-10 w-full">
                        {data.weakTopics.slice(0, 3).map((wt, i) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${i === 0 ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"}`}>
                            {wt.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {data.weakTopics.length === 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium mt-3 relative z-10 w-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>All topics on track</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Health Insights Banner */}
                {data.alerts.length > 0 && (
                  <div className={`grid grid-cols-1 ${data.alerts.length >= 2 ? "md:grid-cols-2" : ""} gap-3 text-xs`}>
                    {data.alerts.slice(0, 2).map((alert, idx) => {
                      const style = ALERT_STYLES[alert.type] || ALERT_STYLES.info;
                      return (
                        <div key={idx} className={`flex items-center gap-3 rounded-xl border ${style.border} ${style.bg} p-3`}>
                          <Lightbulb className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                          <p className={style.iconColor.replace("text-", "text-").replace("-400", "-200")}>
                            <span className="text-white font-bold">{alert.title}</span> — {alert.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ─── AI Actions ─────────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">AI Actions</h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> Powered by AI
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AI_ACTIONS.map((act, i) => {
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
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white mb-1 group-hover:text-blue-400 transition">{act.title}</h3>
                          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-3">{act.description}</p>
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

              {/* ─── Student Alerts ─────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Student Alerts</h2>
                    {data.alerts.length > 0 && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                        {data.alerts.length} Active Alert{data.alerts.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push("/professor/insights")}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    View All Students &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {data.alerts.length === 0 && (
                    <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5 text-center">
                      <p className="text-xs text-emerald-400 font-semibold">🎉 No active alerts — all students are performing well!</p>
                    </div>
                  )}

                  {data.alerts.map((alert, idx) => {
                    const style = ALERT_STYLES[alert.type] || ALERT_STYLES.info;
                    const AlertIcon = style.icon;
                    return (
                      <div key={idx} className={`rounded-2xl border ${style.border} ${style.bg} p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                        <div className="flex items-start gap-4 w-full">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.bg} border ${style.border} shrink-0`}>
                            <AlertIcon className={`h-5 w-5 ${style.iconColor}`} />
                          </div>
                          <div className="space-y-1.5 w-full">
                            <h3 className="text-xs font-bold text-white">{alert.title}</h3>
                            <p className="text-[10px] text-slate-400">{alert.desc}</p>

                            {/* Student avatars for at-risk alerts */}
                            {alert.students && alert.students.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-2">
                                {alert.students.map((st, si) => (
                                  <div
                                    key={si}
                                    title={st}
                                    className="h-6 w-6 rounded-full border border-slate-900 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[8px] font-bold text-white shadow-md cursor-pointer hover:scale-115 transition-all"
                                  >
                                    {getAvatarInitials(st)}
                                  </div>
                                ))}
                                {data.kpi.atRiskCount > alert.students.length && (
                                  <span className="text-[9px] text-slate-500 font-semibold pl-1">
                                    +{data.kpi.atRiskCount - alert.students.length} others
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Progress bar for weak topic alerts */}
                            {alert.score !== undefined && (
                              <div className="max-w-xs space-y-1 pt-1">
                                <div className="flex justify-between text-[8px] font-semibold text-slate-400 uppercase tracking-wider">
                                  <span>Topic Mastery</span>
                                  <span className="text-amber-400">{alert.score}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full" style={{ width: `${alert.score}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            onClick={() => router.push("/professor/insights")}
                            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-wider uppercase transition"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
