"use client";

import { useEffect, useState } from "react";
import StudentPanel from "./sidebar/panels/StudentPanel";
import ProfessorPanel from "./sidebar/panels/ProfessorPanel";
import AdminPanel from "./sidebar/panels/AdminPanel";

const PANEL_META = {
  student: { label: "Context", icon: "🧠" },
  professor: { label: "Class Panel", icon: "📊" },
  admin: { label: "Insights", icon: "⚡" },
} as const;

export default function RightSidebar() {
  const [role, setRole] = useState<"student" | "professor" | "admin" | null>(null);

  useEffect(() => {
    const r = localStorage.getItem("role") as typeof role;
    setRole(r);
    const onStorage = () => setRole(localStorage.getItem("role") as typeof role);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!role) return null;

  const meta = PANEL_META[role];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-3.5 border-b border-white/8">
        <span className="text-base">{meta.icon}</span>
        <span className="text-xs font-bold text-white tracking-wide">{meta.label}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto purple-scrollbar p-3 space-y-1">
        {role === "student" && <StudentPanel />}
        {role === "professor" && <ProfessorPanel />}
        {role === "admin" && <AdminPanel />}
      </div>
    </div>
  );
}