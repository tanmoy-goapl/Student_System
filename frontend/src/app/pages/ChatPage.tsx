"use client";

import { useState, useEffect, useRef } from "react";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ReactMarkdown from "react-markdown";
import { ConfigProvider, Radio } from "antd";
import Image from "next/image";
import { Paperclip, Send, PanelRightOpen, PanelRightClose } from "lucide-react";
import { ROLE_SUGGESTIONS } from "@/constants/chat-suggestions";
import RightSidebar from "@/components/RightSidebar";

type Message = { role: string; content: string; created_at?: string | null };

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
  const [error, setError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetNext, setResetNext] = useState(false);
  const [user, setUser] = useState<{ id: number; role: string; name: string } | null>(null);
  const [mode, setMode] = useState("explain");
  const [rightOpen, setRightOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setUser(getStoredUser()); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("chat_input");
    if (saved) setQuestion(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_input", question);
  }, [question]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || !user?.id) return;

    setError("");
    setHistory(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    localStorage.removeItem("chat_input");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          question: q,
          role: user.role,
          reset: resetNext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Error ${res.status}`);

      if (data.answer) {
        setHistory(prev => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        setError("No response received. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to get answer. Please try again.");
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      if (resetNext) setResetNext(false);
    }
  };

useEffect(() => {
  const handleNewChat = () => {
    setHistory([]);
    setQuestion("");
    setError("");
    setResetNext(true);
  };

  window.addEventListener("new-chat", handleNewChat);

  return () => {
    window.removeEventListener("new-chat", handleNewChat);
  };
}, []);

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
    // Outer: row so chat + right sidebar sit side by side
    <div className="flex w-full h-screen font-sans overflow-hidden">

      {/* ── Left: chat column ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

        <ChatHistorySidebar
          studentId={user?.id ?? null}
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectEntry={handleSelectHistoryEntry}
        />

        {/* Top bar */}

        <ConfigProvider
          theme={{
            components: {
              Radio: {
                buttonBg: "#000000",
                buttonCheckedBg: "#1C398E66",
                buttonColor: "#9CA3AF",
                buttonSolidCheckedColor: "#ffffff",
                buttonSolidCheckedBg: "#165EFC",
                buttonSolidCheckedHoverBg: "#1C398E66",
                colorBorder: "transparent",
              },
            },
          }}
        >
          <div className="shrink-0 py-3 px-4 bg-[#0D122199] border-b border-white/10 flex items-center gap-3">

            {/* LEFT: logo */}
            <div className="flex items-center gap-2 w-[120px]">
              <Image src="/mentor-logo.png" alt="Mentor AI" width={28} height={28} className="rounded-xl" />
              <span className="text-sm font-bold text-white">Mentor AI</span>
            </div>

            {/* CENTER: mode toggle */}
            <div className="flex-1 flex justify-center">
              <Radio.Group
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="explain" className="px-5 text-center">Explain</Radio.Button>
                <Radio.Button value="quiz" className="px-5 text-center">Quiz</Radio.Button>
                <Radio.Button value="quick" className="px-5 text-center">Quick Answer</Radio.Button>
              </Radio.Group>
            </div>

            {/* RIGHT: panel toggle */}
            <div className="w-[120px] flex justify-end">
              <button
                onClick={() => setRightOpen(v => !v)}
                title={rightOpen ? "Close panel" : "Open insights panel"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                  ${rightOpen
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                  }`}
              >
                {rightOpen
                  ? <PanelRightClose size={14} />
                  : <PanelRightOpen size={14} />
                }
                <span>{rightOpen ? "Close" : "Insights"}</span>
              </button>
            </div>

          </div>
        </ConfigProvider>

        {/* Message area */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

          {history.length === 0 && !loading && (
            <div className="flex flex-col items-center h-[68vh] overflow-hidden gap-6 text-center px-4">
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
                {ROLE_SUGGESTIONS[user?.role as keyof typeof ROLE_SUGGESTIONS]?.map((item, i) => (
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

          {history.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

          {loading && (
            <div className="flex items-center gap-2">
              <Avatar initials="AI" />
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl rounded-bl-none px-4 py-3">
                <TypingDots />
              </div>
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
            <button type="button" className="text-gray-400 hover:text-white transition">
              <Paperclip size={18} />
            </button>
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
              placeholder="Ask about your marks, study plan, feedback…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && !e.shiftKey && handleAsk()}
              disabled={loading || !user?.id}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim() || !user?.id}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: insights panel (slides in/out) ── */}
      <div className={`shrink-0 h-full min-h-0 border-l border-white/8 bg-[#080d19]/80 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-in-out ${rightOpen ? "w-64" : "w-0"}`}>

        {/* Always mounted so it doesn't remount on open */}
        <div className="w-64 h-full overflow-y-auto">
          <RightSidebar />
        </div>
      </div>

    </div>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar /> : <Avatar initials="AI" />}
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm border backdrop-blur-md
          ${isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/20 rounded-2xl rounded-br-none shadow-lg shadow-blue-500/10"
            : "bg-white/5 text-blue-100 border-white/10 rounded-2xl rounded-bl-none"
          }`}
      >
        <ReactMarkdown
          components={{
            h3: ({ children }) => <h3 className="font-semibold text-base mt-2 mb-1 text-white">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc ml-4 space-y-1 text-blue-200">{children}</ul>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            p: ({ children }) => <p className="mb-1.5 last:mb-0 text-blue-100">{children}</p>,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-blue-900/60 text-blue-200 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
      {initials}
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