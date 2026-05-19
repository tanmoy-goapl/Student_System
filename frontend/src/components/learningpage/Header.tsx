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
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
      <p className="text-[0.6rem] text-zinc-400">{label}</p>

      <p className={`mt-2 text-lg font-bold ${valueColor}`}>{value}</p>
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
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* LEFT */}
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge>{data.category}</Badge>

            <Badge variant="danger">{data.status}</Badge>
          </div>

          <h1 className="text-xl font-bold text-white">
            {data.title}
          </h1>

          <p className="mt-3 text-sm text-zinc-400">{data.subtitle}</p>
        </div>

        {/* RIGHT */}
        <div className="flex flex-wrap gap-4">
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