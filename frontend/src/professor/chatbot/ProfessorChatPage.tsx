"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Paperclip, Send, Bell, Sidebar, PlusCircle, 
  TrendingUp, FileText, CheckCircle, AlertTriangle, Users, Play, Clock, History, Plus
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import { useRouter } from "next/navigation";
import { ChatThinking } from "@/components/UIStateSystem";
import ReactMarkdown from "react-markdown";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { uploadDocument } from "@/lib/api";

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
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"Analytics" | "Guidance" | "Quick Answer">("Analytics");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollThrottleRef = useRef<number>(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = Number(localStorage.getItem("user_id") || 0);
    if (!file || !userId) return;
    setError("");
    setFileUploading(true);
    try {
      const res = await uploadDocument(userId, file, "owner");
      setHistory(prev => [
        ...prev,
        {
          role: "assistant",
          content: `📁 **Uploaded "${res.filename}"** (${res.chunks_created} chunks processed). I have parsed it and added it to my knowledge. You can now ask questions about it!`,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
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
    const handleNewChat = () => {
      setHistory([]);
      setActiveSessionId(null);
      setResetNext(true);
    };
    handleNewChat();
    window.addEventListener("new-chat", handleNewChat);
    
    // Parse query parameter from URL and auto-run
    const searchParams = new URLSearchParams(window.location.search);
    const initialQuery = searchParams.get("query");
    if (initialQuery) {
      // Clear query parameter from URL so React StrictMode or double renders do not trigger it twice
      window.history.replaceState(null, "", window.location.pathname);
      // Small timeout to allow state to settle
      setTimeout(() => {
        handleAsk(initialQuery);
      }, 300);
    }

    return () => window.removeEventListener("new-chat", handleNewChat);
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    const userId = Number(localStorage.getItem("user_id") || 0);
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/history?student_id=${userId}&session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
        setActiveSessionId(sessionId);
      }
    } catch (err) {
      console.error("Failed to load session history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q) return;

    setHistory(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const professorId = Number(localStorage.getItem("user_id") || 0);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: professorId,
          question: q,
          role: "professor",
          reset: resetNext,
          session_id: activeSessionId || undefined,
        })
      });
      setResetNext(false);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      setLoading(false);
      setHistory(prev => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let done = false;
      let assistantAnswer = "";
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                assistantAnswer += parsed.content;
                setHistory(prev => {
                  const copy = [...prev];
                  if (copy.length > 0) {
                    copy[copy.length - 1] = {
                      ...copy[copy.length - 1],
                      content: assistantAnswer,
                    };
                  }
                  return copy;
                });
              }
              if (parsed.session_id) {
                setActiveSessionId(parsed.session_id);
              }
            } catch (e) {
              // Ignore parse errors on partial lines
            }
          }
        }
      }
    } catch (err) {
      setHistory(prev => [...prev, { role: "assistant", content: "⚠️ Sorry, I encountered an error communicating with the AI model." }]);
    } finally {
      setLoading(false);
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
              onClick={() => {
                setHistory([]);
                setActiveSessionId(null);
                setResetNext(true);
              }}
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
                  <span>👥 136 Students</span>
                  <span>📁 24 Materials</span>
                  <span>⚡ 38 Quizzes Generated</span>
                </div>
              </div>

""
            </div>
          ) : (
            /* Active message history */
            <div className="max-w-5xl w-full mx-auto space-y-6">
              {history.map((msg, idx) => (
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
                                        <td key={cIdx} className="border border-white/10 px-3 py-2 text-slate-350">
                                          <ReactMarkdown
                                            components={{
                                              p: ({ children }) => <span className="text-slate-350">{children}</span>,
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
              ))}
              {loading && (
                <div className="flex gap-3 justify-start items-start animate-in fade-in duration-300">
                  <ChatThinking />
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
        <aside className="w-80 h-screen border-l border-white/5 bg-[#090D1F] flex flex-col justify-between shrink-0 select-none text-white font-sans overflow-y-auto purple-scrollbar p-5 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Studio Stats
            </h3>
          </div>

          {/* System Stats */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Class Stats</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase block">My Students</span>
                <span className="text-lg font-extrabold mt-1 block">136</span>
                <span className="text-[8px] text-emerald-400 mt-0.5 block font-bold">+12 this month</span>
              </div>
              <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Materials</span>
                <span className="text-lg font-extrabold mt-1 block">24</span>
                <span className="text-[8px] text-emerald-400 mt-0.5 block font-bold">3 subjects</span>
              </div>
              <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Quizzes</span>
                <span className="text-lg font-extrabold mt-1 block">38</span>
                <span className="text-[8px] text-emerald-400 mt-0.5 block font-bold">+6 this week</span>
              </div>
              <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase block">Avg Score</span>
                <span className="text-lg font-extrabold mt-1 block">68%</span>
                <span className="text-[8px] text-rose-450 mt-0.5 block font-bold">-3% vs last wk</span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Active Alerts</span>
            <div className="space-y-2 text-[10px] font-bold">
              <div className="p-3 rounded-xl border border-rose-500/15 bg-rose-500/5 flex justify-between items-center text-rose-350">
                <span>Chemistry lab attendance drop</span>
                <span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded text-[8px]">11</span>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 flex justify-between items-center text-amber-350">
                <span>Wave Optics struggles detected</span>
                <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[8px]">14</span>
              </div>
              <div className="p-3 rounded-xl border border-blue-500/15 bg-blue-500/5 flex justify-between items-center text-blue-355">
                <span>Calculus quiz pending review</span>
                <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[8px]">1</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Quick Actions</span>
            <div className="space-y-2">
              {["Create Practice Quiz", "Upload Lesson Slide", "Email Weak Students"].map((act, i) => (
                <button key={i} className="w-full py-2 px-3 rounded-xl border border-white/5 bg-slate-900/40 text-left hover:bg-slate-900/70 hover:border-blue-500/20 text-[10px] font-bold transition flex justify-between items-center text-slate-330">
                  <span>{act}</span>
                  <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-3.5 pt-4 border-t border-white/5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">AI Configuration</span>
            <div className="space-y-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-450">
              <div className="flex justify-between items-center">
                <span>Analysis Depth</span>
                <span className="text-blue-400 font-extrabold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">Deep</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Data Scope</span>
                <span className="text-slate-300 font-extrabold bg-white/5 border border-white/5 px-2 py-0.5 rounded">CS & Math</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alert Sensitivity</span>
                <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">High</span>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
