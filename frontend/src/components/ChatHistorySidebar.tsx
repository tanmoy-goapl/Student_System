"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Loader from "./Loader";

type HistoryItem = {
  role: string;
  content: string;
  created_at?: string | null;
};

interface ChatHistorySidebarProps {
  studentId: number | null;
  open: boolean;
  onClose: () => void;
  onSelectEntry?: (item: HistoryItem) => void;
}

const PAGE_SIZE = 10;

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
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
  onSelectEntry,
}: ChatHistorySidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!studentId || Number.isNaN(studentId)) {
      setItems([]);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/chat/history?student_id=${studentId}`);
        if (!res.ok) {
          throw new Error("Failed to load history");
        }
        const data = (await res.json()) as HistoryItem[];
        // show most recent first
        setItems(data.reverse());
        setPage(1);
      } catch (e: any) {
        setError(e.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, studentId]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.filter((i) => i.role === "user");
    return items.filter(
      (i) => i.role === "user" && i.content.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  if (!open) return null;

  const handleDelete = async (item: HistoryItem) => {
    if (!studentId || Number.isNaN(studentId) || !item.created_at) return;
    const key = `${item.role}-${item.created_at}-${item.content.slice(0, 20)}`;
    try {
      setDeletingKey(key);
      // Optimistically remove from UI first so the user always sees feedback.
      setItems((prev) =>
        prev.filter(
          (p) =>
            !(
              p.role === item.role &&
              p.created_at === item.created_at &&
              p.content === item.content
            )
        )
      );

      const res = await fetch(
        `/api/chat/history/item?student_id=${studentId}&created_at=${encodeURIComponent(
          item.created_at
        )}&role=${encodeURIComponent(item.role)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        // If backend delete fails, we silently ignore. Item will return only
        // after a full reload from the server.
        return;
      }
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    // Position sidebar just below the sticky navbar so it never overlaps it.
    <aside className="fixed top-14 bottom-0 left-0 z-20 w-72 bg-white shadow-xl border-r border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            ⟳
          </span>
          <h2 className="text-sm font-semibold text-gray-800">Chat History</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close history"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in history..."
            className="flex-1 bg-transparent text-xs outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto purple-scrollbar text-xs">
        {loading && (
          <Loader fullScreen text="Loading..." />
        )}
        {error && !loading && (
          <div className="p-4 text-red-500 text-center">{error}</div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="p-4 text-gray-400 text-center">
            No history yet. Start chatting to see it here.
          </div>
        )}

        {visible.map((item, idx) => {
          const key = `${item.role}-${item.created_at}-${item.content.slice(
            0,
            20
          )}`;
          const isDeleting = deletingKey === key;
          return (
            <div
              key={idx}
              className="group flex items-center justify-between border-b border-gray-100 px-4 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onSelectEntry?.(item);
                onClose();
              }}
            >
              <div className="min-w-0">
                <div className="text-[10px] text-gray-400 mb-1">
                  {formatRelativeTime(item.created_at)}
                </div>
                <div className="text-gray-800 truncate">{item.content}</div>
              </div>
              <button
                type="button"
                aria-label="Delete history entry"
                className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item);
                }}
                disabled={isDeleting}
              >
                <svg
                  width="18"
                  height="18"
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

      <div className="border-t border-gray-200 px-2 py-2 flex items-center justify-between text-[11px] text-gray-600">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe === 1}
          className="px-2 py-1 rounded disabled:opacity-40 hover:bg-gray-100"
        >
          ‹
        </button>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-blue-600">{pageSafe}</span>
          <span>/</span>
          <span>{totalPages}</span>
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageSafe === totalPages}
          className="px-2 py-1 rounded disabled:opacity-40 hover:bg-gray-100"
        >
          ›
        </button>
      </div>
    </aside>
  );
}

