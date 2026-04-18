"use client";

import { useState, useEffect, useRef } from "react";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ReactMarkdown from "react-markdown";

type Message = { role: string; content: string; created_at?: string | null };

// ─── helpers ──────────────────────────────────────────────────────────────────
function getStoredUser() {
  const id   = parseInt(localStorage.getItem("user_id")    || "0", 10);
  const role = (localStorage.getItem("role") || "student") as "admin" | "student" | "professor";
  const name =
    localStorage.getItem("user_name") ||
    (localStorage.getItem("user_email") || "").split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ||
    "User";
  return { id, role, name };
}

// ─── component ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [question,      setQuestion]      = useState("");
  const [history,       setHistory]       = useState<Message[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetNext,     setResetNext]     = useState(false);
  const [user,          setUser]          = useState<{ id: number; role: string; name: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ── init: read from localStorage once ─────────────────────────────────────
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // ── restore draft question ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("chat_input");
    if (saved) setQuestion(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_input", question);
  }, [question]);

  // ── auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // ── send message ───────────────────────────────────────────────────────────
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
          question:   q,
          role:       user.role,
          reset:      resetNext,
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

  // ── new session ────────────────────────────────────────────────────────────
  const handleNewSession = () => {
    setHistory([]);
    setQuestion("");
    setError("");
    setResetNext(true);
  };

  // ── load history entry from sidebar ───────────────────────────────────────
  const handleSelectHistoryEntry = async (item: { content: string; created_at?: string | null }) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/chat/history?student_id=${user.id}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();

      // Find the clicked message by timestamp or content
      let idx = item.created_at
        ? data.findIndex(m => m.role === "user" && m.created_at === item.created_at)
        : -1;

      if (idx === -1) {
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].role === "user" && data[i].content === item.content) { idx = i; break; }
        }
      }

      if (idx === -1) { setHistory(data); return; }

      // Slice from that message to the next user message
      let end = data.length;
      for (let i = idx + 1; i < data.length; i++) {
        if (data[i].role === "user") { end = i; break; }
      }
      setHistory(data.slice(idx, end));
    } catch {
      // silent
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-gray-50 font-sans">

      {/* Chat history sidebar */}
      <ChatHistorySidebar
        studentId={user?.id ?? null}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectEntry={handleSelectHistoryEntry}
      />

      {/* Left action bar */}
      {/* {!isHistoryOpen && (
        <div className="fixed left-4 top-24 flex flex-col gap-3 z-20">
          <IconButton label="Menu"     onClick={() => setIsHistoryOpen(v => !v)} icon={<MenuIcon />} />
          <IconButton label="New chat" onClick={handleNewSession}                icon={<PlusIcon />} />
          <IconButton label="Search"   onClick={() => setIsHistoryOpen(true)}    icon={<SearchIcon />} />
        </div>
      )} */}

      {/* Page title */}
      <div className="pt-6 pb-3 text-center">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Mentor AI</h1>
        {user && (
          <p className="text-xs text-gray-400 mt-0.5">
            {user.name} · <span className="capitalize">{user.role}</span>
          </p>
        )}
      </div>

      {/* Chat card */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-medium rounded-full bg-blue-50 bg-blue-50 p-2">{user?.name || "—"}</span>
            <button
              onClick={handleNewSession}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
            >
              New Session
            </button>
          </div>

          {/* Message area */}
          <div className="h-[50vh] overflow-y-auto p-5 space-y-4 bg-gray-50/40">

            {/* Empty state */}
            {history.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                    <circle cx="9"  cy="10" r="1.2" fill="currentColor"/>
                    <circle cx="15" cy="10" r="1.2" fill="currentColor"/>
                    <path d="M8 14.5c1-1.5 7-1.5 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Ask me anything</p>
                  <p className="text-xs text-gray-400 mt-0.5">About your marks, study plan, or feedback</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {history.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-2">
                <Avatar initials="AI" />
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-3 text-red-400 hover:text-red-600 font-bold text-base leading-none">×</button>
            </div>
          )}

          {/* Input */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent
                         disabled:opacity-50 transition-all placeholder:text-gray-400"
              placeholder="Ask about your marks, study plan, feedback…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && !e.shiftKey && handleAsk()}
              disabled={loading || !user?.id}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim() || !user?.id}
              className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl
                         hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all"
            >
              Send
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser
        ? <UserAvatar />
        : <Avatar initials="AI" />
      }
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm shadow-sm
          ${isUser
            ? "bg-blue-500 text-white rounded-2xl rounded-br-none"
            : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-none"
          }`}
      >
        <ReactMarkdown
          components={{
            h3:     ({ children }) => <h3 className="font-semibold text-base mt-2 mb-1">{children}</h3>,
            ul:     ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
            li:     ({ children }) => <li className="text-sm">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
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
    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function IconButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-9 h-9 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {icon}
    </button>
  );
}

// ─── icons ─────────────────────────────────────────────────────────────────────

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="7"  x2="20" y2="7"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/>
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}