"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, BookOpen, Calendar, CheckCircle2,
  ChevronRight, Clock3, GraduationCap, RefreshCw,
  ShieldAlert, Sparkles, Target, TrendingUp, UserCheck, UserX, Users, X,
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import { getAdminScopedEndpoint } from "@/lib/adminAuth";
type ClassroomStatus = "STRONG" | "STABLE" | "NEEDS ATTENTION" | "EMPTY";

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
  status: ClassroomStatus;
}

interface DepartmentStat {
  id: string;
  code: string;
  name: string;
  short_name: string;
  student_count: number;
  course_count: number;
  active_students: number;
  active_students_today: number;
  inactive_students: number;
  average_confidence: number;
  average_readiness: number;
  courses: Array<{ id: number; name: string; code: string; student_count: number }>;
}

interface StudentStat {
  id: number;
  name: string;
  confidence: number;
  readiness: number;
  last_active: string;
  risk_tier?: "HIGH_RISK" | "NEEDS_SUPPORT" | "NOT_STARTED" | "ON_TRACK";
}

interface AdminAlert {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  metric: string;
  action: string;
}

interface DashboardData {
  total_students: number;
  total_student_accounts: number;
  enrolled_students: number;
  total_professors: number;
  total_classes: number;
  active_students_today: number;
  average_confidence: number;
  average_readiness: number;
  weak_students: number;
  students_needing_support?: number;
  high_risk_students?: number;
  not_started_students?: number;
  inactive_students: number;
  departments: DepartmentStat[];
  alerts: AdminAlert[];
  last_updated: string;
}

interface ExecutiveInsight {
  title: string;
  reason: string;
  affected: string;
  score: string;
  alertType: string;
  tone: "critical" | "warning" | "positive" | "info";
}

