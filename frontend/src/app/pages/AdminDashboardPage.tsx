"use client";

import { useState, useEffect } from "react";
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
  Clock
} from "lucide-react";

import { OfflineState, ErrorState, CardSkeleton, TableSkeleton, ListSkeleton } from "@/components/UIStateSystem";

interface DashboardData {
  total_students: number;
  total_professors: number;
  total_classes: number;
  active_students_today: number;
  average_confidence: number;
  average_readiness: number;
  weak_students: number;
  inactive_students: number;
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

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "professors">("overview");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasError, setHasError] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [professors, setProfessors] = useState<ProfessorData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setHasError(false);
      const [dashRes, studentsRes, profsRes, actRes, statusRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/students"),
        fetch("/api/admin/professors"),
        fetch("/api/admin/recent-activity"),
        fetch("/api/admin/system-status"),
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (profsRes.ok) setProfessors(await profsRes.json());
      if (actRes.ok) setActivities(await actRes.json());
      if (statusRes.ok) setSystemStatus(await statusRes.json());
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter students based on search
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-8 min-h-screen bg-[#020617] text-white relative">
      <OfflineState />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Platform Admin Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage system overview, users, and curriculum</p>
        </div>
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

      {hasError ? (
        <ErrorState message="Failed to load platform stats." onRetry={loadData} />
      ) : loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ListSkeleton count={4} />
            <ListSkeleton count={4} />
          </div>
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
          <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              value={dashboardData?.total_students ?? 0}
              label="Total Students"
              gradient="from-blue-600 to-indigo-600"
              icon={GraduationCap}
              subtitle={`${dashboardData?.weak_students ?? 0} weak students (< 60% confidence)`}
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
              subtitle={`${dashboardData?.inactive_students ?? 0} students had no activity in the last 7 days`}
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
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm font-semibold text-slate-400">Backend API</span>
                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {systemStatus?.backend || "online"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm font-semibold text-slate-400">Database Connection</span>
                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {systemStatus?.database || "connected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm font-semibold text-slate-400">Analytics Engine</span>
                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {systemStatus?.analytics || "healthy"}
                    </span>
                  </div>
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
                        <td className="px-6 py-4 text-slate-400 text-right">
                          {student.last_active}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No students found matching search term.
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
        <div className="space-y-6">
          {/* Professors Table */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Professor Name</th>
                    <th className="px-6 py-4 font-semibold text-right">Assigned Classes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {professors.length > 0 ? (
                    professors.map((prof) => (
                      <tr key={prof.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{prof.name}</td>
                        <td className="px-6 py-4 text-indigo-400 font-bold text-right">
                          {prof.classes}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                        No professors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}