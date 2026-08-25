"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  BarChart3, Users, TrendingUp, Sparkles, Clock, Calendar, 
  ChevronDown, Download, AlertTriangle, CheckCircle, FileText
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { DashboardContentLoader } from "@/components/DashboardLoading";

// ── Types ───────────────────────────────────────────────────
interface ClassOption { id: number; name: string }

interface OverviewData {
  avgScore: number;
  engagementRate: number;
  atRiskStudents: number;
  topicMastery: number;
}

interface AiInsight {
  title: string;
  desc: string;
  badge: string;
  badgeType: "critical" | "warning" | "success" | "info";
}

interface TopicItem { name: string; score: number; status: "NOT_STARTED" | "WEAK" | "AVERAGE" | "GOOD" }
interface ClassTopics { className: string; avgScore: number; topics: TopicItem[] }

interface StudentRisk { name: string; score: number }
interface RiskAnalysis { high: StudentRisk[]; medium: StudentRisk[]; improving: StudentRisk[] }

interface EngagementData {
  attendance: number;
  quizParticipation: number;
  revisionConsistency: number;
  contentInteraction: number;
}

interface InsightsData {
  classes: ClassOption[];
  overview: OverviewData;
  aiInsights: AiInsight[];
  topicMastery: ClassTopics[];
  riskAnalysis: RiskAnalysis;
  engagement: EngagementData;
}

// ── Badge color map ─────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  warning:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  success:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  info:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

