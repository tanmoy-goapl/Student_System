"use client";

import { useState } from "react";

export default function MentorPreferences({ data }: any) {
  const [selected, setSelected] = useState("Career");

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-200">
          AI Preferences
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Configure how Mentor AI thinks, responds, and assists you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {data.map((item: any) => {
          const isSelected = selected === item.title;

          return (
            <button
              key={item.id}
              onClick={() => setSelected(item.title)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                  : "border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60"
              }`}
            >
              <div className="mb-3 flex items-center justify-center">
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    isSelected
                      ? "border-blue-400 bg-blue-400"
                      : "border-slate-600"
                  }`}
                />
              </div>

              <p className="text-sm font-medium text-slate-200">
                {item.title}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {item.subheading}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}