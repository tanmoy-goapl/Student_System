"use client";

import { useState } from "react";

export default function ToneSelector({ data }: any) {
  const [selected, setSelected] = useState("Friendly");

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-200">
          Tone
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Choose the communication tone for Mentor AI.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {data.map((item: any) => {
          const isSelected = selected === item.title;

          return (
            <button
              key={item.id}
              onClick={() => setSelected(item.title)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-lg shadow-yellow-500/10"
                  : "border-white/10 bg-slate-800/40 text-slate-300 hover:border-white/20 hover:bg-slate-800/60"
              }`}
            >
              {item.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}