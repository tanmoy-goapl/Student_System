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
  return (
    <div className="w-full overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-r from-[#17152b] via-[#14142a] to-[#10111d] p-6 shadow-2xl">
      <div className="flex flex-wrap gap-6 items-center justify-between w-full">
        {/* LEFT */}
        <div className="flex-1 min-w-[250px] sm:min-w-[300px]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge>{data.category}</Badge>

            <Badge variant="danger">{data.status}</Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
            {data.title}
          </h1>

          <p className="mt-2 text-xs sm:text-sm font-medium text-zinc-400">{data.subtitle}</p>
        </div>

        {/* RIGHT */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {data.stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              valueColor={stat.valueColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}