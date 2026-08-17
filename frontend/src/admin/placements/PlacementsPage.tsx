"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, BookOpen, Calendar, FileText, RefreshCw,
  Sparkles,
  Target, TrendingUp, UserX, Users,
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

interface DepartmentStat {
  id: string;
  code: string;
  name: string;
  student_count: number;
  course_count: number;
  active_students: number;
  active_students_today: number;
  inactive_students: number;
  average_confidence: number;
  average_readiness: number;
}

interface StudentStat {
  id: number;
  name: string;
  confidence: number;
  readiness: number;
  last_active: string;
}

interface DashboardData {
  total_students: number;
  enrolled_students: number;
  total_professors: number;
  total_classes: number;
  active_students_today: number;
  average_confidence: number;
  average_readiness: number;
  weak_students: number;
  inactive_students: number;
  departments: DepartmentStat[];
}

interface PlacementInsight {
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
}

async function fetchAdminJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${endpoint} (${response.status})`);
  return response.json() as Promise<T>;
}

export default function PlacementsPage() {
  const timeRange = "Live snapshot";
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomStat[]>([]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [error, setError] = useState("");

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, classroomRows, studentRows] = await Promise.all([
        fetchAdminJson<DashboardData>("/api/admin/dashboard"),
        fetchAdminJson<ClassroomStat[]>("/api/admin/classrooms-analytics"),
        fetchAdminJson<StudentStat[]>("/api/admin/students"),
      ]);
      setDashboardData(dashboard);
      setClassrooms(classroomRows);
      setStudents(studentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load placement analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlacements();
  }, [loadPlacements]);

  const totalStudents = dashboardData?.total_students ?? students.length;
  const enrolledStudents = dashboardData?.enrolled_students ?? 0;
  const activeToday = dashboardData?.active_students_today ?? 0;
  const activeRate = totalStudents ? Math.round((activeToday / totalStudents) * 100) : 0;
  const enrollmentRate = totalStudents ? Math.round((enrolledStudents / totalStudents) * 100) : 0;
  const highRiskStudents = students.filter((student) => student.readiness < 40 || student.confidence < 40);
  const readyStudents = students.filter((student) => student.readiness >= 70 && student.confidence >= 60);
  const prepStudents = students.filter((student) => !highRiskStudents.some((risk) => risk.id === student.id) && !readyStudents.some((ready) => ready.id === student.id));
  const departmentRows = dashboardData?.departments ?? [];
  const priorityClasses = [...classrooms].filter((classroom) => classroom.student_count > 0).sort((a, b) => a.avg_readiness - b.avg_readiness);
  const actionQueue = [...students].sort((a, b) => a.readiness - b.readiness || a.confidence - b.confidence).slice(0, 6);

  const overviewCards = [
    { label: "Placement Readiness", value: dashboardData ? `${Math.round(dashboardData.average_readiness)}%` : "…", subtitle: `${readyStudents.length} students meet the current on-track threshold`, icon: BookOpen, gradient: "from-blue-600 to-indigo-500", progress: "Live academic signal" },
    { label: "Academic Confidence", value: dashboardData ? `${Math.round(dashboardData.average_confidence)}%` : "…", subtitle: "Confidence is used with readiness for triage", icon: TrendingUp, gradient: "from-purple-600 to-violet-650", progress: "Live academic signal" },
    { label: "Ready for Placement Prep", value: `${readyStudents.length}`, subtitle: `of ${totalStudents} students currently on track`, icon: Target, gradient: "from-emerald-500 to-teal-500", progress: `${totalStudents ? Math.round((readyStudents.length / totalStudents) * 100) : 0}% of roster` },
    { label: "Preparation Queue", value: `${highRiskStudents.length + prepStudents.length}`, subtitle: `${highRiskStudents.length} high-risk · ${prepStudents.length} need preparation`, icon: AlertTriangle, gradient: "from-amber-500 to-orange-500", progress: `${activeRate}% active today` },
  ];

  const placementInsights: PlacementInsight[] = [];
  if (highRiskStudents.length > 0) placementInsights.push({ title: "Readiness intervention queue is open", desc: `${highRiskStudents.length} students are below the high-risk threshold on readiness or confidence. This is a planning signal for future targeted practice.`, badge: "HIGH PRIORITY", badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20" });
  if ((dashboardData?.inactive_students ?? 0) > 0) placementInsights.push({ title: "Inactive student signal detected", desc: `${dashboardData?.inactive_students ?? 0} students have no recorded activity in the last seven days. This is an engagement alert for future faculty follow-up.`, badge: "ENGAGEMENT", badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20" });
  if (priorityClasses[0]) placementInsights.push({ title: `${priorityClasses[0].name} has the largest classroom gap`, desc: `This class has the lowest live readiness average among enrolled classrooms at ${priorityClasses[0].avg_readiness}%. This is a classroom-level planning alert.`, badge: "CLASSROOM GAP", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" });
  if (placementInsights.length < 3) placementInsights.push({ title: "Department readiness signal available", desc: `${departmentRows.length} department-level summaries are available from current enrollments and student metrics. This is an informational planning alert.`, badge: "PLANNING", badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" });

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

            <button onClick={() => void loadPlacements()} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:text-white" aria-label="Refresh placement analytics">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{error}</span></div>
          )}
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
                      <span className="text-[10px] font-bold text-slate-400">
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live placement recommendations</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Based on current academic signals
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {placementInsights.map((insight) => (
                <div key={insight.title} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[160px] backdrop-blur-sm hover:border-white/10 transition">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 text-[7px] font-extrabold tracking-wider rounded border ${insight.badgeColor}`}>
                        {insight.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{insight.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{insight.desc}</p>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Department Placement Readiness */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Department Placement Readiness</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {departmentRows.length === 0 ? <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-xs text-slate-500">Department readiness appears after departments or classes have live enrollment data.</div> : departmentRows.map((dept) => (
                <div key={dept.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4 hover:border-white/10 transition">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{dept.name}</h3>
                    <span className="text-[8px] text-slate-500 font-bold block mt-0.5">Enrolled: {dept.student_count} students · {dept.course_count} classes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Ready</span>
                      <span className="text-sm font-extrabold text-emerald-400 mt-1 block">{Math.round(dept.average_readiness)}%</span>
                    </div>
                    <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                      <span className="text-[7px] uppercase tracking-wider text-slate-550 block font-bold">Confidence</span>
                      <span className="text-sm font-extrabold text-white mt-1 block">{Math.round(dept.average_confidence)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${Math.max(0, Math.min(100, dept.average_readiness))}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Readiness mix and classroom gaps */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Readiness mix</h3></div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "High risk", value: highRiskStudents.length, color: "text-rose-400", bg: "bg-rose-500/10" },
                  { label: "Needs prep", value: prepStudents.length, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "On track", value: readyStudents.length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                ].map((item) => <div key={item.label} className={`rounded-xl border border-white/5 p-3 text-center ${item.bg}`}><span className={`text-xl font-extrabold ${item.color}`}>{item.value}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</span></div>)}
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Placement preparation coverage</span><span>{totalStudents} students</span></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/5"><div className="bg-rose-500" style={{ width: `${totalStudents ? (highRiskStudents.length / totalStudents) * 100 : 0}%` }} /><div className="bg-amber-500" style={{ width: `${totalStudents ? (prepStudents.length / totalStudents) * 100 : 0}%` }} /><div className="bg-emerald-500" style={{ width: `${totalStudents ? (readyStudents.length / totalStudents) * 100 : 0}%` }} /></div>
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span><UserX className="mr-1 inline h-3 w-3" />{dashboardData?.inactive_students ?? 0} inactive in the last 7 days</span></div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[10px]" aria-label="Readiness mix legend">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /><span className="text-slate-400">High risk</span><span className="font-bold text-rose-400">{highRiskStudents.length}</span></span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-slate-400">Needs prep</span><span className="font-bold text-amber-400">{prepStudents.length}</span></span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-slate-400">On track</span><span className="font-bold text-emerald-400">{readyStudents.length}</span></span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Priority classroom gaps</h3></div></div>
              {priorityClasses.length === 0 ? <p className="rounded-xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-500">No enrolled classrooms are available for comparison.</p> : <div className="space-y-3">{priorityClasses.slice(0, 4).map((classroom) => <div key={classroom.id} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{classroom.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{classroom.student_count} students · {classroom.inactive_students} inactive · {classroom.professor}</p></div><div className="text-right"><p className="text-sm font-extrabold text-amber-400">{classroom.avg_readiness}%</p><p className="text-[9px] uppercase tracking-wider text-slate-600">readiness</p></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, classroom.avg_readiness))}%` }} /></div></div>)}</div>}
            </div>
          </div>

          {/* Student action queue and data coverage */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student support signals</h3></div>
              </div>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-white/5" />)}</div>
              ) : actionQueue.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-500">Student signals will appear when the roster has live metrics.</p>
              ) : (
                <div className="space-y-2">
                  {actionQueue.map((student) => (
                    <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                      <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{student.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">Last active: {student.last_active || "Not recorded"}</p></div>
                      <div className="shrink-0 text-right"><p className="text-sm font-extrabold text-amber-400">{Math.round(student.readiness)}%</p><p className="text-[9px] uppercase tracking-wider text-slate-600">readiness · {Math.round(student.confidence)}% conf.</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Data coverage</h3></div>
              <div className="space-y-3 text-[10px]">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-slate-500">Enrollment coverage</span><span className="font-bold text-white">{enrolledStudents} / {totalStudents} ({enrollmentRate}%)</span></div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-slate-500">Active today</span><span className="font-bold text-emerald-400">{activeToday} ({activeRate}%)</span></div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"><span className="text-slate-500">Classroom coverage</span><span className="font-bold text-white">{classrooms.filter((classroom) => classroom.student_count > 0).length} / {dashboardData?.total_classes ?? classrooms.length}</span></div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-500">Recommendations use live readiness, confidence, activity, enrollment, and classroom metrics. Resume, recruiter, and interview records are not connected to the current admin data sources yet.</p>
            </div>
          </section>

          {/* Placement readiness guide */}
          <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Placement readiness guide</h2>
                <p className="mt-1 text-[10px] text-slate-500">A simple explanation of the thresholds already used in this dashboard.</p>
              </div>
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Current metrics</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { title: "High risk", rule: "Readiness below 40% or confidence below 40%", note: "Needs foundational academic support before placement preparation.", tone: "border-rose-500/20 bg-rose-500/5" },
                { title: "Needs preparation", rule: "Between the high-risk and on-track thresholds", note: "Continue practice, activity, and confidence building.", tone: "border-amber-500/20 bg-amber-500/5" },
                { title: "On track", rule: "Readiness at least 70% and confidence at least 60%", note: "Suitable for placement-preparation planning based on academic signals.", tone: "border-emerald-500/20 bg-emerald-500/5" },
              ].map((guide) => (
                <div key={guide.title} className={"rounded-xl border p-4 " + guide.tone}>
                  <p className="text-xs font-bold text-white">{guide.title}</p>
                  <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-300">{guide.rule}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{guide.note}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
