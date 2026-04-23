"use client";

import { useState, useEffect } from "react";
import { listUsers } from "@/lib/api";
import Loader from "@/components/Loader";

function StatCard({
  value,
  label,
  gradient,
  icon,
}: {
  value: number;
  label: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
      {/* Glow accent */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-30 ${gradient}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-4xl font-bold text-white mb-1">{value}</div>
          <div className="text-sm text-slate-400">{label}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  const getAdminId = () => parseInt(localStorage.getItem("user_id") || "0", 10);

  useEffect(() => {
    async function loadStats() {
      const adminId = getAdminId();
      if (!adminId || isNaN(adminId)) { setLoading(false); return; }
      try {
        const users = await listUsers(adminId);
        const students = users.filter((u) => u.role === "student");
        const admins = users.filter((u) => u.role === "admin");
        let totalDocs = 0;
        for (const user of users) {
          try {
            const docsRes = await fetch(`/api/documents?student_id=${user.id}`);
            if (docsRes.ok) { const docs = await docsRes.json(); totalDocs += docs.length || 0; }
          } catch { /* silent */ }
        }
        setStats({ totalUsers: users.length, totalStudents: students.length, totalAdmins: admins.length, totalDocuments: totalDocs });
      } catch { /* silent */ } finally { setLoading(false); }
    }
    loadStats();
  }, []);

  if (loading) {
    return (<Loader fullScreen text="Loading..." />);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">Platform overview at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats.totalUsers}
          label="Total Users"
          gradient="from-blue-600 to-indigo-600"
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 10-8 0 4 4 0 008 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          value={stats.totalStudents}
          label="Students"
          gradient="from-cyan-500 to-blue-500"
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6m0 0l-4.5-2.5M12 15l4.5-2.5" />
            </svg>
          }
        />
        <StatCard
          value={stats.totalAdmins}
          label="Admins"
          gradient="from-violet-600 to-purple-600"
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          value={stats.totalDocuments}
          label="Total Documents"
          gradient="from-sky-500 to-cyan-400"
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}