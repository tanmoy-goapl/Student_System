"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen, Users, TrendingUp, BarChart3, AlertTriangle, Search,
  UserPlus, PlusCircle, Sparkles, Target, Activity, ArrowUpRight,
  ArrowDownRight, Minus, X, Trash2
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { DashboardLoadingShell } from "@/components/DashboardLoading";
import { createClass, DepartmentOption, deleteClass, listClassroomDepartments } from "@/lib/api";
import { useRouter } from "next/navigation";

interface WeakTopicData {
  name: string;
  score: number;
}

interface ClassCardData {
  department: string;
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  avgScore: number;
  engagement: number;
  analyticsAvailable: boolean;
  studentIds: string[];
  badge: "ACTIVE" | "AT RISK" | "ARCHIVED";
  badgeColor: string;
  badgeBg: string;
  weakTopics: string[];
  weakTopicDetails: WeakTopicData[];
  activeStudents: number;
  inactiveStudents: number;
  scoreDelta: number | null;
  recentQuizCount: number;
  insight: string;
  insightColor: string;
  insightBg: string;
  actionRequired?: string;
  isRedButton?: boolean;
 }

function resolveDepartment(classroom: any): string {
  const saved = String(classroom.department || "").trim().toUpperCase();
  if (saved) return saved;

  const identity = String(classroom.name || "") + " " + String(classroom.course_code || classroom.code || "");
  return /(^|\s)(AI|ML)(\d*)\b|MACHINE\s+LEARNING|ARTIFICIAL\s+INTELLIGENCE/i.test(identity)
    ? "AI"
    : "CS";
}