async function fetchAdminJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(getAdminScopedEndpoint(endpoint), { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${endpoint} (${response.status})`);
  return response.json() as Promise<T>;
}

export default function AnalyticsPage() {
  const timeRange = "Live snapshot";
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomStat[]>([]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [clsLoading, setClsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setClsLoading(true);
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
      setError(err instanceof Error ? err.message : "Unable to load analytics data.");
    } finally {
      setLoading(false);
      setClsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const kpi = {
    confidence: loading ? "…" : dashboardData ? `${dashboardData.average_confidence}%` : "—",
    readiness: loading ? "…" : dashboardData ? `${dashboardData.average_readiness}%` : "—",
    faculty: loading ? "…" : dashboardData ? `${dashboardData.total_professors}` : "—",
    active: loading ? "…" : dashboardData ? `${dashboardData.active_students_today}` : "—",
  };

  const totalStudents = dashboardData?.total_students ?? students.length;
  const enrolledStudents = dashboardData?.enrolled_students ?? 0;
  const activeToday = dashboardData?.active_students_today ?? 0;
  const supportQueueCount = dashboardData?.students_needing_support ?? dashboardData?.weak_students ?? 0;
  const inactiveCount = dashboardData?.inactive_students ?? 0;
  const activeRate = totalStudents ? Math.round((activeToday / totalStudents) * 100) : 0;
  const enrollmentRate = totalStudents ? Math.round((enrolledStudents / totalStudents) * 100) : 0;
  const riskCounts = students.reduce(
    (counts, student) => {
      if (student.risk_tier === "HIGH_RISK") {
        counts.highRisk += 1;
      } else if (student.risk_tier === "NEEDS_SUPPORT") {
        counts.support += 1;
      } else if (student.risk_tier === "NOT_STARTED") {
        counts.notStarted += 1;
      } else {
        counts.onTrack += 1;
      }
      return counts;
    },
    { highRisk: 0, support: 0, notStarted: 0, onTrack: 0 },
  );
  const riskRosterCount = students.length > 0 ? students.length : totalStudents;
  const highRiskCount = students.length > 0 ? riskCounts.highRisk : (dashboardData?.high_risk_students ?? 0);
  const notStartedCount = students.length > 0 ? riskCounts.notStarted : (dashboardData?.not_started_students ?? 0);
  const supportCount = students.length > 0
    ? riskCounts.support
    : Math.max(supportQueueCount - highRiskCount - notStartedCount, 0);
  const onTrackCount = students.length > 0
    ? riskCounts.onTrack
    : Math.max(riskRosterCount - highRiskCount - supportCount - notStartedCount, 0);
  const riskDistribution = [
    { label: "High risk", value: highRiskCount, color: "text-rose-400", bg: "bg-rose-500/10", bar: "bg-rose-500" },
    { label: "Needs support", value: supportCount, color: "text-amber-400", bg: "bg-amber-500/10", bar: "bg-amber-500" },
    { label: "Not started", value: notStartedCount, color: "text-slate-300", bg: "bg-slate-500/10", bar: "bg-slate-500" },
    { label: "On track", value: onTrackCount, color: "text-emerald-400", bg: "bg-emerald-500/10", bar: "bg-emerald-500" },
  ];
  const departmentRows = dashboardData?.departments ?? [];
  const lowestClass = [...classrooms]
    .filter((classroom) => classroom.student_count > 0)
    .sort((a, b) => a.avg_readiness - b.avg_readiness)[0];
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedCourseId) ?? null;

  const overviewCards = [
    { label: "Student Confidence", value: kpi.confidence, subtitle: `${highRiskCount} high risk · ${supportCount} need support`, icon: TrendingUp, gradient: "from-blue-600 to-indigo-500", trend: "Live" },
    { label: "Learning Readiness", value: kpi.readiness, subtitle: `${onTrackCount} students currently on track`, icon: BookOpen, gradient: "from-emerald-500 to-teal-500", trend: "Live" },
    { label: "Faculty Members", value: kpi.faculty, subtitle: `${dashboardData?.total_classes ?? 0} active classes in the platform`, icon: Users, gradient: "from-indigo-600 to-purple-600", trend: "Roster" },
    { label: "Active Today", value: kpi.active, subtitle: `${activeRate}% of the student roster`, icon: Activity, gradient: "from-rose-500 to-red-500", trend: "Live" },
  ];

  const executiveInsights: ExecutiveInsight[] = [];
  if (supportQueueCount > 0) {
    executiveInsights.push({
      title: "Confidence support queue is open",
      reason: `${supportQueueCount} students are high risk, need support, or have not started. This is an early support signal for targeted practice planning.`,
      affected: `${supportQueueCount} students`, score: `${dashboardData?.average_confidence ?? 0}% average`, alertType: highRiskCount > 0 ? "HIGH PRIORITY" : "SUPPORT", tone: highRiskCount > 0 ? "critical" : "warning",
    });
  }
  if (inactiveCount > 0) {
    executiveInsights.push({
      title: "Re-engagement is the next operational priority",
      reason: `${inactiveCount} students have no recorded activity in the last seven days. This is an engagement signal for future faculty follow-up.`,
      affected: `${inactiveCount} inactive`, score: `${activeRate}% active today`, alertType: "ENGAGEMENT", tone: "warning",
    });
  }
  if (lowestClass) {
    executiveInsights.push({
      title: `${lowestClass.name} is the weakest classroom signal`,
      reason: "Its live readiness average is the lowest among enrolled classrooms. This is a classroom-level planning signal.",
      affected: `${lowestClass.student_count} enrolled`, score: `${lowestClass.avg_readiness}% readiness`, alertType: "CLASSROOM GAP", tone: "warning",
    });
  }
  if (enrollmentRate < 90 && totalStudents > 0) {
    executiveInsights.push({
      title: "Enrollment coverage needs a data-quality check",
      reason: `${enrolledStudents} of ${totalStudents} students are currently enrolled in a class. Unenrolled accounts are excluded from classroom-level signals.`,
      affected: `${totalStudents - enrolledStudents} not enrolled`, score: `${enrollmentRate}% coverage`, alertType: "DATA GAP", tone: "info",
    });
  }
  if (executiveInsights.length === 0) {
    executiveInsights.push({
      title: "Institutional signals are stable",
      reason: "No immediate confidence, activity, or enrollment gaps were detected in the current live snapshot.",
      affected: `${totalStudents} students`, score: `${activeRate}% active today`, alertType: "STABLE", tone: "positive",
    });
  }

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
            <button onClick={() => void loadAnalytics()} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:text-white" aria-label="Refresh analytics">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                      <span className="text-[10px] font-bold text-slate-400">
                        {card.trend}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Institution pulse */}
          <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Institution pulse</h2>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Live signals from student metrics, enrollments, and classroom activity.</p>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500"><Clock3 className="h-3 w-3" /> {timeRange}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Confidence", value: dashboardData?.average_confidence ?? 0, note: "Average student confidence", color: "bg-sky-500" },
                { label: "Readiness", value: dashboardData?.average_readiness ?? 0, note: "Average learning progress", color: "bg-violet-500" },
                { label: "Daily activity", value: activeRate, note: `${activeToday} of ${totalStudents} active today`, color: "bg-emerald-500" },
                { label: "Enrollment coverage", value: enrollmentRate, note: `${enrolledStudents} of ${totalStudents} enrolled`, color: "bg-amber-500" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>{metric.label}</span><span className="text-white">{Math.round(metric.value)}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${Math.max(0, Math.min(100, metric.value))}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{metric.note}</p>
                </div>
              ))}
            </div>
          </section>

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
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classrooms.map(cls => {
                  const sc = statusConfig[cls.status] ?? statusConfig["STABLE"];
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
                          onClick={() => setSelectedCourseId(cls.id)}
                          className="flex items-center gap-0.5 text-[8px] font-bold text-slate-500 hover:text-violet-400 transition"
                          aria-label={`View details for ${cls.name}`}
                        >
                          <Activity className="w-3 h-3" />
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {selectedClassroom && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="class-details-title"
              onClick={() => setSelectedCourseId(null)}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1227] p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="class-details-title" className="text-sm font-bold text-white">{selectedClassroom.name}</h2>
                      {(() => {
                        const selectedStatus = statusConfig[selectedClassroom.status] ?? statusConfig["STABLE"];
                        return (
                          <span className={`px-1.5 py-0.5 text-[7px] font-extrabold rounded border ${selectedStatus.color} ${selectedStatus.bg} ${selectedStatus.border}`}>
                            {selectedClassroom.status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-1 text-[10px] font-mono text-slate-500">{selectedClassroom.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId(null)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
                    aria-label="Close class details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold">{selectedClassroom.professor}</span>
                  <span className="text-slate-600">·</span>
                  <span>{selectedClassroom.student_count} student{selectedClassroom.student_count !== 1 ? "s" : ""}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Enrolled</p>
                    <p className="mt-2 text-2xl font-extrabold text-white">{selectedClassroom.student_count}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Active 7d</p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-400">{selectedClassroom.active_students}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Confidence</p>
                    <p className="mt-2 text-2xl font-extrabold text-sky-400">{selectedClassroom.avg_confidence}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Readiness</p>
                    <p className="mt-2 text-2xl font-extrabold text-violet-400">{selectedClassroom.avg_readiness}%</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                  <p className="text-[10px] text-slate-500">{selectedClassroom.inactive_students} inactive student{selectedClassroom.inactive_students !== 1 ? "s" : ""}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId(null)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Department and risk insights */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Department performance</h2>
                </div>
                <span className="text-[9px] font-semibold text-slate-500">{departmentRows.length} departments</span>
              </div>
              {departmentRows.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-500">Department analytics will appear after departments or classes are configured.</p>
              ) : (
                <div className="space-y-3">
                  {departmentRows.map((department) => {
                    const readiness = Math.round(department.average_readiness);
                    const readinessTone = readiness >= 70 ? "text-emerald-400" : readiness >= 40 ? "text-amber-400" : "text-rose-400";
                    return (
                      <div key={department.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-white">{department.name}</p>
                            <p className="mt-0.5 text-[10px] text-slate-500">{department.student_count} students · {department.course_count} classes · {department.active_students} active this week</p>
                          </div>
                          <span className={`text-sm font-extrabold ${readinessTone}`}>{readiness}%</span>
                        </div>
                        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.max(0, Math.min(100, readiness))}%` }} /></div>
                          <span className="text-[10px] text-slate-500">{Math.round(department.average_confidence)}% confidence</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Risk distribution</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {riskDistribution.map((risk) => (
                  <div key={risk.label} className={`rounded-xl border border-white/5 p-3 text-center ${risk.bg}`}>
                    <p className={`text-xl font-extrabold ${risk.color}`}>{risk.value}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{risk.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Roster risk mix</span><span>{riskRosterCount} students</span></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/5" aria-label="Risk distribution bar">
                  {riskDistribution.map((risk) => (
                    <div key={`bar-${risk.label}`} className={risk.bar} style={{ width: `${riskRosterCount ? (risk.value / riskRosterCount) * 100 : 0}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[10px]" aria-label="Risk distribution legend">
                  {riskDistribution.map((risk) => (
                    <div key={`legend-${risk.label}`} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${risk.bar}`} />
                      <span className="text-slate-400">{risk.label}</span>
                      <span className={`font-bold ${risk.color}`}>{risk.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] leading-relaxed text-slate-600">High risk: accuracy &lt;50% or confidence &lt;40%. Needs support: accuracy &lt;70%, confidence &lt;60%, or exposure &lt;25%. Not started is shown separately.</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>{inactiveCount} inactive in the last 7 days</span></div>
              </div>
              {dashboardData?.alerts?.length ? (
                <div className="mt-5 border-t border-white/5 pt-4">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Live alerts</p>
                  <div className="space-y-2">
                    {dashboardData.alerts.slice(0, 2).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between gap-3 text-[10px]">
                        <span className="truncate text-slate-300">{alert.title}</span><span className="shrink-0 font-bold text-violet-300">{alert.metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* AI Executive Insights */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live recommendations</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Based on current analytics
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {executiveInsights.map((insight) => (
                <div key={insight.title} className={`rounded-2xl border bg-slate-900/40 p-5 flex flex-col justify-between min-h-[185px] backdrop-blur-sm transition hover:border-white/10 ${insight.tone === "critical" ? "border-rose-500/20" : insight.tone === "warning" ? "border-amber-500/20" : insight.tone === "positive" ? "border-emerald-500/20" : "border-sky-500/20"}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-slate-300">{insight.alertType}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{insight.title}</h4>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      💡 <strong>Reasoning:</strong> {insight.reason}
                    </p>
                    <div className="flex gap-4 text-[9px] text-slate-500 font-bold pt-1">
                      <span>AFFECTED: <span className="text-slate-350">{insight.affected}</span></span>
                      <span>METRIC: <span className="text-violet-400">{insight.score}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Operational alert summary */}
          <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Operational alert summary</h2></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { type: highRiskCount > 0 ? "HIGH PRIORITY" : supportQueueCount > 0 ? "SUPPORT" : "STABLE", label: "Student support signal", note: `${highRiskCount} high risk · ${supportCount} need support · ${notStartedCount} not started`, icon: ShieldAlert },
                { type: inactiveCount > 0 ? "ENGAGEMENT" : "STABLE", label: "Engagement signal", note: inactiveCount + " students inactive in the last seven days", icon: UserX },
                { type: enrollmentRate < 90 && totalStudents > 0 ? "DATA GAP" : "STABLE", label: "Enrollment coverage", note: enrolledStudents + " of " + totalStudents + " students enrolled in classes", icon: Target },
              ].map((alert) => {
                const Icon = alert.icon;
                return (
                  <div key={alert.label} className="rounded-xl border border-white/5 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2"><Icon className="h-4 w-4 text-violet-400" /><span className="rounded border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-violet-300">{alert.type}</span></div>
                    <p className="mt-3 text-xs font-bold text-white">{alert.label}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{alert.note}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
