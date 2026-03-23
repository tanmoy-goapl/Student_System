"use client";

import { useState, useEffect, useRef } from "react";
import { listUsers } from "@/lib/api";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ReactMarkdown from "react-markdown";

type UserOption = {
  id: number;
  name: string | null;
  email: string;
  role: string;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"admin" | "student" | "professor" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetNext, setResetNext] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<string | null>(null);
  const getStudentId = () => selectedUserId || parseInt(localStorage.getItem("user_id") || "0", 10);

  const getDisplayName = (user: UserOption) => {
    return user.name?.trim() || user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || user.email;
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("role") as "admin" | "student" | "professor" | null;
    const userId = parseInt(localStorage.getItem("user_id") || "0", 10);
    setRole(storedRole);
    setCurrentUserId(userId);
    setSelectedUserRole(storedRole);
    // Load users for admin
    if (storedRole === "admin" && userId) {
      listUsers(userId)
        .then((userList) => {
          setUsers(userList);
          if (userList.length > 0) {
            const firstUser = userList[1];
            setSelectedUserId(firstUser.id);
            setCurrentUserName(getDisplayName(firstUser));
            setSelectedUserRole(firstUser.role);
          }
        })
        .catch(() => {
          // silent
        });
    } else if (storedRole === "student" && userId) {
      // For students, set their own ID and name
      setSelectedUserId(userId);
      // Try to get name from localStorage or extract from email
      const userEmail = localStorage.getItem("user_email") || "";
      const userName = localStorage.getItem("user_name") || userEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      setCurrentUserName(userName);
      setSelectedUserRole("student");
    } else if (storedRole === "professor" && userId) {
      setSelectedUserId(userId);

      const userEmail = localStorage.getItem("user_email") || "";
      const userName = localStorage.getItem("user_name") ||
        userEmail.split("@")[0]
          .replace(/[._]/g, " ")
          .replace(/\b\w/g, l => l.toUpperCase());

      setCurrentUserName(userName);

      // ✅ important
      setSelectedUserRole("professor");
    }
  }, []);

  // On page load or when switching users, keep the visible chat empty.
  // Full history is still available in the Chat History sidebar.
  useEffect(() => {
    setHistory([]);
    setInitLoading(false);
  }, [selectedUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    console.log(selectedUserRole)
  }, [selectedUserRole])

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;

    const sid = getStudentId();
    if (!sid || isNaN(sid)) {
      setError("Session expired. Please log out and log in again.");
      return;
    }

    setError("");
    setHistory((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: sid,
          question: q,
          role: selectedUserRole,
          reset: resetNext
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || `Error ${res.status}`);
      }

      if (data.answer) {
        setHistory((prev) => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        setError("No response from server. Please upload a document and try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to get answer. Please try again.");
      setHistory((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      if (resetNext) {
        setResetNext(false);
      }
    }
  };

  const handleNewSession = async () => {
    const sid = getStudentId();
    if (!sid || isNaN(sid)) return;

    // Start a fresh conversation in the UI, but keep past messages in the
    // database so they remain visible in the Chat History sidebar.
    setHistory([]);
    setQuestion("");
    setError("");
    setResetNext(true);
  };

  const handleSelectHistoryEntry = async (item: { content: string; created_at?: string | null }) => {
    const sid = getStudentId();
    if (!sid || isNaN(sid)) return;
    try {
      const res = await fetch(`/api/chat/history?student_id=${sid}`);
      if (!res.ok) return;
      const data: { role: string; content: string; created_at?: string | null }[] = await res.json();

      // Find index of the clicked user message in full history
      let anchorIndex = -1;
      if (item.created_at) {
        anchorIndex = data.findIndex(
          (m) => m.role === "user" && m.created_at === item.created_at
        );
      }
      if (anchorIndex === -1) {
        // Fallback: match by content, from the end (most recent)
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].role === "user" && data[i].content === item.content) {
            anchorIndex = i;
            break;
          }
        }
      }

      if (anchorIndex === -1) {
        // If we can't locate it, just show full history
        setHistory(data);
        return;
      }

      // Take the slice from this user message until (but not including)
      // the next user message, so you see that question + its answer(s).
      let end = data.length;
      for (let i = anchorIndex + 1; i < data.length; i++) {
        if (data[i].role === "user") {
          end = i;
          break;
        }
      }
      const slice = data.slice(anchorIndex, end);
      setHistory(slice);
    } catch {
      // silent failure — keep current view
    }
  };

  return (
    <div className="relative">
      <ChatHistorySidebar
        studentId={selectedUserId}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectEntry={handleSelectHistoryEntry}
      />
      {/* Left vertical action bar under Mentor AI heading (hidden when sidebar open) */}
      {!isHistoryOpen && (
        <div className="fixed left-4 top-24 flex flex-col gap-3 z-20">
          <button
            type="button"
            aria-label="Menu"
            title="Menu"
            onClick={() => setIsHistoryOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="5" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            onClick={handleNewSession}
            className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Search"
            title="Search"
            onClick={() => setIsHistoryOpen(true)}
            className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Page heading outside chat card */}
      <div className="mt-4 mb-3 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Mentor AI</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
          {/* Top Control Bar */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
            <>
              <div className="px-4 py-2 border border-gray-300 rounded bg-gray-50 text-sm text-gray-600">
                {currentUserName || "Student"}
              </div>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200"
              >
                New Session
              </button>
            </>
          </div>

          {/* Chat Display Area */}
          <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg border border-gray-200 p-4">
            {initLoading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm">Loading…</p>
              </div>
            )}

            {!initLoading && history.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full">
                {/* Robot Icon */}
                <div className="mb-4">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-300"
                  >
                    <rect x="16" y="12" width="32" height="32" rx="4" fill="currentColor" />
                    <circle cx="24" cy="22" r="3" fill="white" />
                    <circle cx="40" cy="22" r="3" fill="white" />
                    <line x1="20" y1="32" x2="44" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm mb-1">
                  Select a user and start a session to begin chatting
                </p>
                <p className="text-gray-400 text-xs">
                  Try saying "hi" or ask about a tech issue
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-3">
                {history.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const initials = "AI";
                  return (
                    <div
                      key={i}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {/* Bot on left, user on right */}
                      {!isUser && (
                        <div className="mr-2 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                            {initials}
                          </div>
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm
  ${isUser
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                          }`}
                      >
                        <ReactMarkdown
                          components={{
                            h3: ({ children }) => (
                              <h3 className="font-semibold text-base mt-2 mb-1">
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc ml-5 space-y-1">
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2">{children}</p>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {isUser && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle
                                cx="12"
                                cy="8"
                                r="3"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              />
                              <path
                                d="M6 18.5C6.8 15.5 9 14 12 14C15 14 17.2 15.5 18 18.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm animate-pulse">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="mb-2 p-3 bg-red-100 text-red-700 rounded text-sm flex justify-between items-start">
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="ml-2 text-red-400 hover:text-red-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Message Input Area */}
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Type your message..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && !initLoading && selectedUserId && handleAsk()}
              disabled={loading || initLoading || !selectedUserId}
            />
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAsk}
              disabled={loading || initLoading || !question.trim() || !selectedUserId}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

