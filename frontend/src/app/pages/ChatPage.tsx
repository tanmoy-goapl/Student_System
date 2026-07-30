"use client";

import { useState, useEffect, useRef } from "react";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { Paperclip, Send, Square, CheckCircle2, ChevronRight, Activity, CalendarDays, Sparkles, History, Plus } from "lucide-react";
import RightSidebar from "@/components/RightSidebar";
import { getChatSidebarData, uploadDocument } from "@/lib/api";
import Link from "next/link";
import { OfflineState, ChatThinking } from "@/components/UIStateSystem";

type Message = { 
  role: string; 
  content: string; 
  created_at?: string | null;
  intent?: string;
  roadmap_metadata?: { title: string; duration: string; weeks: number; tasks: number };
  suggest_roadmap?: boolean;
  options?: string[];
};

function getStoredUser() {
  const id = parseInt(localStorage.getItem("user_id") || "0", 10);
  const role = (localStorage.getItem("role") || "student") as "admin" | "student" | "professor";
  const name =
    localStorage.getItem("user_name") ||
    (localStorage.getItem("user_email") || "").split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ||
    "User";
  return { id, role, name };
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetNext, setResetNext] = useState(false);
  const [user, setUser] = useState<{ id: number; role: string; name: string } | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<any>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetChatTextRef = useRef("");
  const chatTypewriterIntervalRef = useRef<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    return () => {
      if (chatTypewriterIntervalRef.current) clearInterval(chatTypewriterIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat/history?student_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data || []);
          if (data && data.length > 0 && data[0].session_id) {
            setActiveSessionId(data[0].session_id);
          }
        }
      } catch (err) {
        console.error("Failed to load student chat history:", err);
      }
    };
    fetchHistory();
  }, [user]);

  useEffect(() => {
    getChatSidebarData().then(data => {
      setRoleSuggestions(data.ROLE_SUGGESTIONS);
    }).catch(err => console.error("Failed to fetch suggestions", err));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("chat_input");
    if (saved) setQuestion(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_input", question);
  }, [question]);

  const scrollThrottleRef = useRef<number>(0);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setError("");
    setFileUploading(true);
    try {
      const res = await uploadDocument(user.id, file, "owner");
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

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || !user?.id) return;

    setError("");
    setHistory(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    localStorage.removeItem("chat_input");
    setLoading(true);
    setIsStreaming(true);

    const t_click = performance.now();
    console.log(`\n--- NEW REQUEST ---`);
    console.log(`[Timing] Request started at ${t_click.toFixed(1)}ms`);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          question: q,
          role: user.role,
          reset: resetNext,
          session_id: activeSessionId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Error ${res.status}`);
      }

      console.log(`[Timing] Headers received from Next.js proxy: ${(performance.now() - t_click).toFixed(1)}ms`);
      setLoading(false); // remove initial typing dots indicator

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      // Prepend an empty assistant message which we will fill progressively
      setHistory(prev => [...prev, { role: "assistant", content: "" }]);

      targetChatTextRef.current = "";
      if (chatTypewriterIntervalRef.current) {
        clearInterval(chatTypewriterIntervalRef.current);
      }

      const decoder = new TextDecoder();
      let done = false;
      let finalIntent = "";
      let finalMetadata = null;
      let finalSuggest = false;
      let finalSessionId = "";
      let finalOptions = undefined;
      let buffer = "";
      let contentStarted = false;
      let firstChunkReceived = false;

      // Start typewriter ticker loop
      let currentTypewriterLength = 0;
      chatTypewriterIntervalRef.current = setInterval(() => {
        if (currentTypewriterLength < targetChatTextRef.current.length) {
          const diff = targetChatTextRef.current.length - currentTypewriterLength;
          const step = diff > 150 ? 10 : diff > 40 ? 4 : diff > 10 ? 2 : 1;
          currentTypewriterLength += step;
          const textChunk = targetChatTextRef.current.slice(0, currentTypewriterLength);
          
          setHistory(prev => {
            const copy = [...prev];
            if (copy.length > 0) {
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: textChunk,
              };
            }
            return copy;
          });
        }
      }, 20);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          if (!firstChunkReceived) {
            console.log(`[Timing] Network: First byte received by browser: ${(performance.now() - t_click).toFixed(1)}ms`);
            firstChunkReceived = true;
          }
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
              if (parsed.status !== undefined) {
                setStreamStatus(parsed.status);
              }
              if (parsed.content) {
                if (!contentStarted) {
                  console.log(`[Timing] React: First token parsed and state update triggered: ${(performance.now() - t_click).toFixed(1)}ms`);
                  contentStarted = true;
                  setStreamStatus("");
                }
                targetChatTextRef.current += parsed.content;
              }
              if (parsed.intent) {
                finalIntent = parsed.intent;
              }
              if (parsed.roadmap_metadata) {
                finalMetadata = parsed.roadmap_metadata;
              }
              if (parsed.suggest_roadmap) {
                finalSuggest = true;
              }
              if (parsed.options) {
                finalOptions = parsed.options;
              }
              if (parsed.session_id) {
                finalSessionId = parsed.session_id;
              }
            } catch (err) {
              console.error("Error parsing stream line:", err);
            }
          }
        }
      }

      // Final state updates and cleanup
      if (chatTypewriterIntervalRef.current) {
        clearInterval(chatTypewriterIntervalRef.current);
      }
      setHistory(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: targetChatTextRef.current,
            intent: finalIntent,
            roadmap_metadata: finalMetadata,
            suggest_roadmap: finalSuggest,
            options: finalOptions,
          };
        }
        return copy;
      });

      if (finalSessionId) {
        setActiveSessionId(finalSessionId);
      }

      if (!targetChatTextRef.current && !finalMetadata) {
        setError("No response received. Please try again.");
        setHistory(prev => prev.slice(0, -1));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handle stop gracefully
        setStreamStatus("");
      } else {
        setError(err.message || "Failed to get answer. Please try again.");
        setHistory(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      setStreamStatus("");
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (resetNext) setResetNext(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    const handleNewChat = () => {
      setHistory([]);
      setQuestion("");
      setError("");
      setResetNext(true);
      setActiveSessionId(null);
    };

    window.addEventListener("new-chat", handleNewChat);
    return () => {
      window.removeEventListener("new-chat", handleNewChat);
    };
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/history?student_id=${user.id}&session_id=${sessionId}`);
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

  const handleSelectHistoryEntry = async (item: { content: string; created_at?: string | null }) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/chat/history?student_id=${user.id}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();

      let idx = item.created_at
        ? data.findIndex(m => m.role === "user" && m.created_at === item.created_at)
        : -1;

      if (idx === -1) {
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].role === "user" && data[i].content === item.content) { idx = i; break; }
        }
      }

      if (idx === -1) { setHistory(data); return; }

      let end = data.length;
      for (let i = idx + 1; i < data.length; i++) {
        if (data[i].role === "user") { end = i; break; }
      }
      setHistory(data.slice(idx, end));
    } catch {
      // silent
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
            <button
              onClick={() => {
                setQuestion("Update Learning Preferences");
                setTimeout(() => {
                  const btn = document.getElementById("chat-send-btn");
                  if (btn) (btn as HTMLButtonElement).click();
                }, 50);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs font-semibold hover:border-blue-500/30 hover:bg-blue-500/20 transition cursor-pointer text-blue-300"
              title="Update Learning Preferences"
            >
              <Sparkles size={14} className="text-blue-400 animate-pulse" />
              <span>Update Preferences</span>
            </button>

            <button
              onClick={() => {
                window.dispatchEvent(new Event("new-chat"));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/10 transition cursor-pointer text-white"
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
                {roleSuggestions?.[user?.role as keyof typeof roleSuggestions]?.map((item: any, i: number) => (
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

function ChatBubble({ msg, isGenerating, onAsk }: { msg: Message, isGenerating?: boolean, onAsk?: (q: string) => void }) {
  const isUser = msg.role === "user";
  
  if (!isUser && !msg.content && !msg.roadmap_metadata && !isGenerating) {
    return null;
  }
  
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar /> : <Avatar initials="AI" />}
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm border backdrop-blur-md whitespace-pre-wrap break-words
          ${isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/20 rounded-2xl rounded-br-none shadow-lg shadow-blue-500/10"
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
            {msg.options.map((opt, optIdx) => (
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