"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  Mail,
  ShieldCheck,
  Target,
  TrendingUp,
  RefreshCw,
  UserRound,
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { DashboardContentLoader } from "@/components/DashboardLoading";

interface ProfileData {
  student: { id: number; name: string; email: string; role: string };
  overview: {
    performance: number; progress: number; exposure: number; confidence: number;
    attemptedTopics: number; masteredTopics: number; totalTopics: number;
    isAtRisk: boolean; isActive: boolean;
  };
  stats: {
    totalQuizzes: number; averageQuizScore: number; currentStreak: number;
    longestStreak: number; lastPracticedAt: string | null;
  };
  classes: Array<{
    id: number; name: string; code: string; subject: string;
    performance: number; progress: number; exposure: number; confidence: number;
    attemptedTopics: number; masteredTopics: number; totalTopics: number;
  }>;
  topics: Array<{
    name: string; accuracy: number; confidence: number; status: string;
    sessions: number; questionsAttempted: number; lastPracticedAt: string | null;
  }>;
  recentActivity: Array<{
    id: number; topic: string; score: number;
    questionsAttempted: number; createdAt: string | null;
  }>;
}

const formatDate = (value: string | null) => {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No activity recorded"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const topicStatusStyles: Record<string, string> = {
  STRONG: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  LEARNING: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  WEAK: "text-rose-300 bg-rose-500/10 border-rose-500/20",
  NOT_STARTED: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params?.studentId === "string" ? params.studentId : "";
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let disposed = false;
    let initialLoad = true;
    let inFlight = false;

    const loadProfile = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (initialLoad) setLoading(true);
        else setRefreshing(true);
        if (initialLoad) setError(null);
        const professorId = localStorage.getItem("user_id") || "2";
        const response = await fetch(
          `/api/professor/student/${encodeURIComponent(studentId)}?professor_id=${encodeURIComponent(professorId)}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(response.status === 404
            ? "This student is not enrolled in your classes."
            : "Unable to load this student profile.");
        }
        const profile: ProfileData = await response.json();
        if (!disposed) setData(profile);
      } catch (loadError: unknown) {
        const message = loadError instanceof Error
          ? loadError.message
          : "Unable to load this student profile.";
        if (!disposed && initialLoad) {
          setError(message);
        }
      } finally {
        inFlight = false;
        if (!disposed) {
          setLoading(false);
          setRefreshing(false);
        }
        initialLoad = false;
      }
    };

    loadProfile();
    const refreshTimer = window.setInterval(loadProfile, 30000);
    return () => {
      disposed = true;
      window.clearInterval(refreshTimer);
    };
  }, [studentId]);

  const summary = data ? [
    { label: "Performance", value: `${Math.round(data.overview.performance)}%`, sub: "Accuracy across classes", icon: TrendingUp, color: "from-blue-600 to-indigo-500" },
    { label: "Progress", value: `${Math.round(data.overview.progress)}%`, sub: `${data.overview.masteredTopics} of ${data.overview.totalTopics} topics mastered`, icon: Target, color: "from-purple-600 to-violet-500" },
    { label: "Topic Exposure", value: `${Math.round(data.overview.exposure)}%`, sub: `${data.overview.attemptedTopics} topics attempted`, icon: BookOpen, color: "from-cyan-600 to-teal-500" },
    { label: "Confidence", value: `${Math.round(data.overview.confidence)}%`, sub: "Based on attempts and accuracy", icon: ShieldCheck, color: "from-emerald-600 to-green-500" },
  ] : [];

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      <ProfessorSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="min-h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center gap-4 px-6 py-3">
          <button onClick={() => router.push("/professor/students")} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Students
          </button>
          {data && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold">{data.student.name}</h1>
                <p className="truncate text-[10px] text-slate-400">{data.student.email} - Student ID: S{data.student.id}</p>
              </div>
              <span className={`ml-2 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                data.overview.isAtRisk
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                  : data.overview.isActive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-500/20 bg-slate-500/10 text-slate-300"
              }`}>
                {data.overview.isAtRisk ? "At Risk" : data.overview.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          )}
          {refreshing && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <RefreshCw className="h-3 w-3 animate-spin" /> Syncing metrics
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto purple-scrollbar bg-gradient-to-b from-[#040815] to-[#020617] p-6">
          {loading ? (
            <DashboardContentLoader text="Loading student profile..." />
          ) : error ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
                <CircleAlert className="mx-auto mb-3 h-8 w-8 text-rose-400" />
                <h2 className="text-sm font-bold">Profile unavailable</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{error}</p>
                <button onClick={() => router.push("/professor/students")} className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-xs font-bold transition hover:bg-blue-600">
                  Back to Students
                </button>
              </div>
            </div>
          ) : data ? (
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Live student profile</p>
                  <h2 className="mt-1 text-xl font-bold">Performance overview</h2>
                  <p className="mt-1 text-xs text-slate-400">Metrics are calculated from this student&apos;s enrolled classes and recorded practice activity.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" /> Last practiced: {formatDate(data.stats.lastPracticedAt)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summary.map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-3xl font-extrabold">{card.value}</p>
                          <p className="mt-1 text-xs font-bold text-slate-300">{card.label}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{card.sub}</p>
                        </div>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.color}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="space-y-4 xl:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Class performance</h3>
                      <p className="mt-1 text-[10px] text-slate-500">Exact live metrics for each class enrollment.</p>
                    </div>
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold text-blue-300">
                      {data.classes.length} {data.classes.length === 1 ? "class" : "classes"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {data.classes.map(classroom => (
                      <div key={classroom.id} className="rounded-2xl border border-white/5 bg-slate-900/35 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold">{classroom.name}</h4>
                            <p className="mt-1 text-[10px] text-slate-500">{classroom.code} - {classroom.subject}</p>
                          </div>
                          <span className="text-sm font-extrabold text-blue-300">{Math.round(classroom.performance)}%</span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[
                            ["Progress", Math.round(classroom.progress), "text-purple-300"],
                            ["Exposure", Math.round(classroom.exposure), "text-teal-300"],
                            ["Confidence", Math.round(classroom.confidence), "text-emerald-300"],
                          ].map(([label, value, color]) => (
                            <div key={label} className="rounded-lg border border-white/5 bg-black/20 p-2">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
                              <p className={`mt-1 text-xs font-bold ${color}`}>{value}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold">Practice snapshot</h3>
                    <p className="mt-1 text-[10px] text-slate-500">Recorded activity from practice history.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Quizzes", value: data.stats.totalQuizzes, icon: Clock3 },
                      { label: "Avg score", value: `${Math.round(data.stats.averageQuizScore)}%`, icon: Award },
                      { label: "Current streak", value: data.stats.currentStreak, icon: Flame },
                      { label: "Longest streak", value: data.stats.longestStreak, icon: Activity },
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className="rounded-2xl border border-white/5 bg-slate-900/35 p-4">
                          <Icon className="h-4 w-4 text-blue-400" />
                          <p className="mt-3 text-xl font-extrabold">{card.value}</p>
                          <p className="text-[10px] text-slate-500">{card.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-slate-900/35 p-4">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /><span className="text-[10px] font-semibold text-slate-400">Student contact</span></div>
                    <p className="mt-2 break-all text-xs">{data.student.email}</p>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-white/5 bg-slate-900/35 p-5">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-sm font-bold">Topic performance</h3><p className="mt-1 text-[10px] text-slate-500">Weakest recorded topics appear first.</p></div>
                    <BookOpen className="h-4 w-4 text-blue-400" />
                  </div>
                  {data.topics.length === 0 ? (
                    <div className="flex min-h-32 items-center justify-center text-center"><p className="text-xs text-slate-500">No topic practice has been recorded yet.</p></div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {data.topics.map(topic => (
                        <div key={topic.name} className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-xs font-semibold text-slate-200">{topic.name}</p>
                            <span className={`shrink-0 rounded border px-2 py-0.5 text-[8px] font-bold ${topicStatusStyles[topic.status] || topicStatusStyles.NOT_STARTED}`}>{topic.status.replace("_", " ")}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{topic.questionsAttempted} questions - {topic.sessions} sessions</span>
                            <span className="font-bold text-blue-300">{Math.round(topic.accuracy)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-white/5 bg-slate-900/35 p-5">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-sm font-bold">Recent quiz activity</h3><p className="mt-1 text-[10px] text-slate-500">Latest recorded practice sessions.</p></div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  {data.recentActivity.length === 0 ? (
                    <div className="flex min-h-32 items-center justify-center text-center"><p className="text-xs text-slate-500">No quiz activity has been recorded yet.</p></div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {data.recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-200">{activity.topic}</p>
                            <p className="mt-1 text-[10px] text-slate-500">{activity.questionsAttempted} questions - {formatDate(activity.createdAt)}</p>
                          </div>
                          <span className={`shrink-0 text-sm font-extrabold ${activity.score >= 70 ? "text-emerald-300" : activity.score >= 50 ? "text-amber-300" : "text-rose-300"}`}>{Math.round(activity.score)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
