"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, Search } from 'lucide-react';
import { DashboardContentLoader } from '@/components/DashboardLoading';
import { getAdminScopedEndpoint } from '@/lib/adminAuth';

interface ProfessorData {
  id: number;
  name: string;
  classes: number;
  email?: string;
  department?: string | null;
  department_name?: string | null;
}

export default function ProfessorsPage() {
  const { role, userId } = useAuth();
  const [professors, setProfessors] = useState<ProfessorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchProfessors() {
      if (role !== 'admin' || !userId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(getAdminScopedEndpoint('/api/admin/professors'));
        if (res.ok) {
          const data = await res.json();
          setProfessors(data);
        }
      } catch (e) {
        console.error("Failed to fetch professors roster", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfessors();
  }, [role, userId]);

  const filteredProfessors = professors.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 pl-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-500" /> 
              Professors Directory
            </h1>
            <p className="text-slate-400">Overview of all faculty members and their assigned course classrooms.</p>
          </div>
          
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search professors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <DashboardContentLoader text="Loading professors..." />
        ) : (
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="px-6 py-5 font-semibold">Professor Name</th>
                    <th className="px-6 py-5 font-semibold">Department</th>
                    <th className="px-6 py-5 font-semibold text-right">Assigned Classes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProfessors.length > 0 ? (
                    filteredProfessors.map((prof) => (
                      <tr key={prof.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-5 font-semibold text-white">{prof.name}</td>
                        <td className="px-6 py-5 text-sm text-cyan-300">
                          {prof.department_name || prof.department || "Unassigned"}
                        </td>
                        <td className="px-6 py-5 text-indigo-400 font-bold text-right">
                          {prof.classes}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        No professors found matching search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
