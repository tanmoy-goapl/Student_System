"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { useChatSession, type ChatMessage } from "@/components/ChatSessionProvider";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { AlertTriangle, Paperclip, Send, Square, CheckCircle2, ChevronRight, Activity, CalendarDays, Sparkles, History, Plus, Sidebar, TrendingUp } from "lucide-react";
import { getChatSidebarData, getHomepageData, uploadDocument, type HomepageDataResponse } from "@/lib/api";
import Link from "next/link";
import { OfflineState, ChatThinking } from "@/components/UIStateSystem";

type RoleSuggestion = { h: string; t?: string };



export default function ChatPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState<Record<string, RoleSuggestion[]> | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [studentInsights, setStudentInsights] = useState<HomepageDataResponse | null>(null);
  const [studentInsightsLoading, setStudentInsightsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    handleNewChat,
    handleSelectSession,
    appendAssistantMessage,
  } = useChatSession();

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    getChatSidebarData().then(data => {
      setRoleSuggestions(data.ROLE_SUGGESTIONS);
    }).catch(err => console.error("Failed to fetch suggestions", err));
  }, []);

  useEffect(() => {
    if (!isInsightsOpen || user?.role !== "student" || !user.id) return;

    let cancelled = false;
    setStudentInsightsLoading(true);
    getHomepageData(user.id)
      .then((data) => {
        if (!cancelled) setStudentInsights(data);
      })
      .catch(() => {
        if (!cancelled) setStudentInsights(null);
      })
      .finally(() => {
        if (!cancelled) setStudentInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isInsightsOpen, user?.id, user?.role]);


  const initialScrollPendingRef = useRef(true);
  const autoScrolledSessionRef = useRef<string | null | undefined>(undefined);
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

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      <OfflineState />
      <ChatHistorySidebar
        studentId={user?.id ?? null}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        activeSessionId={activeSessionId}
      />

      {/* ── Main chat column ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Open History"
            >
              <History size={16} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Chatbot Workspace</h1>
              <p className="text-[10px] text-slate-400">Interactive session history active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {user?.role === "student" && (
              <button
                onClick={() => setIsInsightsOpen((open) => !open)}
                className={`order-2 h-8 w-8 rounded-xl border flex items-center justify-center transition ${
                  isInsightsOpen
                    ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                    : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                }`}
                title="Open live learning insights"
                aria-label="Open live learning insights"
              >
                <Sidebar size={16} />
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="order-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/10 transition cursor-pointer text-white"
              title="Start New Conversation"
            >
              <Plus size={14} className="text-slate-300" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Message area */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto purple-scrollbar p-4 space-y-4">
          {history.length === 0 && !loading && (
            <div className="flex flex-col items-center h-full justify-center gap-6 text-center px-4">
              <Image src="/mentor-logo.png" alt="Mentor AI" width={60} height={60} className="rounded-xl" />
              <div>
                <p className="text-3xl font-semibold text-white">Hi {user?.name || "User"} 👋</p>
                <p className="text-xs text-blue-200 mt-1 max-w-xs">
                  {user?.role === "admin" && "I can help you analyze student & teacher performance, manage users, and optimize learning outcomes."}
                  {user?.role === "student" && "I'm your Mentor AI. What would you like to learn today?"}
                  {user?.role === "professor" && "I'm your AI Teaching Assistant. I can help you analyze students, create materials, and improve your teaching."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
                {roleSuggestions?.[user?.role || ""]?.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(item.h)}
                    className="text-left p-3 rounded-xl border border-blue-500/10 bg-[#0D1221]/70 hover:bg-[#0D1221] transition backdrop-blur-md"
                  >
                    <p className="text-sm font-medium text-white">{item.h}</p>
                    {item.t && <p className="text-xs text-blue-300 mt-1">{item.t}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => {
            const isLast = i === history.length - 1;
            const isGenerating = isStreaming && isLast && msg.role === "assistant";
            // Hide the last empty assistant bubble if streamStatus is actively displaying a progress message
            if (isGenerating && !msg.content && streamStatus) {
              return null;
            }
            return (
              <ChatBubble 
                key={i} 
                msg={msg} 
                isGenerating={isGenerating}
                onAsk={(q) => { setQuestion(q); setTimeout(() => document.getElementById("chat-send-btn")?.click(), 50); }} 
              />
            );
          })}

          {(loading || streamStatus) && (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <Avatar initials="AI" isSpinning={true} />
              <ChatThinking />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="shrink-0 mx-5 mb-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-red-400 hover:text-red-300 font-bold text-base leading-none">×</button>
          </div>
        )}

        {/* Input bar */}
        <div className="shrink-0 px-6 py-4 bg-[#0a0f1e]/60 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.bmp,.webp,.tiff,.tif,.gif"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading || !user?.id}
              className="text-gray-400 hover:text-white transition disabled:opacity-40"
              title="Attach Document"
            >
              {fileUploading ? (
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
              placeholder="Ask about your marks, study plan, feedback…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isStreaming && !e.shiftKey && handleAsk()}
              disabled={isStreaming || !user?.id}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white active:scale-95 transition-all"
                title="Stop Generation"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                id="chat-send-btn"
                onClick={handleAsk}
                disabled={!question.trim() || !user?.id}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {isInsightsOpen && user?.role === "student" && (
        <aside className="w-80 h-full border-l border-white/5 bg-[#090D1F] shrink-0 overflow-y-auto purple-scrollbar p-5 space-y-6 text-white">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Live insights
            </h3>
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">
              {studentInsightsLoading ? "Updating..." : studentInsights ? "Current" : "Unavailable"}
            </span>
          </div>

          {studentInsightsLoading ? (
            <div className="space-y-3">
              <div className="h-28 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
            </div>
          ) : studentInsights ? (
            <>
              <section className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Learning snapshot</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Readiness</span>
                    <span className="text-lg font-extrabold mt-1 block">{studentInsights.examOverview?.find((item) => item.id === "readiness")?.value ?? "—"}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">{studentInsights.dashboard_health || "Current signal"}</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Accuracy</span>
                    <span className="text-lg font-extrabold mt-1 block">{studentInsights.performanceSnapshots?.find((item) => item.id === "overall-accuracy")?.value ?? "—"}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">lifetime performance</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Study streak</span>
                    <span className="text-lg font-extrabold mt-1 block">{studentInsights.performanceSnapshots?.find((item) => item.id === "study-streak")?.value ?? "—"}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">current streak</span>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Focus score</span>
                    <span className="text-lg font-extrabold mt-1 block">{studentInsights.performanceSnapshots?.find((item) => item.id === "focus-score")?.value ?? "—"}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block font-bold">recent activity</span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-300">Today&apos;s focus</span>
                  <span className="text-[9px] font-bold text-blue-200">{studentInsights.todays_focus?.estimated_time ?? "—"} min</span>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{studentInsights.todays_focus?.topic || "No focus selected"}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{studentInsights.todays_focus?.reason || "Your live learning signals will appear here."}</p>
              </section>

              <section className="space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Recommendations</span>
                {studentInsights.aiAlerts?.length ? (
                  <div className="space-y-2">
                    {studentInsights.aiAlerts.slice(0, 4).map((alert) => (
                      <div key={alert.id || alert.title} className="rounded-xl border border-white/5 bg-black/20 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold leading-snug text-slate-200">{alert.title}</p>
                            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{alert.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-[10px] text-slate-500">No active recommendations.</p>
                )}
              </section>

              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Pending work</span>
                  <span className="text-[10px] font-extrabold text-blue-300">{studentInsights.pending_dues?.total ?? 0}</span>
                </div>
                <p className="rounded-xl border border-white/5 bg-black/20 p-3 text-[10px] leading-relaxed text-slate-500">
                  {studentInsights.pending_dues?.revision_due ?? 0} revisions and {studentInsights.pending_dues?.quiz_due ?? 0} quizzes currently need attention.
                </p>
              </section>
            </>
          ) : (
            <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-[10px] leading-relaxed text-slate-500">
              Live learning insights are unavailable right now.
            </p>
          )}
        </aside>
      )}
    </div>
  );
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

function ChatBubble({ msg, isGenerating, onAsk }: { msg: ChatMessage, isGenerating?: boolean, onAsk?: (q: string) => void }) {
  const isUser = msg.role === "user";
  
  if (!isUser && !msg.content && !msg.roadmap_metadata && !isGenerating) {
    return null;
  }
  
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar /> : <Avatar initials="AI" />}
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm border backdrop-blur-md break-words
          ${isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/20 rounded-2xl rounded-br-none shadow-lg shadow-blue-500/10 whitespace-pre-wrap"
            : "bg-white/5 text-blue-100 border-white/10 rounded-2xl rounded-bl-none"
          }`}
      >
        {isGenerating && !msg.content ? (
          <div className="flex items-center gap-1.5 py-1.5 px-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: "0ms", animationDuration: "1s" }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce shadow-[0_0_8px_rgba(129,140,248,0.6)]" style={{ animationDelay: "150ms", animationDuration: "1s" }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce shadow-[0_0_8px_rgba(244,114,182,0.6)]" style={{ animationDelay: "300ms", animationDuration: "1s" }}></span>
          </div>
        ) : (
          parseMarkdownAndTables(msg.content + (isGenerating ? "▌" : "")).map((block, bIdx) => {
            if (block.type === "table" && block.tableData) {
              return (
                <div key={bIdx} className="overflow-x-auto my-3">
                  <table className="min-w-full border-collapse border border-white/10 text-xs rounded-xl overflow-hidden">
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
                            <td key={cIdx} className="border border-white/10 px-3 py-2 text-blue-200">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <span className="text-blue-200">{children}</span>,
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
              <ReactMarkdown
                key={bIdx}
                components={{
                  h3: ({ children }) => <h3 className="font-semibold text-base mt-2 mb-1 text-white">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc ml-4 space-y-1 text-blue-200">{children}</ul>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  p: ({ children }) => <p className="mb-1.5 last:mb-0 text-blue-100">{children}</p>,
                }}
              >
                {block.content}
              </ReactMarkdown>
            );
          })
        )}

        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-2 text-[11px]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <div className="font-semibold text-emerald-200">Relevant content found in your documents</div>
              <div className="mt-0.5 truncate text-slate-300" title={msg.sources.join(" · ")}>
                {msg.sources.join(" · ")}
              </div>
            </div>
          </div>
        )}

        {/* Custom Success Card for Roadmap Creation */}
        {msg.intent === "ROADMAP_CREATION" && msg.roadmap_metadata && (
          <div className="mt-4 bg-[#0a0f1e]/80 border border-blue-500/20 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-xl shadow-blue-500/5">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Roadmap Created</span>
            </div>
            
            <h4 className="text-white font-semibold text-lg">{msg.roadmap_metadata.title}</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-2.5 flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Duration</p>
                  <p className="text-sm text-white font-medium">{msg.roadmap_metadata.duration}</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 flex items-center gap-3">
                <Activity className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Curriculum</p>
                  <p className="text-sm text-white font-medium">{msg.roadmap_metadata.weeks} Milestones, {msg.roadmap_metadata.tasks} tasks</p>
                </div>
              </div>
            </div>

            <Link href="/roadmap" className="mt-2 flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors group">
              Open Personal Dashboard
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {/* Suggestion CTA */}
        {msg.suggest_roadmap && onAsk && (
          <div className="mt-4 pt-3 border-t border-white/10 animate-in fade-in duration-500">
            <button 
              onClick={() => onAsk("Create a personalized roadmap for this.")}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <CalendarDays size={16} />
              Create Roadmap
            </button>
          </div>
        )}

        {/* Quick Reply Options */}
        {msg.options && msg.options.length > 0 && onAsk && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10 animate-in fade-in duration-300">
            {msg.options.map((opt: string, optIdx: number) => (
              <button
                key={optIdx}
                onClick={() => onAsk(opt)}
                className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ initials, isSpinning = false }: { initials?: string, isSpinning?: boolean }) {
  return (
    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
      <Sparkles className={`w-4 h-4 text-white ${isSpinning ? "animate-spin" : ""}`} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M6 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
