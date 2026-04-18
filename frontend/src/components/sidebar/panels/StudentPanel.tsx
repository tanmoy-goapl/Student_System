"use client";

import { STUDENT_DATA } from "@/constants/chat-sidebar-data";
import StatCard from "../StatCard";

export default function StudentPanel() {
  const d = STUDENT_DATA;
  const pct = Math.round((d.docsLoaded / d.docsTotal) * 100);

  return (
    <div className="space-y-4">
      {/* Context card */}
      <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🧠</span>
          <span className="text-xs font-bold text-white">{d.contextTitle}</span>
        </div>
        <div className="flex justify-between text-[11px] text-white/60 mb-1">
          <span>Documents loaded</span>
          <span className="text-white font-medium">{d.docsLoaded} / {d.docsTotal}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">{d.docsReady}</p>
      </div>

      {/* Active documents */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Active Documents</p>
        <div className="space-y-1.5">
          {d.documents.map((doc) => (
            <div key={doc.name} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-2">
              <span className="text-sm">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{doc.name}</p>
                <p className="text-[10px] text-white/40">{doc.type} · {doc.pages} pages</p>
              </div>
              <span className={`text-sm ${doc.active ? "text-emerald-400" : "text-white/20"}`}>
                {doc.active ? "✓" : "○"}
              </span>
            </div>
          ))}
        </div>
        <button className="w-full mt-2 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition">
          ↑ Manage Documents
        </button>
      </div>

      {/* Session stats */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Session Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {d.stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </div>
    </div>
  );
}