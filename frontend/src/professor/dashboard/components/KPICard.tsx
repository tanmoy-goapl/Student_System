"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  value: string | number;
  label: string;
  gradient: string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  children?: React.ReactNode;
}

export default function KPICard({
  value,
  label,
  gradient,
  icon: Icon,
  subtitle,
  trend,
  children
}: KPICardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl group transition-all duration-300 hover:border-white/10 flex flex-col justify-between min-h-[140px]">
      {/* Background glow */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br ${gradient}`} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">{label}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
            {trend && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "bg-rose-500/10 text-rose-400"
              }`}>
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-indigo-500/10 shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {children && <div className="mt-3 relative z-10 w-full">{children}</div>}
    </div>
  );
}
