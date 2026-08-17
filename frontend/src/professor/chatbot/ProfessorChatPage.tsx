"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Sparkles, Paperclip, Send, Sidebar, TrendingUp, History, Plus,
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { useRouter } from "next/navigation";
import { ChatThinking } from "@/components/UIStateSystem";
import ReactMarkdown from "react-markdown";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { getDocumentsData, uploadDocument } from "@/lib/api";
import { useChatSession } from "@/components/ChatSessionProvider";

type Message = {
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
  session_id?: string | null;
};

interface TableBlock {
  type: "markdown" | "table";
  content: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

interface ProfessorDashboardSnapshot {
  classes: Array<{ id: number; name: string }>;
  totalStudents: number;
  kpi: {
    avgScore: number;
    engagement: number;
    atRiskCount: number;
    weakTopicCount: number;
    scoreDelta?: number;
  };
  alerts: Array<{
    type: string;
    title: string;
    desc: string;
    score?: number;
  }>;
}

interface ProfessorInsightsSnapshot {
  overview: {
    avgScore: number;
    engagementRate: number;
    atRiskStudents: number;
    topicMastery: number;
  };
  aiInsights: Array<{
    title: string;
    desc: string;
    badge?: string;
    badgeType?: string;
  }>;
  topicMastery: Array<{ className: string; avgScore: number }>;
  engagement: {
    attendance: number;
    quizParticipation: number;
    revisionConsistency: number;
    contentInteraction: number;
  };
}

interface ProfessorInsightState {
  dashboard: ProfessorDashboardSnapshot;
  insights: ProfessorInsightsSnapshot;
  materialCount: number;
  subjectCount: number;
}

function parseMarkdownAndTables(text: string): TableBlock[] {
  const lines = text.split("\n");
  const blocks: TableBlock[] = [];
  let currentMarkdown: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith("|") && trimmed.endsWith("|");
    
    if (isTableLine && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const isSeparator = nextLine.trim().startsWith("|") && nextLine.trim().endsWith("|") && 
                          /^\|[\s\-\|:\+]+\|$/.test(nextLine.trim());
      
      if (isSeparator) {
        if (currentMarkdown.length > 0) {
          blocks.push({ type: "markdown", content: currentMarkdown.join("\n") });
          currentMarkdown = [];
        }
        
        const headers = line.split("|").map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
        const rows: string[][] = [];
        i += 2; // skip header and separator
        
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          const rowCells = lines[i].split("|").map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
          rows.push(rowCells);
          i++;
        }
        
        blocks.push({
          type: "table",
          content: "",
          tableData: { headers, rows }
        });
        continue;
      }
    }
    
    currentMarkdown.push(line);
    i++;
  }
  
  if (currentMarkdown.length > 0) {
    blocks.push({ type: "markdown", content: currentMarkdown.join("\n") });
  }
  
  return blocks;
}

