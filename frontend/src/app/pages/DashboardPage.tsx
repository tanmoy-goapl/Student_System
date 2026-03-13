"use client";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    documents: 0,
    chatMessages: 0,
  });

  const getStudentId = () => parseInt(localStorage.getItem("user_id") || "0", 10);

  useEffect(() => {
    async function loadStats() {
      const sid = getStudentId();
      if (!sid || isNaN(sid)) return;

      try {
        // Fetch document count
        const docsRes = await fetch(`/api/documents?student_id=${sid}`);
        if (docsRes.ok) {
          const docs = await docsRes.json();
          setStats((prev) => ({ ...prev, documents: docs.length || 0 }));
        }

        // Fetch chat message count
        const chatRes = await fetch(`/api/chat/history?student_id=${sid}`);
        if (chatRes.ok) {
          const messages = await chatRes.json();
          setStats((prev) => ({ ...prev, chatMessages: messages.length || 0 }));
        }
      } catch {
        // silent
      }
    }
    loadStats();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.documents}</div>
          <div className="text-gray-600">Documents Uploaded</div>
        </div>
        <div className="p-6 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.chatMessages}</div>
          <div className="text-gray-600">Chat Messages</div>
        </div>
      </div>
    </div>
  );
}
