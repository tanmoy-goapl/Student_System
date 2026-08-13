"use client";

import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { 
  Users, 
  BookOpen,
  GraduationCap, 
  Activity, 
  Search, 
  Server, 
  Database, 
  TrendingUp, 
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  RefreshCw
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

type AlertSeverity = "critical" | "warning" | "info" | "success";

interface AdminAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  action?: string;
}

interface DepartmentCourse {
  id: number;
  name: string;
  code: string;
  student_count: number;
}

interface DepartmentData {
  id: string;
  name: string;
  short_name: string;
  student_count: number;
  course_count: number;
  active_students: number;
  active_students_today: number;
  inactive_students: number;
  average_confidence: number;
  average_readiness: number;
  courses: DepartmentCourse[];
}

interface DashboardData {
  total_students: number;
  total_student_accounts?: number;
  enrolled_students?: number;
  total_professors: number;
  total_classes: number;
  active_students_today: number;
  average_confidence: number;
  average_readiness: number;
  weak_students: number;
  inactive_students: number;
  departments?: DepartmentData[];
  alerts: AdminAlert[];
  last_updated?: string;
}

interface StudentData {
  id: number;
  name: string;
  confidence: number;
  readiness: number;
  last_active: string;
}

interface ProfessorData {
  id: number;
  name: string;
  classes: number;
  email?: string;
  department?: string | null;
  department_name?: string | null;
}

interface ActivityItem {
  message: string;
  time: string;
}

interface SystemStatus {
  backend: string;
  database: string;
  analytics: string;
  last_sync: string;
}