export default function ProfessorChatPage() {
  const {
    user,
    question,
    setQuestion,
    history,
    loading,
    streamStatus,
    isStreaming,
    error,
    setError,
    activeSessionId,
    handleAsk,
    handleSelectSession,
    handleNewChat,
    appendAssistantMessage,
  } = useChatSession();

  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollThrottleRef = useRef<number>(0);
  const initialScrollPendingRef = useRef(true);
  const autoScrolledSessionRef = useRef<string | null | undefined>(undefined);
  const [insightData, setInsightData] = useState<ProfessorInsightState | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || user.role !== "professor") {
      setInsightData(null);
      return;
    }

    let cancelled = false;
    const loadInsights = async () => {
      setInsightsLoading(true);
      try {
        const readJson = async <T,>(url: string): Promise<T> => {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Insights request failed");
          }
          return (await response.json()) as T;
        };

        const [dashboard, insights, documents] = await Promise.all([
          readJson<ProfessorDashboardSnapshot>(`/api/professor/dashboard?professor_id=${user.id}`),
          readJson<ProfessorInsightsSnapshot>(`/api/professor/insights?professor_id=${user.id}`),
          getDocumentsData(user.id).catch(() => null),
        ]);

        const documentItems = documents?.documents ?? [];
        const subjects = documentItems
          .map((document) => typeof document?.subject === "string" ? document.subject.trim().toLowerCase() : "")
          .filter(Boolean);

        if (!cancelled) {
          setInsightData({
            dashboard,
            insights,
            materialCount: documentItems.length,
            subjectCount: new Set(subjects).size,
          });
        }
      } catch {
        if (!cancelled) setInsightData(null);
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    };

    void loadInsights();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, rightDrawerOpen]);

  const professorAlerts = insightData
    ? [
        ...insightData.dashboard.alerts.map((alert) => ({
          title: alert.title,
          desc: alert.desc,
          type: alert.type,
          badge: alert.type,
        })),
        ...insightData.insights.aiInsights.map((alert) => ({
          title: alert.title,
          desc: alert.desc,
          type: alert.badgeType || "info",
          badge: alert.badge || "AI INSIGHT",
        })),
      ].slice(0, 4)
    : [];

  const engagementSignals = insightData
    ? [
        { label: "Attendance", value: insightData.insights.engagement.attendance },
        { label: "Quiz participation", value: insightData.insights.engagement.quizParticipation },
        { label: "Revision consistency", value: insightData.insights.engagement.revisionConsistency },
        { label: "Content interaction", value: insightData.insights.engagement.contentInteraction },
      ]
    : [];

  const alertToneClasses: Record<string, { card: string; badge: string; icon: string }> = {
    critical: { card: "border-rose-500/15 bg-rose-500/5", badge: "bg-rose-500/15 text-rose-300", icon: "text-rose-400" },
    warning: { card: "border-amber-500/15 bg-amber-500/5", badge: "bg-amber-500/15 text-amber-300", icon: "text-amber-400" },
    success: { card: "border-emerald-500/15 bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-300", icon: "text-emerald-400" },
    info: { card: "border-blue-500/15 bg-blue-500/5", badge: "bg-blue-500/15 text-blue-300", icon: "text-blue-400" },
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = Number(localStorage.getItem("user_id") || 0);
    if (!file || !userId) return;
    setError("");
    setFileUploading(true);
    try {
      const res = await uploadDocument(userId, file, "owner");
      appendAssistantMessage(`📁 **Uploaded "${res.filename}"** (${res.chunks_created} chunks processed). I have parsed it and added it to my knowledge. You can now ask questions about it!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const suggestions = [
    { text: "Which topics are students struggling with?", desc: "Extract weak topics and class averages" },
    { text: "Draft a quiz on Wave Optics", desc: "Construct custom practice questions" },
    { text: "Identify at-risk students in CSE-5A", desc: "Check attendance and grades alerts" },
    { text: "Create personalized study plans", desc: "Study guidelines matching student deficiencies" },
    { text: "Analyze assessment performance", desc: "Detailed question accuracy summaries" },
    { text: "Generate course completion report", desc: "Check syllabus completion progress %" }
  ];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !history.length || !initialScrollPendingRef.current) return;

    initialScrollPendingRef.current = false;
    requestAnimationFrame(() => {
      if (scrollRef.current !== el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [history.length]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeSessionId || !history.length) return;
    if (autoScrolledSessionRef.current === activeSessionId) return;

    autoScrolledSessionRef.current = activeSessionId;
    requestAnimationFrame(() => {
      if (scrollRef.current !== el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [activeSessionId, history.length]);
  useLayoutEffect(() => {
    if (!history.length) {
      initialScrollPendingRef.current = true;
      autoScrolledSessionRef.current = undefined;
    }
  }, [history.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - scrollThrottleRef.current > 120) {
      scrollThrottleRef.current = now;
      const lastMsg = history[history.length - 1];
      const isUserMsg = lastMsg && lastMsg.role === "user";
      const threshold = 150;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

      if (isUserMsg || nearBottom || loading) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [history, loading]);

  useEffect(() => {
    // Parse query parameter from URL and auto-run
    const searchParams = new URLSearchParams(window.location.search);
    const initialQuery = searchParams.get("query");
    if (initialQuery) {
      // Clear query parameter from URL so React StrictMode or double renders do not trigger it twice
      window.history.replaceState(null, "", window.location.pathname);
      // Small timeout to allow state to settle
      setTimeout(() => {
        triggerAsk(initialQuery);
      }, 300);
    }
  }, []);

  const triggerAsk = (query?: string) => {
    if (query) {
      setQuestion(query);
      setTimeout(() => {
        handleAsk();
      }, 50);
    } else {
      handleAsk();
    }
  };

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      <ChatHistorySidebar
        studentId={Number(localStorage.getItem("user_id") || 0)}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        activeSessionId={activeSessionId}
      />

      {/* Main Conversation Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#040815]">
        
        {/* Chat Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Open History"
            >
              <History size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Mentor AI</span>
                <span className="px-1 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                  PROFESSOR
                </span>
                <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-bold ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[9px] text-slate-500 leading-none mt-0.5">Teacher Studio • GPT-4 Turbo</p>
            </div>
          </div>
        </div>

        {/* Mode switch */}
        {/* <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {(["Analytics", "Guidance", "Quick Answer"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                activeMode === mode ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div> */}

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/10 transition cursor-pointer text-white mr-2"
              title="Start New Conversation"
            >
              <Plus size={14} className="text-slate-300" />
              <span>New Chat</span>
            </button>
            {/* <button className="h-8 w-8 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-slate-350 hover:bg-white/10 transition relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button> */}
            <button
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              className={`h-8 w-8 rounded-xl border flex items-center justify-center transition ${
                rightDrawerOpen 
                  ? "bg-blue-600/10 border-blue-500/20 text-blue-400" 
                  : "bg-white/5 border-white/5 text-slate-350 hover:bg-white/10"
              }`}
              title="Open live professor insights"
              aria-label="Open live professor insights"
            >
              <Sidebar className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable chat body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-6">
          {history.length === 0 ? (
            /* Welcome screen */
            <div className="h-full flex flex-col justify-center items-center max-w-2xl mx-auto space-y-8 select-none py-12">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Hi Professor 👋</h2>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  I can help you review class health, draft practice questions, outline study roadmaps, and assist struggling students.
                </p>
                <div className="flex gap-4 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>👥 {insightData?.dashboard.totalStudents ?? "—"} Students</span>
                  <span>🏫 {insightData?.dashboard.classes.length ?? "—"} Classes</span>
                  <span>📈 {insightData ? Math.round(insightData.insights.engagement.quizParticipation) + "%" : "—"} Quiz Participation</span>
                </div>
              </div>
            </div>
          ) : (
            /* Active message history */
            <div className="max-w-5xl w-full mx-auto space-y-6">
              {history.map((msg, idx) => {
                if (msg.role === "assistant" && !msg.content) {
                  return null;
                }
                return (
                  <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl max-w-[90%] text-xs leading-relaxed border break-words ${
                      msg.role === "user" 
                        ? "bg-blue-600/10 border-blue-500/25 text-white rounded-tr-none whitespace-pre-wrap" 
                        : "bg-slate-900/50 border-white/5 text-slate-200 rounded-tl-none"
                    }`}>
                      <div className="markdown-body space-y-2">
                        {parseMarkdownAndTables(msg.content).map((block, bIdx) => {
                          if (block.type === "table" && block.tableData) {
                            return (
                              <div key={bIdx} className="overflow-x-auto my-3">
                                <table className="min-w-full border-collapse border border-white/10 text-[10px] rounded-xl overflow-hidden">
                                  <thead className="bg-white/5">
                                    <tr className="border-b border-white/5">
                                      {block.tableData.headers.map((h, hIdx) => (
                                        <th key={hIdx} className="border border-white/10 px-3 py-2 font-bold text-left text-white">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {block.tableData.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        {row.map((cell, cIdx) => (
                                          <td key={cIdx} className="border border-white/10 px-3 py-2 text-slate-355">
                                            <ReactMarkdown
                                              components={{
                                                p: ({ children }) => <span className="text-slate-355">{children}</span>,
                                                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>
                                              }}
                                            >
                                              {cell}
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
                          return (
                            <ReactMarkdown key={bIdx}>
                              {block.content}
                            </ReactMarkdown>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(loading || (isStreaming && history.length > 0 && history[history.length - 1].role === "assistant" && !history[history.length - 1].content)) && (
                <div className="flex gap-4 justify-start items-start animate-in fade-in duration-300">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce shadow-[0_0_8px_rgba(129,140,248,0.6)]" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce shadow-[0_0_8px_rgba(244,114,182,0.6)]" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <footer className="p-4 shrink-0 border-t border-white/5 bg-[#050a14]/20">
          {error && (
            <div className="max-w-5xl mx-auto mb-2 text-rose-400 text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              {error}
            </div>
          )}
          {fileUploading && (
            <div className="max-w-5xl mx-auto mb-2 text-blue-400 text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              Uploading and analyzing document...
            </div>
          )}
          <div className="max-w-5xl mx-auto relative flex items-center bg-slate-950/60 rounded-2xl border border-white/10 px-4 py-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <input
              type="text"
              placeholder="Ask about students, lessons, performance, or materials..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAsk()}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs px-3 placeholder:text-white/20 text-white"
            />
            <button
              onClick={() => handleAsk()}
              disabled={!question.trim()}
              className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition shadow shadow-blue-500/20"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[8px] text-slate-600 text-center mt-2 font-medium">
            Mentor AI may make mistakes. Verify all recommendations against student profiles.
          </p>
        </footer>
      </div>

      {/* Right Drawer Insights */}
      {rightDrawerOpen && (
        <aside className="w-80 h-screen border-l border-white/5 bg-[#090D1F] shrink-0 select-none text-white font-sans overflow-y-auto purple-scrollbar p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Live insights
            </h3>
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">
              {insightsLoading ? "Updating..." : insightData ? "Current" : "Unavailable"}
            </span>
          </div>

          {insightsLoading ? (
            <div className="space-y-3">
              <div className="h-28 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
            </div>
          ) : insightData ? (
            <>
              <section className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Class snapshot</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Students</span>
                    <span className="text-lg font-extrabold mt-1 block">{insightData.dashboard.totalStudents}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">{insightData.dashboard.classes.length} classes</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Avg score</span>
                    <span className="text-lg font-extrabold mt-1 block">{Math.round(insightData.dashboard.kpi.avgScore)}%</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">{insightData.dashboard.kpi.atRiskCount} at risk</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Materials</span>
                    <span className="text-lg font-extrabold mt-1 block">{insightData.materialCount}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">{insightData.subjectCount} subjects</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Quiz activity</span>
                    <span className="text-lg font-extrabold mt-1 block">{Math.round(insightData.insights.engagement.quizParticipation)}%</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">recent participation</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Active signals</span>
                {professorAlerts.length ? (
                  <div className="space-y-2">
                    {professorAlerts.map((alert) => {
                      const tone = alertToneClasses[alert.type] || alertToneClasses.info;
                      return (
                        <div key={alert.title} className={"p-3 rounded-xl border " + tone.card}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-200 leading-snug">{alert.title}</span>
                            <span className={"shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase " + tone.badge}>{alert.badge}</span>
                          </div>
                          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{alert.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-[10px] text-slate-500">No active class signals.</p>
                )}
              </section>

              <section className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Engagement signals</span>
                <div className="space-y-3">
                  {engagementSignals.map((signal) => {
                    const value = Math.max(0, Math.min(100, Math.round(signal.value)));
                    return (
                      <div key={signal.label}>
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-400">{signal.label}</span>
                          <span className="text-blue-300">{value}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: String(value) + "%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {insightData.insights.topicMastery.length ? (
                <section className="space-y-3.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Class readiness</span>
                  <div className="space-y-2">
                    {insightData.insights.topicMastery.slice(0, 4).map((item) => {
                      const value = Math.max(0, Math.min(100, Math.round(item.avgScore)));
                      return (
                        <div key={item.className} className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[10px] font-bold text-slate-200">{item.className}</span>
                            <span className="text-[10px] font-extrabold text-blue-300">{value}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400" style={{ width: String(value) + "%" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-[10px] leading-relaxed text-slate-500">
              Live professor insights are unavailable right now.
            </p>
          )}
        </aside>
      )}
    </div>
  );
}
