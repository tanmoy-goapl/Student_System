"use client";

import StatCard from "../StatCard";
import MiniBarChart from "../MiniBarChart";
import AlertItem from "../AlertItem";
import QuickActionItem from "../QuickActionItem";
import AIConfig from "../AIConfig";


export default function AdminPanel({ data }: { data: any }) {
  const d = data;

  return (
    <div className="space-y-4">
      {/* System stats */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">System Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {d.stats.map((s: any) => (
            <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} up={s.up} />
          ))}
        </div>
      </div>

      {/* Engagement trend */}
      <div className="bg-white/5 border border-white/8 rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white">Engagement Trends</span>
          <span className="text-[10px] text-white/40">7-day avg</span>
        </div>
        <MiniBarChart type="trend" values={d.engagementTrend} labels={d.trendLabels} />
      </div>

      {/* Active alerts */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">🛡 Active Alerts</p>
        <div className="space-y-1.5">
          {d.alerts.map((a: any, i: number) => (
            <AlertItem key={i} level={a.level as any} message={a.message} affected={a.affected} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="space-y-1.5">
          {d.quickActions.map((q: string) => <QuickActionItem key={q} label={q} />)}
        </div>
      </div>

      <AIConfig entries={d.aiConfig} />
    </div>
  );
}