// ── Component ───────────────────────────────────────────────
export default function InsightsPage() {
  const searchParams = useSearchParams();
  const parsedClassId = Number(searchParams?.get("class_id") || 0);
  const requestedClassId = Number.isInteger(parsedClassId) && parsedClassId > 0
    ? parsedClassId : 0;
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState(requestedClassId);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const refreshController = useRef<AbortController | null>(null);

  const fetchInsights = async (classId: number, showLoading = true) => {
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("Authentication required. Please sign in again.");
      const url = `/api/professor/insights?professor_id=${userId}&class_id=${classId}`;
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("Failed to load insights");
      const json: InsightsData = await res.json();
      setData(json);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (showLoading) {
        setError(err.message || "Something went wrong");
      } else {
        console.error("Silent Insights refresh failed:", err);
      }
    } finally {
      if (showLoading && refreshController.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setSelectedClassId(requestedClassId);
  }, [requestedClassId]);

  useEffect(() => {
    fetchInsights(selectedClassId, true);
    const refreshTimer = window.setInterval(() => {
      fetchInsights(selectedClassId, false);
    }, 30000);
    return () => {
      window.clearInterval(refreshTimer);
      refreshController.current?.abort();
    };
  }, [selectedClassId]);

  // ── Derived overview cards ────────────────────────────────
  const overviewCards = data ? [
    { label: "Avg Class Score", value: `${data.overview.avgScore}%`, subtitle: `Across ${data.classes.length} class${data.classes.length !== 1 ? "es" : ""}`, icon: TrendingUp, gradient: "from-blue-600 to-indigo-500" },
    { label: "Engagement Rate", value: `${data.overview.engagementRate}%`, subtitle: "Any quiz or practice activity in the last 7 days", icon: CheckCircle, gradient: "from-emerald-500 to-teal-500" },
    { label: "At-Risk Students", value: `${data.overview.atRiskStudents}`, subtitle: "Accuracy below 50% or confidence below 40%", icon: AlertTriangle, gradient: "from-rose-500 to-red-500" },
    { label: "Topic Mastery", value: `${data.overview.topicMastery}%`, subtitle: "Question-weighted accuracy on attempted topics", icon: BookOpenIcon, gradient: "from-indigo-600 to-purple-600" },
  ] : [];

  // ── Engagement metrics ────────────────────────────────────
  const engagementMetrics = data ? [
    { label: "Active in 7 Days", value: `${data.engagement.attendance}%`, color: "text-blue-400", bg: "bg-blue-500" },
    { label: "Quiz Participation", value: `${data.engagement.quizParticipation}%`, color: "text-purple-400", bg: "bg-purple-500" },
    { label: "Curriculum Progress", value: `${data.engagement.revisionConsistency}%`, color: "text-amber-400", bg: "bg-amber-500" },
    { label: "Topic Activity", value: `${data.engagement.contentInteraction}%`, color: "text-emerald-400", bg: "bg-emerald-500" },
  ] : [];

  // ── Risk columns ──────────────────────────────────────────
  const riskColumns = data ? [
    {
      title: "High Risk",
      count: `${data.riskAnalysis.high.length} student${data.riskAnalysis.high.length !== 1 ? "s" : ""}`,
      color: "text-rose-400",
      bg: "bg-rose-500/5 border-rose-500/10",
      btnColor: "bg-rose-600 hover:bg-rose-700",
      students: data.riskAnalysis.high,
    },
    {
      title: "Medium Risk",
      count: `${data.riskAnalysis.medium.length} student${data.riskAnalysis.medium.length !== 1 ? "s" : ""}`,
      color: "text-amber-400",
      bg: "bg-amber-500/5 border-amber-500/10",
      btnColor: "bg-amber-600/30 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20",
      students: data.riskAnalysis.medium,
    },
    {
      title: "Improving",
      count: `${data.riskAnalysis.improving.length} student${data.riskAnalysis.improving.length !== 1 ? "s" : ""}`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5 border-emerald-500/10",
      btnColor: "bg-emerald-650/30 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20",
      students: data.riskAnalysis.improving,
    },
  ] : [];

  const selectedClassName = selectedClassId === 0
    ? "All Classes"
    : data?.classes.find(c => c.id === selectedClassId)?.name || "All Classes";

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Insights</h1>
            <p className="text-[10px] text-slate-400">Analyze class-wide performance and learning outcomes</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Class Selector */}
            <div className="relative">
              <button
                onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition"
              >
                <span>{selectedClassName}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {classDropdownOpen && data && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => { setSelectedClassId(0); setClassDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition ${selectedClassId === 0 ? "text-blue-400 bg-blue-500/10" : "text-slate-300"}`}
                  >
                    All Classes
                  </button>
                  {data.classes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClassId(c.id); setClassDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition ${selectedClassId === c.id ? "text-blue-400 bg-blue-500/10" : "text-slate-300"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchInsights(selectedClassId, false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* ── Loading State ─────────────────────────── */}
          {loading && (
            <DashboardContentLoader text="Loading insights..." />
          )}

          {/* ── Error State ──────────────────────────── */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
              <span className="text-xs text-rose-400 font-semibold">{error}</span>
              <button onClick={() => fetchInsights(selectedClassId)} className="mt-2 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white transition">
                Retry
              </button>
            </div>
          )}

          {/* ── Data State ───────────────────────────── */}
          {!loading && !error && data && (
            <>
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
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                          <Icon className="w-4.5 h-4.5 text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Insights Section */}
              {data.aiInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Data-Driven Insights</h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" /> Live Database Metrics
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.aiInsights.map((rec, idx) => (
                      <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[140px] backdrop-blur-sm hover:border-white/10 transition">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 text-[7px] font-extrabold tracking-wider rounded border ${BADGE_STYLES[rec.badgeType] || BADGE_STYLES.info}`}>
                              {rec.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white leading-snug">{rec.title}</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{rec.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Mastery Analysis */}
              {data.topicMastery.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Topic Mastery Analysis</h2>
                  <div className={`grid grid-cols-1 ${data.topicMastery.length >= 2 ? "lg:grid-cols-2" : ""} gap-6`}>
                    {data.topicMastery.map((cls, cidx) => (
                      <div key={cidx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                            <h3 className="text-xs font-bold text-slate-300">{cls.className}</h3>
                            <span className={`text-[10px] font-semibold ${cls.avgScore === 0 ? "text-slate-500" : cls.avgScore >= 75 ? "text-emerald-400" : cls.avgScore >= 55 ? "text-amber-400" : "text-rose-400"}`}>
                              {cls.avgScore}% Avg
                            </span>
                          </div>
                          <div className="space-y-3 h-[300px] overflow-y-auto pr-2 purple-scrollbar">
                            {cls.topics.map((top, i) => (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold text-slate-300">
                                  <span>{top.name}</span>
                                  <span className={top.status === "NOT_STARTED" ? "text-slate-600" : top.status === "WEAK" ? "text-rose-400" : top.status === "GOOD" ? "text-emerald-400" : "text-slate-400"}>
                                    {top.score}% {top.status}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      top.status === "NOT_STARTED" ? "bg-white/10" :
                                      top.status === "GOOD" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : 
                                      "bg-gradient-to-r from-blue-500 to-indigo-500"
                                    }`} 
                                    style={{ width: `${top.score}%` }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Risk Analysis Columns */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Risk Analysis</h2>
                  <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                    Rule-Based Categories
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {riskColumns.map((col, idx) => (
                    <div key={idx} className={`rounded-2xl border p-5 space-y-4 flex flex-col justify-between ${col.bg}`}>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className={`text-xs font-bold ${col.color}`}>{col.title}</h3>
                          <span className="text-[9px] text-slate-500 font-semibold">{col.count}</span>
                        </div>
                        <div className="space-y-2 h-[250px] overflow-y-auto pr-1 purple-scrollbar">
                          {col.students.length === 0 && (
                            <div className="text-[10px] text-slate-500 text-center py-4">No students in this category</div>
                          )}
                          {col.students.map((st, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5 hover:border-white/10 transition mb-2">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[8px] font-bold text-white">
                                  {st.name.split(" ").map(n => n[0]).join("")}
                                </div>
                                <span className="text-[10px] text-slate-200 font-semibold">{st.name}</span>
                              </div>
                              <span className={`text-[10px] font-bold ${col.color}`}>{st.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Analytics */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Engagement Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {engagementMetrics.map((met, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm hover:border-white/10 transition flex flex-col justify-between min-h-[110px]">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">{met.label}</span>
                        <h3 className={`text-2xl font-extrabold mt-1 ${met.color}`}>{met.value}</h3>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1 mt-3 overflow-hidden">
                        <div className={`h-full rounded-full ${met.bg}`} style={{ width: met.value }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Empty State ──────────────────────────── */}
          {!loading && !error && data && data.classes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <BarChart3 className="w-8 h-8 text-slate-600" />
              <span className="text-xs text-slate-500 font-semibold">No classes found. Create a class to see insights.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Fallback stub for missing import
function BookOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
