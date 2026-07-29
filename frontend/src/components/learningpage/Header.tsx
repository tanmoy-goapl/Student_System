"use client";

import { LearningHeaderResponse } from "@/constants/learningpage-data";
import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "danger";
}

function Badge({ children, variant = "primary" }: BadgeProps) {
  const styles =
    variant === "primary"
      ? "bg-indigo-500/15 text-indigo-300 border-indigo-400/20"
      : "bg-red-500/15 text-red-300 border-red-400/20";

  return (
    <div
      className={`rounded-lg border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${styles}`}
    >
      {children}
    </div>
  );
}


interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatCard({
  label,
  value,
  valueColor = "text-white",
}: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl text-center w-24 sm:w-28 md:w-32 h-20 sm:h-24 transition-all hover:bg-white/[0.06] hover:border-white/20 shrink-0">
      <p className="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wider text-zinc-400">{label}</p>

      <p className={`mt-1.5 sm:mt-2 text-sm sm:text-base md:text-lg font-extrabold ${valueColor}`}>{value}</p>
    </div>
  );
}

interface LearningSectionHeaderProps {
  data: LearningHeaderResponse["data"];
}

export function Header({
  data,
}: LearningSectionHeaderProps) {
  const difficultyStat = data.stats.find(s => s.label === "Difficulty");
  const accuracyStat = data.stats.find(s => s.label === "Accuracy");

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <Badge>{data.category}</Badge>
          <Badge variant="danger">{data.status}</Badge>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          {data.title}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">{data.subtitle}</p>
      </div>

      <div className="flex items-center gap-6 self-start sm:self-center bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
        {difficultyStat && (
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Difficulty</span>
            <span className={`text-sm font-bold ${difficultyStat.valueColor || "text-white"}`}>{difficultyStat.value}</span>
          </div>
        )}
        <div className="h-8 w-[1px] bg-white/10" />
        {accuracyStat && (
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Accuracy</span>
            <span className={`text-sm font-bold ${accuracyStat.valueColor || "text-white"}`}>{accuracyStat.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}