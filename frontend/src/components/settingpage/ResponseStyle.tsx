"use client";

import { useState } from "react";

export default function ResponseStyle({ data, selected, onChange }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-200">
          Response Style
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Choose how Mentor AI structures its responses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.map((item: any) => {
          const isSelected = selected === item.title;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.title)}
              type="button"
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60"
              }`}
            >
              <div className="mb-3 flex justify-end">
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    isSelected
                      ? "border-purple-400 bg-purple-400"
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