export default function ClassroomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassCardData[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "at-risk" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create class modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [department, setDepartment] = useState("CS");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("Authentication required. Please sign in again.");
      const professorId = parseInt(userId, 10);
      const res = await fetch(`/api/classroom/my_classes/${professorId}`);
      if (!res.ok) throw new Error("Failed to load classes");

      const data = await res.json();
      const myClasses = data.classes || [];

      const mappedPromises = myClasses.map(async (c: any) => {
        let avgScore = 0;
        let engagement = 0;
        let analyticsAvailable = false;
        let studentIds: string[] = [];
        let badge: "ACTIVE" | "AT RISK" | "ARCHIVED" = "ACTIVE";
        let weakTopics: string[] = [];
        let weakTopicDetails: WeakTopicData[] = [];
        let activeStudents = 0;
        let inactiveStudents = 0;
        let scoreDelta: number | null = null;
        let recentQuizCount = 0;
        let insight = "";
        let insightColor = "text-emerald-300";
        let insightBg = "bg-emerald-500/5 border border-emerald-500/10";
        let actionRequired: string | undefined = undefined;
        let isRedButton = false;

        try {
          const analyticsRes = await fetch(`/api/professor/class/${c.id}?professor_id=${encodeURIComponent(String(professorId))}`);
          if (analyticsRes.ok) {
            const aData = await analyticsRes.json();
            if (aData && aData.metrics) {
              analyticsAvailable = true;
              avgScore = Math.round(aData.metrics.averageAccuracy || 0);
              engagement = Math.round(aData.metrics.engagementRate || 0);
              studentIds = (aData.students || []).map((student: any) => String(student.id));
              activeStudents = Number(aData.metrics.activeStudents || 0);
              inactiveStudents = Number(aData.metrics.inactiveStudents || 0);
              scoreDelta = typeof aData.metrics.scoreDelta === "number" ? aData.metrics.scoreDelta : null;
              recentQuizCount = Number(aData.metrics.recentQuizCount || 0);

              weakTopicDetails = (aData.metrics.weakTopics || [])
                .filter((topic: any) => topic && typeof topic.name === "string" && typeof topic.score === "number")
                .slice(0, 5)
                .map((topic: any) => ({ name: topic.name, score: Number(topic.score) }));
              weakTopics = weakTopicDetails.length > 0
                ? weakTopicDetails.slice(0, 3).map(topic => topic.name)
                : ["No weak topics recorded"];

              // The API owns risk classification. The card only renders it,
              // so classes and insights cannot disagree about the threshold.
              if (analyticsAvailable && Number(aData.metrics.atRiskStudents || 0) > 0) {
                badge = "AT RISK";

                actionRequired = "ACTION REQUIRED - " + aData.metrics.atRiskStudents + " HIGH-RISK STUDENTS";
                isRedButton = true;
               }
              if (aData.metrics.alerts && aData.metrics.alerts.length > 0) {
                insight = aData.metrics.alerts[0];
                if (insight.toLowerCase().includes("critically low") || insight.toLowerCase().includes("needs review")) {
                  insightColor = "text-rose-300";
                  insightBg = "bg-rose-500/5 border border-rose-500/10";
                } else {
                  insightColor = "text-amber-300";
                  insightBg = "bg-amber-500/5 border border-amber-500/10";
                }
              }
            }
          }
        } catch (e) {
          console.error(`Failed to load dynamic analytics for class ${c.id}:`, e);
        }

        const badgeColor = badge === "AT RISK"
          ? "text-rose-450 border-rose-500/20 bg-rose-500/10"
          : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
        const badgeBg = badge === "AT RISK" ? "bg-rose-500" : "bg-emerald-500";

        return {
          department: resolveDepartment(c),
          id: String(c.id),
          name: c.name,
          grade: c.course_code || "Grade 12",
          studentCount: c.student_count || 0,
          avgScore,
          engagement,
          analyticsAvailable,
          studentIds,
          badge,
          badgeColor,
          badgeBg,
          weakTopics,
          weakTopicDetails,
          activeStudents,
          inactiveStudents,
          scoreDelta,
          recentQuizCount,
          insight,
          insightColor,
          insightBg,
          actionRequired,
          isRedButton,
        };
      });

      const mapped = await Promise.all(mappedPromises);
      setClasses(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const professorId = userId ? parseInt(userId, 10) : NaN;
      if (!Number.isInteger(professorId) || professorId <= 0) return;
      const rows = await listClassroomDepartments(professorId);
      setDepartments(rows);
      if (rows.length > 0 && !rows.some((row) => row.code === department)) {
        setDepartment(rows[0].code);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
      setDepartments([
        { id: "cs", code: "CS", name: "CS Department" },
        { id: "ai", code: "AI", name: "AI Department" },
      ]);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    const refreshTimer = window.setInterval(fetchClasses, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !courseCode.trim()) {
      setCreateError("Please fill in all fields.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("Authentication required. Please sign in again.");
      const professorId = parseInt(userId, 10);

      const res = await createClass({
        name: className.trim(),
        course_code: courseCode.trim(),
        department,
        professor_id: professorId
      });

      if (!res.success) {
        throw new Error("Failed to create classroom.");
      }

      setClassName("");
      setCourseCode("");
      setDepartment(departments[0]?.code || "CS");
      setIsCreateOpen(false);
      setLoading(true);
      await fetchClasses();
    } catch (err: any) {
      setCreateError(err.message || "An error occurred.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteClick = async (classId: number) => {
    const ok = window.confirm("Are you sure you want to delete this class? This will permanently delete all associated curriculum data and student progress reports.");
    if (!ok) return;

    setLoading(true);
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("Authentication required. Please sign in again.");
      const professorId = parseInt(userId, 10);
      const res = await deleteClass(classId, professorId);
      if (res.success) {
        await fetchClasses();
      } else {
        alert(res.message || "Failed to delete class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while deleting the class");
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = useMemo(() => {
    return classes.reduce((total, cls) => total + cls.studentCount, 0);
  }, [classes]);

  const atRiskClassesCount = useMemo(() => {
    return classes.filter(c => c.badge === "AT RISK").length;
  }, [classes]);

  const averageEngagement = useMemo(() => {
    if (classes.length === 0) return 0;
    const sum = classes.reduce((acc, c) => acc + c.engagement, 0);
    return Math.round(sum / classes.length);
  }, [classes]);

  const teachingPriorities = useMemo(() => {
    return classes
      .flatMap(cls => cls.weakTopicDetails.map(topic => ({
        ...topic,
        classId: cls.id,
        className: cls.name,
      })))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [classes]);

  const engagementWatchlist = useMemo(() => {
    return classes
      .filter(cls => cls.analyticsAvailable)
      .slice()
      .sort((a, b) => (
        a.engagement - b.engagement ||
        b.inactiveStudents - a.inactiveStudents
      ))
      .slice(0, 3);
  }, [classes]);

  const performanceMomentum = useMemo(() => {
    return classes
      .filter(cls => cls.analyticsAvailable && cls.scoreDelta !== null)
      .slice()
      .sort((a, b) => Math.abs(b.scoreDelta ?? 0) - Math.abs(a.scoreDelta ?? 0))
      .slice(0, 3);
  }, [classes]);

  const overviewCards = [
    {
      label: "Total Classes",
      value: String(classes.length),
      subtitle: "Active this semester",
      icon: BookOpen,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "Total Students",
      value: String(totalStudents),
      subtitle: "Enrolled across classes",
      icon: Users,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Avg Active Rate",
      value: `${averageEngagement}%`,
      subtitle: "Students active in the last 7 days",
      icon: TrendingUp,
      gradient: "from-indigo-600 to-purple-600",
    },
    {
      label: "At-Risk Classes",
      value: String(atRiskClassesCount),
      subtitle: "Needs immediate attention",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
      actionNeeded: atRiskClassesCount > 0,
    },
  ];

  // Insight panels below are derived from the live class analytics payload.

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) || cls.grade.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && cls.badge === "ACTIVE";
    if (activeTab === "at-risk") return matchesSearch && cls.badge === "AT RISK";
    if (activeTab === "archived") return matchesSearch && cls.badge === "ARCHIVED";
    return matchesSearch;
  });

  if (loading) {
    return <DashboardLoadingShell role="professor" text="Loading Classes..." />;
  }

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Classes</h1>
            <p className="text-[10px] text-slate-400">Manage and monitor all your classes</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 w-44"
              />
            </div>

            {/* Import Students
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition">
              <UserPlus className="w-3.5 h-3.5 text-slate-300" />
              <span>Import Students</span>
            </button>
            */}

            {/* Create Class */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-white" />
              <span>Create Class</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Overview Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Overview</h2>
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
                        {card.actionNeeded && (
                          <span className="mt-2 inline-block px-1.5 py-0.5 text-[8px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                            ACTION NEEDED
                          </span>
                        )}
                      </div>
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Class Insights */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Class Insights</h2>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                Live from class analytics
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Teaching Priorities */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Teaching Priorities</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Lowest measured topic accuracy</p>
                  </div>
                </div>

                {teachingPriorities.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-3">Topic data will appear after students practice.</p>
                ) : (
                  <div className="space-y-2">
                    {teachingPriorities.map(topic => (
                      <button
                        key={topic.classId + "-" + topic.name}
                        onClick={() => router.push("/professor/insights?class_id=" + topic.classId)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-left hover:border-amber-400/30 hover:bg-amber-500/5 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-200 truncate">{topic.name}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{topic.className}</p>
                        </div>
                        <span className={"shrink-0 text-[10px] font-bold " + (topic.score < 50 ? "text-rose-400" : "text-amber-400")}>
                          {topic.score}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Engagement Watchlist */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Engagement Watchlist</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Lowest active rates in 7 days</p>
                  </div>
                </div>

                {engagementWatchlist.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-3">Engagement data is not available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {engagementWatchlist.map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => router.push("/professor/insights?class_id=" + cls.id)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-left hover:border-blue-400/30 hover:bg-blue-500/5 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-200 truncate">{cls.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {cls.activeStudents}/{cls.studentCount} active
                            {cls.inactiveStudents > 0 ? " - " + cls.inactiveStudents + " inactive" : " - no inactive students"}
                          </p>
                        </div>
                        <span className={"shrink-0 text-[10px] font-bold " + (cls.engagement < 60 ? "text-rose-400" : cls.engagement < 80 ? "text-amber-400" : "text-emerald-400")}>
                          {cls.engagement}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Momentum */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Performance Momentum</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Last 7 days vs previous period</p>
                  </div>
                </div>

                {performanceMomentum.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-3">Trend baseline is forming as more quizzes are completed.</p>
                ) : (
                  <div className="space-y-2">
                    {performanceMomentum.map(cls => {
                      const delta = cls.scoreDelta ?? 0;
                      const MomentumIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
                      const tone = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-400";
                      return (
                        <button
                          key={cls.id}
                          onClick={() => router.push("/professor/insights?class_id=" + cls.id)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-left hover:border-emerald-400/30 hover:bg-emerald-500/5 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-200 truncate">{cls.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{cls.recentQuizCount} quiz{cls.recentQuizCount === 1 ? "" : "zes"} in the last 7 days</p>
                          </div>
                          <span className={"shrink-0 flex items-center gap-0.5 text-[10px] font-bold " + tone}>
                            <MomentumIcon className="w-3 h-3" />
                            {delta === 0 ? "Stable" : (delta > 0 ? "+" : "") + delta + " pts"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Your Classes Grid Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Your Classes</h2>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  AI Monitored
                </span>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                  { id: "all", label: "All Classes" },
                  { id: "active", label: "Active" },
                  { id: "at-risk", label: "At Risk" },
                  { id: "archived", label: "Archived" },
                ].map(tb => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={`px-3.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      activeTab === tb.id ? "bg-blue-500 text-white shadow animate-fade-in" : "text-slate-445 hover:text-white"
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards Grid */}
            {filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <BookOpen className="h-12 w-12 text-white/20 mb-3" />
                <p className="text-sm font-semibold text-white/60">No classes found</p>
                <p className="text-xs text-white/30 mt-1 text-center">Click 'Create Class' above to start your first class.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map(cls => (
                  <div key={cls.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[280px] backdrop-blur-sm group hover:border-blue-500/30 hover:bg-slate-900/60 transition duration-300">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">{cls.name}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-medium">{cls.grade}</p>
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300">{cls.department}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[8px] font-extrabold tracking-wider rounded border ${cls.badgeColor}`}>
                            {cls.badge}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(parseInt(cls.id, 10));
                            }}
                            className="p-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/20 hover:text-rose-400 transition cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stats Metrics Row */}
                      <div className="grid grid-cols-3 gap-1 text-center py-2.5 border-y border-white/5">
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-white">{cls.studentCount}</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Students</p>
                        </div>
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-blue-400">{cls.analyticsAvailable ? cls.avgScore + "%" : "N/A"}</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Avg Score</p>
                        </div>
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-teal-400">{cls.analyticsAvailable ? cls.engagement + "%" : "N/A"}</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Active Rate</p>
                        </div>
                      </div>

                      {/* Weak Topics */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block">Weak Topics:</span>
                        <div className="flex flex-wrap gap-1">
                          {cls.weakTopics.map((top, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold">
                              {top}
                            </span>
                          ))}
                        </div>
                      </div>

                      {cls.insight && (
                        <div className={`p-2.5 rounded-lg text-[9px] flex items-center gap-2 ${cls.insightBg}`}>
                          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                          <p className={`font-semibold ${cls.insightColor}`}>{cls.insight}</p>
                        </div>
                      )}

                      {/* Action Required Banner */}
                      {cls.actionRequired && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-rose-400 text-[9px] font-extrabold text-center tracking-wider animate-pulse">
                          ⚠️ {cls.actionRequired}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                      <button
                        onClick={() => router.push(`/classes/${cls.id}`)}
                        className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 shadow shadow-blue-500/10 text-[9px] font-bold uppercase tracking-wider text-white transition"
                      >
                        Open Class
                      </button>
                      <button
                        onClick={() => router.push(`/professor/insights?class_id=${cls.id}`)}
                        className="flex-1 py-1.5 rounded-lg border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10 text-[9px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Analytics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendations
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Recommendations</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4 Turbo
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, idx) => {
                const Icon = rec.icon;
                return (
                  <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/40 p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition hover:border-white/10">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${rec.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">{rec.type}</span>
                        <h4 className="text-[11px] font-bold text-white mt-1 leading-snug">{rec.title}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{rec.desc}</p>
                      </div>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition self-end md:self-center shrink-0">
                      {rec.btn}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          */}

          {/* Quick Actions Footer
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Generate Assignment", desc: "Create for any class", icon: BookOpen, color: "text-blue-400" },
                { title: "Upload Material", desc: "PDFs, notes, slides", icon: UserPlus, color: "text-indigo-400" },
                { title: "Create Practice Test", desc: "AI-generated questions", icon: FileText, color: "text-emerald-400" },
                { title: "Review Weak Students", desc: "Across all classes", icon: AlertTriangle, color: "text-rose-400" },
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
          */}
        </main>
      </div>

      {/* Create Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0F1D] p-6 shadow-2xl text-white">
            <button
              onClick={() => setIsCreateOpen(false)}
              disabled={createLoading}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold">Create New Class</h2>
              <p className="text-xs text-white/45 mt-1">Initialize a new classroom workspace</p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Class Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Class Name</label>
                <input
                  type="text"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder="e.g. Advanced Physics"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-500/55 transition"
                />
              </div>

              {/* Course Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Course Code / Grade</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  placeholder="e.g. PHY-201 or Grade 12"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-500/55 transition"
                />
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-[#0d1424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/55 transition"
                >
                  {departments.length === 0 && <option value="CS">CS Department</option>}
                  {departments.map((row) => (
                    <option key={row.code} value={row.code}>{row.name}</option>
                  ))}
                </select>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createLoading}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !className.trim() || !courseCode.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 px-5 py-2.5 text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-40"
                >
                  {createLoading ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
