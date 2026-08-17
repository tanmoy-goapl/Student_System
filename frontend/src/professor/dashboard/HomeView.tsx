"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Bell, ChevronDown, TrendingUp, Users, AlertTriangle, BookOpen, 
  Lightbulb, Sparkles, ClipboardCheck, CheckCircle2, FileText,
  GraduationCap, TrendingDown, Loader2, LucideIcon, X
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { useProfessorGeneration } from "../components/ProfessorGenerationProvider";
import { useRouter } from "next/navigation";
import { DashboardContentLoader } from "@/components/DashboardLoading";

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

type GenerationActionType = "lesson" | "quiz" | "revision" | "simplify" | "practice";

interface SelectedGenerationAction {
  title: string;
  placeholder: string;
  actionType: GenerationActionType;
}

interface AIActionDefinition extends SelectedGenerationAction {
  description: string;
  icon: LucideIcon;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

// ── Alert styling ───────────────────────────────────────────
const ALERT_STYLES: Record<string, { border: string; bg: string; iconColor: string; icon: any; btnClass: string }> = {
  critical: { border: "border-rose-500/10", bg: "bg-rose-500/[0.02]", iconColor: "text-rose-400", icon: AlertTriangle, btnClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  warning:  { border: "border-amber-500/10", bg: "bg-amber-500/[0.02]", iconColor: "text-amber-400", icon: TrendingDown, btnClass: "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400" },
  info:     { border: "border-blue-500/10", bg: "bg-blue-500/[0.02]", iconColor: "text-blue-400", icon: BookOpen, btnClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  success:  { border: "border-emerald-500/10", bg: "bg-emerald-500/[0.02]", iconColor: "text-emerald-400", icon: Sparkles, btnClass: "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400" },
};

// ── AI Actions (static — these are tool shortcuts, not data) ─
const AI_ACTIONS: AIActionDefinition[] = [
  { title: "Generate Lesson", actionType: "lesson", description: "Create a student-ready lesson with explanations, examples, and quick checks", placeholder: "e.g. process scheduling, database normalization...", icon: BookOpen, badge: "STUDENT LESSON", badgeColor: "text-blue-400", badgeBg: "bg-blue-500/10", badgeBorder: "border-blue-500/20" },
  { title: "Create Quiz", actionType: "quiz", description: "Create focused multiple-choice questions with options for student practice", placeholder: "e.g. memory management, Big-O notation...", icon: ClipboardCheck, badge: "QUIZ", badgeColor: "text-purple-400", badgeBg: "bg-purple-500/10", badgeBorder: "border-purple-500/20" },
  { title: "Generate Revision Notes", actionType: "revision", description: "Create a compact revision sheet for quick student review", placeholder: "e.g. paging and segmentation, red-black trees...", icon: FileText, badge: "REVISION", badgeColor: "text-amber-400", badgeBg: "bg-amber-500/10", badgeBorder: "border-amber-500/20" },
  { title: "Simplify Topic", actionType: "simplify", description: "Explain a difficult topic in beginner-friendly language with an analogy", placeholder: "e.g. banker's algorithm, bubble sort...", icon: Lightbulb, badge: "EXPLANATION", badgeColor: "text-cyan-400", badgeBg: "bg-cyan-500/10", badgeBorder: "border-cyan-500/20" },
  { title: "Create Practice Set", actionType: "practice", description: "Create open-ended exercises and worked examples for student practice", placeholder: "e.g. CPU scheduling math, binary search tree insertion...", icon: GraduationCap, badge: "PRACTICE SET", badgeColor: "text-indigo-400", badgeBg: "bg-indigo-500/10", badgeBorder: "border-indigo-500/20" },
];
interface TeachingInsight {
  label: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  iconBackground: string;
  valueClass: string;
}

interface HomeRecommendation {
  label: string;
  title: string;
  description: string;
  buttonLabel: string;
  actionType?: GenerationActionType;
  topic?: string;
}

const buildTeachingInsights = (dashboard: DashboardData): TeachingInsight[] => {
  const scoreDelta = Number(dashboard.kpi.scoreDelta || 0);
  const totalStudents = Math.max(0, dashboard.totalStudents || 0);
  const activeStudents = Math.min(
    totalStudents,
    Math.max(0, Math.round(totalStudents * (Number(dashboard.kpi.engagement || 0) / 100)))
  );
  const focusTopic = dashboard.weakTopics[0];

  return [
    {
      label: "Priority topic",
      title: focusTopic?.name || "No weak topic detected",
      value: focusTopic ? `${focusTopic.score}%` : "On track",
      description: focusTopic
        ? "Lowest tracked topic average. A focused resource can target this gap."
        : "No tracked topic is currently below the weak-topic threshold.",
      icon: BookOpen,
      iconClass: focusTopic ? "text-amber-300" : "text-emerald-300",
      iconBackground: focusTopic ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20",
      valueClass: focusTopic ? "text-amber-300" : "text-emerald-300",
    },
    {
      label: "Performance momentum",
      title: scoreDelta > 0 ? "Improving" : scoreDelta < 0 ? "Needs attention" : "Stable",
      value: scoreDelta > 0 ? `+${scoreDelta}%` : scoreDelta < 0 ? `${scoreDelta}%` : "0%",
      description: scoreDelta > 0
        ? "Recent quiz performance is ahead of the previous comparison window."
        : scoreDelta < 0
          ? "Recent quiz performance is below the previous comparison window."
          : "Recent quiz performance has not materially changed.",
      icon: scoreDelta < 0 ? TrendingDown : TrendingUp,
      iconClass: scoreDelta < 0 ? "text-rose-300" : scoreDelta > 0 ? "text-emerald-300" : "text-blue-300",
      iconBackground: scoreDelta < 0 ? "bg-rose-500/10 border-rose-500/20" : scoreDelta > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20",
      valueClass: scoreDelta < 0 ? "text-rose-300" : scoreDelta > 0 ? "text-emerald-300" : "text-blue-300",
    },
    {
      label: "Engagement coverage",
      title: totalStudents > 0 ? `${activeStudents} active students` : "No enrolled students",
      value: `${Number(dashboard.kpi.engagement || 0)}%`,
      description: totalStudents > 0
        ? `${activeStudents} of ${totalStudents} students are active in the current analytics window.`
        : "Enroll students to start receiving activity signals.",
      icon: Users,
      iconClass: dashboard.kpi.engagement < 50 ? "text-cyan-300" : "text-emerald-300",
      iconBackground: dashboard.kpi.engagement < 50 ? "bg-cyan-500/10 border-cyan-500/20" : "bg-emerald-500/10 border-emerald-500/20",
      valueClass: dashboard.kpi.engagement < 50 ? "text-cyan-300" : "text-emerald-300",
    },
  ];
};

const buildHomeRecommendation = (dashboard: DashboardData): HomeRecommendation => {
  const focusTopic = dashboard.weakTopics[0];
  const scoreDelta = Number(dashboard.kpi.scoreDelta || 0);

  if (focusTopic) {
    return {
      label: "RECOMMENDED NEXT STEP",
      title: `Reinforce ${focusTopic.name}`,
      description: `${focusTopic.name} is the lowest tracked topic at ${focusTopic.score}%. Generate a focused revision sheet and publish it to the relevant class after review.`,
      buttonLabel: "Generate revision",
      actionType: "revision",
      topic: focusTopic.name,
    };
  }

  if (dashboard.kpi.atRiskCount > 0) {
    return {
      label: "RECOMMENDED NEXT STEP",
      title: "Review students needing support",
      description: `${dashboard.kpi.atRiskCount} unique student${dashboard.kpi.atRiskCount === 1 ? " is" : "s are"} below the current risk threshold. Review the student-level analytics before assigning targeted practice.`,
      buttonLabel: "Review analytics",
    };
  }

  if (dashboard.kpi.engagement < 50) {
    return {
      label: "RECOMMENDED NEXT STEP",
      title: "Bring more students back into practice",
      description: `Current engagement is ${dashboard.kpi.engagement}%. Use a short, student-facing lesson or practice set to create a clear next activity.`,
      buttonLabel: "View insights",
    };
  }

  if (scoreDelta < 0) {
    return {
      label: "RECOMMENDED NEXT STEP",
      title: "Investigate the recent score dip",
      description: `Performance is down ${Math.abs(scoreDelta)}% in the recent comparison window. Review the class trend and recent quiz activity for context.`,
      buttonLabel: "View insights",
    };
  }

  return {
    label: "RECOMMENDED NEXT STEP",
    title: "Keep the current momentum",
    description: "Classroom signals are stable or improving. Continue with regular quizzes and short revision resources to maintain progress.",
    buttonLabel: "View insights",
  };
};

const renderLessonContent = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentTableRows: string[][] = [];
  let currentTextBlock: string[] = [];

  const markdownComponents = {
    h1: ({ children }: any) => <h1 className="text-sm font-extrabold text-white mt-5 mb-2 border-b border-white/10 pb-1">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xs font-bold text-slate-200 mt-4 mb-1.5">{children}</h2>,
    h3: ({ children }: any) => <h3 className="font-semibold text-sm mt-4 mb-1 text-white border-b border-white/5 pb-1">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-[11px] font-bold text-slate-400 mt-2 mb-1">{children}</h4>,
    ul: ({ children }: any) => <ul className="list-disc ml-4 space-y-1 text-slate-350 my-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-4 space-y-1 text-slate-350 my-2">{children}</ol>,
    li: ({ children }: any) => <li className="text-xs leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-300">{children}</p>,
    hr: () => <hr className="border-white/5 my-4" />,
    code: ({ children }: any) => <code className="bg-white/5 px-1 py-0.5 rounded text-[10px] text-violet-300 font-mono">{children}</code>,
    pre: ({ children }: any) => <pre className="bg-black/40 border border-white/5 rounded-xl p-3 my-3 text-[10px] font-mono text-slate-300 overflow-x-auto">{children}</pre>,
  };

  const flushText = (key: string | number) => {
    if (currentTextBlock.length > 0) {
      elements.push(
        <ReactMarkdown 
          key={`text-${key}`}
          components={markdownComponents}
        >
          {currentTextBlock.join("\n")}
        </ReactMarkdown>
      );
      currentTextBlock = [];
    }
  };

  const flushTable = (key: string | number) => {
    if (currentTableRows.length > 0) {
      const rows = currentTableRows.filter(row => {
        const joined = row.join("").trim();
        return !/^[|\s-]+$/.test(joined) && joined.length > 0;
      });

      if (rows.length > 0) {
        const headers = rows[0];
        const bodyRows = rows.slice(1);
        
        elements.push(
          <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1220]/60 backdrop-blur-sm">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-b border-white/10 bg-blue-500/10 text-blue-300 font-bold">
                  {headers.map((h, i) => (
                    <th key={i} className="p-2.5 font-bold uppercase tracking-wider border-r border-white/5 last:border-0">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bodyRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2.5 text-slate-350 font-medium border-r border-white/5 last:border-0">
                        <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                          {cell.trim()}
                        </ReactMarkdown>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      currentTableRows = [];
    }
  };

  let elementKey = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|")) {
      flushText(elementKey++);
      
      const cells = line.split("|").map(c => c.trim());
      if (line.startsWith("|")) cells.shift();
      if (line.endsWith("|")) cells.pop();
      
      currentTableRows.push(cells);
    } else {
      if (currentTableRows.length > 0) {
        flushTable(elementKey++);
      }
      currentTextBlock.push(lines[i]);
    }
  }
  
  flushText(elementKey++);
  flushTable(elementKey++);
  
  return <>{elements}</>;
};

export default function HomeView() {
  const router = useRouter();
  const [userName, setUserName] = useState("Professor");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SelectedGenerationAction | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const { generationJobs, startGeneration, dismissGenerationJob, viewingJobId, setViewingJobId } = useProfessorGeneration();
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [katexLoaded, setKatexLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewingJob = generationJobs.find((job) => job.id === viewingJobId) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).renderMathInElement) {
      setKatexLoaded(true);
      return;
    }
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js";
    script.async = true;
    script.onload = () => {
      const autoRenderScript = document.createElement("script");
      autoRenderScript.src = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js";
      autoRenderScript.async = true;
      autoRenderScript.onload = () => {
        setKatexLoaded(true);
      };
      document.head.appendChild(autoRenderScript);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).renderMathInElement && previewRef.current) {
      try {
        (window as any).renderMathInElement(previewRef.current, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true}
          ],
          throwOnError: false
        });
      } catch (err) {
        console.error("Katex auto-render failed:", err);
      }
    }
  }, [viewingJob?.result, katexLoaded]);

  useEffect(() => {
    if (data && data.classes && data.classes.length > 0) {
      setSelectedClassId(data.classes[0].id.toString());
    }
  }, [data]);

  const handleGenerateAction = () => {
    const action = selectedAction;
    const topic = topicInput.trim();
    const description = descriptionInput.trim();
    if (!topic || !action) return;

    const professorId = Number(localStorage.getItem("user_id") || 2);
    const targetClass = data?.classes?.find(c => c.id.toString() === selectedClassId) || (data?.classes && data.classes[0]);
    const subjectName = targetClass ? targetClass.name : "Computer Science";
    const classroomId = targetClass?.id != null ? String(targetClass.id) : undefined;

    startGeneration({
      title: action.title,
      topic,
      subjectName,
      actionType: action.actionType,
      classroomId,
      description,
      professorId,
    });
    setSelectedAction(null);
    setTopicInput("");
    setDescriptionInput("");
  };

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

  const teachingInsights = data ? buildTeachingInsights(data) : [];
  const homeRecommendation = data ? buildHomeRecommendation(data) : null;

  const openRecommendation = () => {
    if (!homeRecommendation) return;
    if (homeRecommendation.actionType && homeRecommendation.topic) {
      const action = AI_ACTIONS.find((item) => item.actionType === homeRecommendation.actionType);
      if (action) {
        setSelectedAction({
          title: action.title,
          placeholder: action.placeholder,
          actionType: action.actionType,
        });
        setTopicInput(homeRecommendation.topic);
        setDescriptionInput("Use the class performance gap as the main focus and keep the content student-facing.");
        return;
      }
    }
    router.push("/professor/insights");
  };

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
            {/* <button className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 hover:bg-white/5 transition cursor-pointer">
              <Bell className="w-4 h-4 text-slate-300" />
              {data && data.alerts.length > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
              )}
            </button> */}

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
            <DashboardContentLoader text="Loading dashboard..." />
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
                        <p className="text-[10px] text-slate-400 font-medium">Below 50% in any class</p>
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
                        onClick={() => {
                          setSelectedAction({ title: act.title, placeholder: act.placeholder, actionType: act.actionType });
                          setTopicInput("");
                          setDescriptionInput("");
                        }}
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

              {/* ─── Teaching Insights ───────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Teaching Insights</h2>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-full">
                      Live signals
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/professor/insights")}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    Open analytics &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teachingInsights.map((insight) => {
                    const Icon = insight.icon;
                    return (
                      <div key={insight.label} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl min-h-[170px] flex flex-col justify-between hover:border-white/10 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{insight.label}</span>
                            <h3 className="mt-1 text-sm font-bold text-white leading-snug">{insight.title}</h3>
                          </div>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 ${insight.iconBackground}`}>
                            <Icon className={`h-4 w-4 ${insight.iconClass}`} />
                          </div>
                        </div>
                        <div>
                          <p className={`text-2xl font-extrabold tracking-tight ${insight.valueClass}`}>{insight.value}</p>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{insight.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {homeRecommendation && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.04] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 shrink-0">
                        <Lightbulb className="h-4 w-4 text-violet-300" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300">{homeRecommendation.label}</span>
                        <h3 className="mt-1 text-xs font-bold text-white">{homeRecommendation.title}</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-300">{homeRecommendation.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={openRecommendation}
                      className="shrink-0 self-start md:self-center rounded-xl border border-violet-400/25 bg-violet-500/10 px-3.5 py-2 text-[10px] font-bold text-violet-200 hover:bg-violet-500/20 transition"
                    >
                      {homeRecommendation.buttonLabel} &rarr;
                    </button>
                  </div>
                )}
              </section>

              {/* ─── Student Alerts ─────────────────────────── */}
              {/* <section className="space-y-4">
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
              </section> */}
            </>
          )}
        </main>
      </div>

      {/* Bottom-right generation notifications stay visible while other actions run. */}
      {generationJobs.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-40 w-[min(390px,calc(100vw-2rem))] space-y-2"
          role="status"
          aria-live="polite"
        >
          {generationJobs.slice(-5).reverse().map((job) => {
            const label = job.title.replace("Create ", "").replace("Generate ", "");
            const isGenerating = job.status === "generating";
            const isComplete = job.status === "complete";
            return (
              <div
                key={job.id}
                className={`relative rounded-2xl border p-3.5 text-left shadow-2xl backdrop-blur-md transition hover:-translate-y-0.5 ${
                  isGenerating
                    ? "border-violet-400/35 bg-[#11132a]/95 hover:border-violet-300/60"
                    : isComplete
                      ? "border-emerald-400/25 bg-[#0b1b1a]/95 hover:border-emerald-300/50"
                      : "border-rose-400/25 bg-[#1d1018]/95 hover:border-rose-300/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setViewingJobId(job.id)}
                  aria-label={`View ${label} generation for ${job.topic}`}
                  className="flex w-full items-start gap-3 pr-7 text-left"
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isGenerating ? "bg-violet-500/15" : isComplete ? "bg-emerald-500/15" : "bg-rose-500/15"
                  }`}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                    ) : isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-300" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-bold text-white">
                        {isGenerating ? `${label} generation started` : isComplete ? `${label} ready` : `${label} failed`}
                      </span>
                      <Bell className={`h-3.5 w-3.5 shrink-0 ${isGenerating ? "text-violet-300" : isComplete ? "text-emerald-300" : "text-rose-300"}`} />
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-300">
                      {isGenerating ? `Generating ${label.toLowerCase()} for “${job.topic}”` : job.topic}
                    </span>
                    <span className={`mt-2 block text-[9px] font-semibold uppercase tracking-wider ${isGenerating ? "text-violet-300" : isComplete ? "text-emerald-300" : "text-rose-300"}`}>
                      Click to view {isGenerating ? "live progress" : "result"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissGenerationJob(job.id);
                  }}
                  aria-label={`Dismiss ${label} generation notification`}
                  className="absolute right-2 top-2 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                {selectedAction.title}
              </h3>
              <button
                onClick={() => setSelectedAction(null)}
                className="text-white/45 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-[10px] text-slate-400">This creates student-facing content, not instructor notes. Review it in Content Studio and publish it to a class when ready. You can run another action while this one is generating.</p>

            {data && data.classes && data.classes.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Select Class / Course</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  {data.classes.map((cls) => (
                    <option key={cls.id} value={cls.id} className="bg-[#0b0f19]">
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">What topic would you like to generate this for?</label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder={selectedAction.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topicInput.trim()) {
                    handleGenerateAction();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="generation-description" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Optional description or intent</label>
                <span className="text-[9px] text-slate-600">{descriptionInput.length}/1000</span>
              </div>
              <textarea
                id="generation-description"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value.slice(0, 1000))}
                placeholder="Add the student level, focus areas, examples, or constraints you want AI to follow..."
                rows={3}
                className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <p className="text-[9px] leading-relaxed text-slate-500">Example: “Second-year students; focus on page replacement with one worked example and a short real-world analogy.”</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAction}
                disabled={!topicInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/10 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Generate for Students
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="truncate">{viewingJob.title}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 truncate">{viewingJob.topic}</p>
              </div>
              <button
                onClick={() => setViewingJobId(null)}
                className="text-white/45 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 purple-scrollbar">
              {viewingJob.status === "generating" && !viewingJob.result && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  <p className="text-slate-400 text-xs animate-pulse">AI is preparing your request...</p>
                </div>
              )}
              {viewingJob.result && (
                <div ref={previewRef} className="prose prose-invert prose-sm max-w-none text-slate-200 text-xs leading-relaxed space-y-2 pb-6">
                  {renderLessonContent(viewingJob.result + (viewingJob.status === "generating" ? " ▌" : ""))}
                </div>
              )}
              {viewingJob.status === "error" && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  ⚠️ {viewingJob.error || "Failed to generate content"}
                </div>
              )}
              {viewingJob.status === "complete" && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 border-t border-white/5 pt-3">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Content Studio.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5 shrink-0">
              <button
                onClick={() => setViewingJobId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/10 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
