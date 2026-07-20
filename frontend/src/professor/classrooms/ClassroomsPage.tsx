"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, Users, TrendingUp, AlertTriangle, Search, 
  ChevronDown, UserPlus, PlusCircle, Sparkles, Clock, FileText, X
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import Loader from "@/components/Loader";
import { createClass } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ClassCardData {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  avgScore: number;
  engagement: number;
  badge: "ACTIVE" | "AT RISK" | "ARCHIVED";
  badgeColor: string;
  badgeBg: string;
  weakTopics: string[];
  insight: string;
  insightColor: string;
  insightBg: string;
  actionRequired?: string;
  isRedButton?: boolean;
  button1: string;
  button2: string;
  button3: string;
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
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const professorId = userId ? parseInt(userId, 10) : 1;
      const res = await fetch(`/api/classroom/my_classes/${professorId}`);
      if (!res.ok) throw new Error("Failed to load classes");
      
      const data = await res.json();
      const myClasses = data.classes || [];
      
      const mapped: ClassCardData[] = myClasses.map((c: any) => {
        const nameLower = c.name.toLowerCase();
        
        // Preserve aesthetics of Physics, Chemistry, Mathematics
        let avgScore = 75;
        let engagement = 80;
        let badge: "ACTIVE" | "AT RISK" | "ARCHIVED" = "ACTIVE";
        let weakTopics = ["Cell Division", "Genetics"];
        let insight = "Class showing stable engagement and performance.";
        let insightColor = "text-emerald-300";
        let insightBg = "bg-emerald-500/5 border border-emerald-500/10";
        let actionRequired: string | undefined = undefined;
        let isRedButton = false;
        let button2 = "Generate Quiz";
        let button3 = "Insights";

        if (nameLower.includes("physic")) {
          avgScore = 71;
          engagement = 84;
          weakTopics = ["Wave Optics", "Thermodynamics"];
          insight = "Students need revision in Wave Optics — 14 below threshold";
          insightColor = "text-blue-300";
          insightBg = "bg-blue-500/5 border border-blue-500/10";
        } else if (nameLower.includes("chemist")) {
          avgScore = 67;
          engagement = 72;
          weakTopics = ["Organic Chemistry", "Electrochemistry"];
          insight = "Engagement dropped significantly in Chemistry labs this week";
          insightColor = "text-purple-300";
          insightBg = "bg-purple-500/5 border border-purple-500/10";
        } else if (nameLower.includes("math")) {
          avgScore = 58;
          engagement = 61;
          badge = "AT RISK";
          weakTopics = ["Calculus", "Integration", "Probability"];
          insight = "Multiple students falling behind — consider revision session for Calculus";
          insightColor = "text-rose-300";
          insightBg = "bg-rose-500/5 border border-rose-500/10";
          actionRequired = "ACTION REQUIRED - 8 STUDENTS CRITICALLY AT RISK";
          isRedButton = true;
          button2 = "Create Revision";
          button3 = "View At-Risk";
        }

        const badgeColor = badge === "AT RISK" 
          ? "text-rose-400 border-rose-500/20 bg-rose-500/10" 
          : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
        const badgeBg = badge === "AT RISK" ? "bg-rose-500" : "bg-emerald-500";

        return {
          id: String(c.id),
          name: c.name,
          grade: c.course_code || "Grade 12",
          studentCount: c.student_count || 0,
          avgScore,
          engagement,
          badge,
          badgeColor,
          badgeBg,
          weakTopics,
          insight,
          insightColor,
          insightBg,
          actionRequired,
          isRedButton,
          button1: "Open Class",
          button2,
          button3
        };
      });

      setClasses(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
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
      const professorId = userId ? parseInt(userId, 10) : 1;
      
      const res = await createClass({
        name: className.trim(),
        course_code: courseCode.trim(),
        professor_id: professorId
      });

      if (!res.success) {
        throw new Error("Failed to create classroom.");
      }

      setClassName("");
      setCourseCode("");
      setIsCreateOpen(false);
      setLoading(true);
      await fetchClasses();
    } catch (err: any) {
      setCreateError(err.message || "An error occurred.");
    } finally {
      setCreateLoading(false);
    }
  };

  const totalStudents = useMemo(() => {
    return classes.reduce((acc, c) => acc + c.studentCount, 0);
  }, [classes]);

  const atRiskClassesCount = useMemo(() => {
    return classes.filter(c => c.badge === "AT RISK").length;
  }, [classes]);

  const averageEngagement = useMemo(() => {
    if (classes.length === 0) return 0;
    const sum = classes.reduce((acc, c) => acc + c.engagement, 0);
    return Math.round(sum / classes.length);
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
      subtitle: "Enrolled in classes",
      icon: Users,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Avg Engagement",
      value: `${averageEngagement}%`,
      subtitle: "Classroom analytics",
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

  const recommendations = [
    {
      type: "RECOMMENDED ACTION",
      title: "Conduct Revision Session — Wave Optics",
      desc: "Physics Grade 12 • 14 students below 60% • Topic avg 52%",
      btn: "Schedule Session",
      icon: BookOpen,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      type: "RECOMMENDED ACTION",
      title: "Create Practice Quiz — Calculus Basics",
      desc: "Mathematics Grade 12 • Reinforce integration fundamentals",
      btn: "Generate Quiz",
      icon: FileText,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      type: "ENGAGEMENT ALERT",
      title: "Engagement Dropping in Mathematics",
      desc: "Down from 78% to 61% over the past 2 weeks • 12 inactive students",
      btn: "View Students",
      icon: TrendingUp,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      type: "ASSIGNMENT",
      title: "Send Assignment Reminders — Chemistry",
      desc: "11 students haven't submitted Lab Report 3 • Due 2 days ago",
      btn: "Notify Students",
      icon: Clock,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) || cls.grade.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && cls.badge === "ACTIVE";
    if (activeTab === "at-risk") return matchesSearch && cls.badge === "AT RISK";
    if (activeTab === "archived") return matchesSearch && cls.badge === "ARCHIVED";
    return matchesSearch;
  });

  if (loading) {
    return <Loader fullScreen text="Loading Classes..." />;
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

            {/* Import Students */}
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition">
              <UserPlus className="w-3.5 h-3.5 text-slate-300" />
              <span>Import Students</span>
            </button>

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
                          <p className="text-[10px] text-slate-400 font-medium">{cls.grade}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold tracking-wider rounded border ${cls.badgeColor}`}>
                          {cls.badge}
                        </span>
                      </div>

                      {/* Stats Metrics Row */}
                      <div className="grid grid-cols-3 gap-1 text-center py-2.5 border-y border-white/5">
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-white">{cls.studentCount}</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Students</p>
                        </div>
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-blue-400">{cls.avgScore}%</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Avg Score</p>
                        </div>
                        <div className="bg-black/20 rounded py-1 border border-white/5">
                          <p className="text-xs font-bold text-teal-400">{cls.engagement}%</p>
                          <p className="text-[7px] uppercase tracking-widest text-slate-500">Engagement</p>
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

                      {/* Insight Box */}
                      <div className={`p-2.5 rounded-lg text-[9px] flex items-center gap-2 ${cls.insightBg}`}>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                        <p className={`font-semibold ${cls.insightColor}`}>{cls.insight}</p>
                      </div>

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
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white transition ${
                          cls.isRedButton ? "bg-rose-600 hover:bg-rose-700 shadow shadow-rose-600/10" : "bg-blue-500 hover:bg-blue-600 shadow shadow-blue-500/10"
                        }`}
                      >
                        {cls.button1}
                      </button>
                      <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                        {cls.button2}
                      </button>
                      <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                        {cls.button3}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendations */}
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

          {/* Quick Actions Footer */}
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