function StatCard({
  value,
  label,
  gradient,
  icon: Icon,
  subtitle,
}: {
  value: string | number;
  label: string;
  gradient: string;
  icon: any;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl group transition-all duration-300 hover:border-white/10">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br ${gradient}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-3xl font-extrabold text-white mb-1">{value}</div>
          <div className="text-sm font-semibold text-slate-200">{label}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-indigo-500/10`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const alertStyles: Record<AlertSeverity, { icon: typeof AlertTriangle; text: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  warning: { icon: AlertTriangle, text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  info: { icon: Info, text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  success: { icon: CheckCircle, text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const departmentStyles: Record<string, { iconBg: string; border: string; badge: string; bar: string }> = {
  cs: {
    iconBg: "bg-blue-500/15 text-blue-300",
    border: "border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    bar: "bg-gradient-to-r from-blue-500 to-indigo-400",
  },
  ai: {
    iconBg: "bg-violet-500/15 text-violet-300",
    border: "border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    bar: "bg-gradient-to-r from-violet-500 to-fuchsia-400",
  },
};

function statusClasses(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (["online", "connected", "healthy"].includes(normalized)) {
    return "text-emerald-400";
  }
  if (["degraded", "unavailable", "offline"].includes(normalized)) {
    return "text-rose-400";
  }
  return "text-amber-400";
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "professors">("overview");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [professors, setProfessors] = useState<ProfessorData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showLoader = false, signal?: AbortSignal) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const fetchJson = async <T,>(url: string): Promise<T> => {
        const response = await fetch(url, { cache: "no-store", signal });
        if (!response.ok) throw new Error("Admin request failed (" + response.status + ")");
        return response.json() as Promise<T>;
      };

      const [dashboard, studentRows, professorRows, activityRows, status] = await Promise.all([
        fetchJson<DashboardData>("/api/admin/dashboard"),
        fetchJson<StudentData[]>("/api/admin/students"),
        fetchJson<ProfessorData[]>("/api/admin/professors"),
        fetchJson<ActivityItem[]>("/api/admin/recent-activity"),
        fetchJson<SystemStatus>("/api/admin/system-status"),
      ]);

      setDashboardData(dashboard);
      setStudents(studentRows);
      setProfessors(professorRows);
      setActivities(activityRows);
      setSystemStatus(status);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Failed to load admin dashboard data", err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(true, controller.signal);
    const refreshTimer = window.setInterval(() => loadData(false), 30000);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [loadData]);

  if (loading) {
    return <Loader fullScreen text="Loading dashboard data..." />;
  }

  // Filter students based on search
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-8 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Platform Admin Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Live platform overview · Updated {dashboardData?.last_updated ? new Date(dashboardData.last_updated).toLocaleTimeString() : "now"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-violet-500/30 hover:bg-violet-500/10 disabled:opacity-50"
            >
              <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10">
            {(["overview", "students", "professors"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold capitalize relative transition-colors ${
                  activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                  value={dashboardData?.enrolled_students ?? dashboardData?.total_students ?? 0}
                  label="Enrolled Students"
                  gradient="from-blue-600 to-indigo-600"
                  icon={GraduationCap}
                  subtitle={(dashboardData?.total_student_accounts ?? dashboardData?.total_students ?? 0) + " student accounts · " + (dashboardData?.total_classes ?? 0) + " courses"}
                />
                <StatCard
                  value={dashboardData?.total_professors ?? 0}
                  label="Total Professors"
                  gradient="from-purple-600 to-violet-600"
                  icon={Users}
                />
                <StatCard
                  value={dashboardData?.active_students_today ?? 0}
                  label="Active Today"
                  gradient="from-cyan-500 to-blue-500"
                  icon={Activity}
                  subtitle={`${dashboardData?.inactive_students ?? 0} inactive (no activity in 7 days)`}
                />
                <StatCard
                  value={`${dashboardData?.average_confidence ?? 0}%`}
                  label="Average Confidence"
                  gradient="from-amber-500 to-orange-500"
                  icon={TrendingUp}
                />
                <StatCard
                  value={`${dashboardData?.average_readiness ?? 0}%`}
                  label="Average Readiness"
                  gradient="from-sky-500 to-cyan-500"
                  icon={CheckCircle}
                />
              </div>

              {/* Department Overview */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-lg font-bold">Departments</h2>
                    <p className="text-xs text-slate-500">Live student, course, and performance summaries by department</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {(dashboardData?.departments ?? []).map((department) => {
                    const style = departmentStyles[department.id] ?? departmentStyles.cs;
                    const confidence = Math.min(100, Math.max(0, department.average_confidence));
                    const readiness = Math.min(100, Math.max(0, department.average_readiness));
                    return (
                      <article key={department.id} className={"rounded-2xl border bg-slate-900/40 p-6 backdrop-blur-xl " + style.border}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + style.iconBg}>
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white">{department.name}</h3>
                              <p className="mt-1 text-xs text-slate-400">
                                {department.student_count} unique students · {department.course_count} courses
                              </p>
                            </div>
                          </div>
                          <span className={"rounded-full border px-2.5 py-1 text-xs font-bold " + style.badge}>
                            {department.short_name}
                          </span>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                              <span>Confidence</span>
                              <span className="font-bold text-slate-200">{department.average_confidence}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className={"h-full rounded-full " + style.bar} style={{ width: confidence + "%" }} />
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                              <span>Readiness</span>
                              <span className="font-bold text-slate-200">{department.average_readiness}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className={"h-full rounded-full " + style.bar} style={{ width: readiness + "%" }} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <BookOpen className="h-3.5 w-3.5" />
                            Courses
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {department.courses.map((course) => (
                              <span
                                key={course.id}
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300"
                                title={course.student_count + " enrolled students"}
                              >
                                {course.name} <span className="text-slate-500">· {course.code}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs">
                          <span className="text-emerald-300">{department.active_students} active in 7 days</span>
                          <span className="text-slate-500">{department.inactive_students} inactive</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  {dashboardData?.enrolled_students ?? 0} unique students are enrolled across {dashboardData?.total_classes ?? 0} courses.
                  Students enrolled in both departments are counted once within each relevant department.
                </p>
              </section>

              {/* Live AI Alerts */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <div>
                    <h2 className="text-lg font-bold">AI Alerts</h2>
                    <p className="text-xs text-slate-500">Generated from live confidence, activity, and classroom metrics</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(dashboardData?.alerts ?? []).map((alert) => {
                    const config = alertStyles[alert.severity];
                    const Icon = config.icon;
                    return (
                      <div
                        key={alert.id}
                        className={"rounded-2xl border p-5 " + config.bg + " " + config.border}
                      >
                        <div className="flex items-start gap-3">
                          <div className={"rounded-xl border p-2 " + config.bg + " " + config.border}>
                            <Icon className={"h-4 w-4 " + config.text} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                              {alert.metric && (
                                <span className={"rounded-full border px-2 py-1 text-[10px] font-bold " + config.text + " " + config.border}>
                                  {alert.metric}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-slate-300">{alert.message}</p>
                            {alert.action && (
                              <p className={"mt-3 text-[10px] font-bold uppercase tracking-wider " + config.text}>
                                Recommendation: {alert.action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Activity and System Status Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Recent Activity
                  </h2>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {activities.length > 0 ? (
                      activities.map((act, index) => (
                        <div key={index} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.01] px-2 rounded-lg transition-colors">
                          <span className="text-slate-200 text-sm font-medium">{act.message}</span>
                          <span className="text-xs text-slate-500 whitespace-nowrap ml-4">{act.time}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">No recent activity detected.</p>
                    )}
                  </div>
                </div>

                {/* System Status */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Server className="w-5 h-5 text-emerald-400" />
                      System Status
                    </h2>
                    <div className="space-y-4">
                      {[
                        { label: "Backend API", value: systemStatus?.backend || "unknown", StatusIcon: Server },
                        { label: "Database Connection", value: systemStatus?.database || "unknown", StatusIcon: Database },
                        { label: "Analytics Engine", value: systemStatus?.analytics || "unknown", StatusIcon: TrendingUp },
                      ].map(({ label, value, StatusIcon }) => {
                        const tone = statusClasses(value);
                        const dot = tone === "text-emerald-400" ? "bg-emerald-400" : tone === "text-rose-400" ? "bg-rose-400" : "bg-amber-400";
                        return (
                          <div key={label} className="flex justify-between items-center py-3 border-b border-white/5">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                              <StatusIcon className={"h-4 w-4 " + tone} />
                              {label}
                            </span>
                            <span className={"flex items-center gap-2 text-sm font-bold " + tone}>
                              <span className={"h-2 w-2 rounded-full " + dot} />
                              {value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span>Database Sync status</span>
                    <span>Last checked: {systemStatus?.last_sync || "Just now"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Search bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white w-full transition-all placeholder:text-slate-500"
                />
              </div>

              {/* Students Table */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">Name</th>
                        <th className="px-6 py-4 font-semibold">Confidence</th>
                        <th className="px-6 py-4 font-semibold">Readiness</th>
                        <th className="px-6 py-4 font-semibold text-right">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4 font-semibold text-white">{student.name}</td>
                            <td className="px-6 py-4">
                              <span className={`font-bold ${
                                student.confidence >= 75 ? "text-emerald-400" : student.confidence >= 60 ? "text-indigo-400" : "text-rose-400"
                              }`}>
                                {student.confidence}%
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-300">
                              {student.readiness}%
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400 text-right">
                              {student.last_active}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                            No students found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "professors" && (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Department</th>
                      <th className="px-6 py-4 font-semibold text-right">Assigned Classes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {professors.length > 0 ? (
                      professors.map((prof) => (
                        <tr key={prof.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{prof.name}</td>
                          <td className="px-6 py-4 text-sm text-cyan-300">
                            {prof.department_name || prof.department || "Unassigned"}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-300 text-right">
                            {prof.classes}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                          No professors registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
