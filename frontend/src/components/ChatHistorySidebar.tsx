"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Loader from "./Loader";

type SessionItem = {
  session_id: string;
  session_title: string;
  created_at?: string | null;
};

interface ChatHistorySidebarProps {
  studentId: number | null;
  open: boolean;
  onClose: () => void;
  onSelectSession?: (sessionId: string) => void;
  activeSessionId?: string | null;
}

const PAGE_SIZE = 10;

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  
  // Ensure the timestamp is treated as UTC if the backend didn't append the timezone
  let safeIso = iso.replace(" ", "T");
  if (!safeIso.endsWith("Z") && !safeIso.includes("+")) {
    safeIso += "Z";
  }
  
  const date = new Date(safeIso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default function ChatHistorySidebar({
  studentId,
  open,
  onClose,
  onSelectSession,
  activeSessionId,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSessions = async () => {
    if (!studentId || Number.isNaN(studentId)) {
      setSessions([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/chat/sessions?student_id=${studentId}`);
      if (!res.ok) {
        throw new Error("Failed to load history sessions");
      }
      const data = (await res.json()) as SessionItem[];
      setSessions(data);
      setPage(1);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open, studentId]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.session_title.toLowerCase().includes(q));
  }, [sessions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  if (!open) return null;

  const handleDelete = async (sessionId: string) => {
    if (!studentId || Number.isNaN(studentId)) return;
    try {
      setDeletingSessionId(sessionId);
      // Optimistically remove from UI
      setSessions((prev) => prev.filter((p) => p.session_id !== sessionId));

      const res = await fetch(
        `/api/chat/history?student_id=${studentId}&session_id=${sessionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to delete session");
      }
    } catch (err) {
      console.error(err);
      // reload sessions on error to sync back
      fetchSessions();
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    // Rendered as a flex item within the parent layout container
    <aside className="w-72 h-full shrink-0 bg-[#090D1F] border-r border-white/5 flex flex-col text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-[#0b1227]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
            ⟳
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Chat History</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition text-sm font-semibold"
          aria-label="Close history"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-3 border-b border-white/5 bg-[#0a0f21]">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event("new-chat"));
            onClose();
          }}
          className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2.5 shadow-lg shadow-blue-500/10 transition text-white"
        >
          <span>+</span> New Chat
        </button>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-xs">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in history..."
            className="flex-1 bg-transparent text-xs outline-none text-white placeholder:text-white/20"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto purple-scrollbar text-xs p-2 space-y-1">
        {loading && sessions.length === 0 && (
          <div className="py-20 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="p-4 text-rose-400 text-center">{error}</div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="p-8 text-slate-500 text-center">
            No history yet. Start chatting to see your sessions here.
          </div>
        )}

        {visible.map((item, idx) => {
          const isSelected = activeSessionId === item.session_id;
          const isDeleting = deletingSessionId === item.session_id;
          return (
            <div
              key={idx}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                isSelected 
                  ? "bg-blue-600/10 border border-blue-500/25 text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
              onClick={() => {
                onSelectSession?.(item.session_id);
                onClose();
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9px] text-slate-400 font-semibold mb-0.5">
                  {formatRelativeTime(item.created_at)}
                </div>
                <div className="text-xs font-semibold truncate leading-snug">{item.session_title}</div>
              </div>
              <button
                type="button"
                aria-label="Delete history session"
                className="ml-2 text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.session_id);
                }}
                disabled={isDeleting}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline-block"
                >
                  <path
                    d="M9 3H15M4 7H20M17 7L16.2 18.2C16.13 19.26 15.26 20.1 14.2 20.1H9.8C8.74 20.1 7.87 19.26 7.8 18.2L7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11V16M14 11V16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/5 bg-[#0b1227] px-3 py-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe === 1}
          className="px-2 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5 transition"
        >
          ‹ Prev
        </button>
        <div className="flex items-center gap-1 font-semibold">
          <span className="text-blue-400">{pageSafe}</span>
          <span>/</span>
          <span>{totalPages}</span>
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageSafe === totalPages}
          className="px-2 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5 transition"
        >
          Next ›
        </button>
      </div>
    </aside>
  );
}
