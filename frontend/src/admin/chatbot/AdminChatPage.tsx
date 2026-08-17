"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  AlertTriangle, BookOpen, History, Paperclip, Plus, Send, Sidebar,
  Sparkles, Square, Target, TrendingUp, Users,
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import ReactMarkdown from "react-markdown";
import { uploadDocument } from "@/lib/api";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { useChatSession } from "@/components/ChatSessionProvider";

interface AdminAlert {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  metric: string;
}

interface AdminDashboardSnapshot {
  total_students: number;
  total_professors: number;
  total_classes: number;
  active_students_today: number;
  average_confidence: number;
  average_readiness: number;
  weak_students: number;
  inactive_students: number;
  alerts: AdminAlert[];
  departments: Array<{
    id: string;
    name: string;
    student_count: number;
    course_count: number;
    average_readiness: number;
  }>;
}

interface TableBlock {
  type: "markdown" | "table";
  content: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
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

export default function AdminChatPage() {
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
    handleStop,
    handleSelectSession,
    handleNewChat,
    appendAssistantMessage,
  } = useChatSession();

  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboardSnapshot | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialScrollPendingRef = useRef(true);
  const autoScrolledSessionRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setDashboardLoading(true);
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
        return (await response.json()) as AdminDashboardSnapshot;
      })
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setError("");
    setFileUploading(true);
    try {
      const res = await uploadDocument(user.id, file, "owner");
      appendAssistantMessage(`📁 **Uploaded "${res.filename}"** (${res.chunks_created} chunks processed). I have parsed it and added it to my knowledge. You can now ask questions about it!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const liveMetrics = [
    { label: "Students", value: dashboard?.total_students ?? "—", note: dashboard ? dashboard.active_students_today + " active today" : "Loading...", icon: Users },
    { label: "Faculty", value: dashboard?.total_professors ?? "—", note: dashboard ? dashboard.total_classes + " classes covered" : "Loading...", icon: Users },
    { label: "Classes", value: dashboard?.total_classes ?? "—", note: "Current class roster", icon: BookOpen },
    { label: "Readiness", value: dashboard ? Math.round(dashboard.average_readiness) + "%" : "—", note: dashboard ? Math.round(dashboard.average_confidence) + "% confidence" : "Loading...", icon: Target },
  ];


  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const lastMsg = history[history.length - 1];
    const isUserMsg = lastMsg?.role === "user";
    const threshold = 150;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    const isInitialRestore = initialScrollPendingRef.current && history.length > 0;

    if (isInitialRestore || isUserMsg || nearBottom || loading) {
      const behavior = isInitialRestore ? "auto" : "smooth";
      requestAnimationFrame(() => {
        if (scrollRef.current !== el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    }
    if (isInitialRestore) initialScrollPendingRef.current = false;
  }, [history, loading]);

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

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <AdminSidebar />
      <ChatHistorySidebar
        studentId={user?.id ?? null}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        activeSessionId={activeSessionId}
      />

      {/* Main Conversation Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#040815]">
        
        {/* Chat Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Open chat history"
            >
              <History size={16} />
            </button>
            <div className="h-7 w-7 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Mentor AI</span>
                <span className="px-1 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded">
                  ADMIN
                </span>
                <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-bold ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[9px] text-slate-500 leading-none mt-0.5">Control Center • GPT-4 Turbo</p>
            </div>
          </div>

          {/* Mode switch */}
          {/* <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            {(["Analytics", "Guidance", "Quick Answer"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                  activeMode === mode ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div> */}

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/10 transition"
              title="Start new conversation"
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
                  ? "bg-violet-600/10 border-violet-500/20 text-violet-400" 
                  : "bg-white/5 border-white/5 text-slate-350 hover:bg-white/10"
              }`}
            >
              <Sidebar className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable chat body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-6">
          {history.length === 0 ? (
            /* Welcome screen */
            <div className="h-full flex flex-col justify-center items-center max-w-5xl mx-auto space-y-8 select-none py-12">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Hi Admin 👋</h2>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  I can help you analyze student & teacher performance, manage users, and optimize learning outcomes.
                </p>
                <div className="flex gap-4 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>👥 {dashboard?.total_students ?? "—"} Students</span>
                  <span>🏫 {dashboard?.total_classes ?? "—"} Classes</span>
                  <span>⚡ {dashboard?.active_students_today ?? "—"} Active Today</span>
                </div>
              </div>

            </div>
          ) : (
            /* Active message history */
            <div className="max-w-5xl mx-auto space-y-6">
              {history.map((msg, idx) => {
                if (msg.role === "assistant" && !msg.content) {
                  return null;
                }
                return (
                  <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border break-words ${
                      msg.role === "user" 
                        ? "bg-violet-600/10 border-violet-500/25 text-white rounded-tr-none whitespace-pre-wrap" 
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
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce shadow-[0_0_8px_rgba(129,140,248,0.6)]" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce shadow-[0_0_8px_rgba(244,114,182,0.6)]" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
                    <span className="ml-2 text-[10px] text-slate-400">{streamStatus || "Mentor AI is thinking..."}</span>
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
            <div className="max-w-5xl mx-auto mb-2 text-violet-400 text-[10px] font-semibold bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
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
              disabled={fileUploading || !user?.id}
              className="h-8 w-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-40"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <input
              type="text"
              placeholder="Ask about students, performance, or system insights..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && !isStreaming && handleAsk()}
              disabled={isStreaming || !user?.id}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs px-3 placeholder:text-white/20 text-white"
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="h-8 w-8 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white flex items-center justify-center transition"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleAsk}
                disabled={!question.trim() || !user?.id}
                className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center text-white transition shadow shadow-violet-500/20"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          <p className="text-[8px] text-slate-600 text-center mt-2 font-medium">
            Mentor AI may make mistakes. Verify all reports against official records.
          </p>
        </footer>
      </div>

      {/* Right Drawer Insights */}
      {rightDrawerOpen && (
        <aside className="w-80 h-screen border-l border-white/5 bg-[#090D1F] flex flex-col justify-between shrink-0 select-none text-white font-sans overflow-y-auto purple-scrollbar p-5 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-violet-400" /> Insights
            </h3>
          </div>


          {/* Live snapshot */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Live snapshot</span><span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">{dashboardLoading ? "Updating..." : "Current"}</span></div>
            <div className="grid grid-cols-2 gap-3">
              {liveMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between gap-2"><span className="text-[8px] text-slate-500 font-extrabold uppercase">{metric.label}</span><Icon className="h-3.5 w-3.5 text-violet-400" /></div>
                    <span className="text-lg font-extrabold mt-1 block">{metric.value}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">{metric.note}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Active Alerts</span>
            {dashboardLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : dashboard?.alerts?.length ? (
              <div className="space-y-2">
                {dashboard.alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" /><span className="truncate text-[10px] font-bold text-slate-200">{alert.title}</span></div><span className="shrink-0 rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-300">{alert.metric || alert.severity}</span></div>
                    <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-[10px] text-slate-500">No active institutional alerts.</p>
            )}
          </div>

          {dashboard?.departments?.length ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Department signals</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">Readiness</span>
              </div>
              <div className="space-y-2">
                {dashboard.departments.slice(0, 4).map((department) => {
                  const readiness = Math.max(0, Math.min(100, Math.round(department.average_readiness)));
                  return (
                    <div key={department.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-bold text-slate-200">{department.name}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-violet-300">{readiness}%</span>
                      </div>
                      <p className="mt-1 text-[9px] text-slate-500">{department.student_count} students · {department.course_count} classes</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400" style={{ width: `${readiness}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

        </aside>
      )}
    </div>
  );
}
