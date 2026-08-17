"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Users, AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { DashboardContentLoader } from '@/components/DashboardLoading';

export default function StudentsPage() {
  const { role } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data based on role
  useEffect(() => {
    if (role === 'admin') {
      const fetchAdminStudents = async () => {
        setLoadingStudents(true);
        try {
          const res = await fetch('/api/admin/students');
          if (res.ok) {
            const data = await res.json();
            setStudents(data);
          }
        } catch (e) {
          console.error("Failed to fetch admin students", e);
        } finally {
          setLoadingStudents(false);
          setLoadingClasses(false);
        }
      };
      fetchAdminStudents();
    } else {
      const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
          const professorId = localStorage.getItem('user_id') || '2';
          const res = await fetch(`/api/professor/classes?professor_id=${professorId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.classes && data.classes.length > 0) {
              setClasses(data.classes);
              setActiveClassId(data.classes[0].id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch professor classes", e);
        } finally {
          setLoadingClasses(false);
        }
      };
      fetchClasses();
    }
  }, [role]);

  // Fetch students for class if role is professor
  useEffect(() => {
    if (role === 'admin' || !activeClassId) return;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/professor/class/${activeClassId}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
        }
      } catch (e) {
        console.error("Failed to fetch students", e);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [activeClassId, role]);

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 pl-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-500" /> 
              {role === 'admin' ? 'Global Students Directory' : 'Class Students Directory'}
            </h1>
            <p className="text-slate-400">
              {role === 'admin' 
                ? 'Overview of all students and their system readiness metrics.' 
                : 'View and manage students across all your classes.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* Class Selector Dropdown for Professors */}
            {role !== 'admin' && (
              <div className="relative w-64">
                <select 
                  value={activeClassId || ''} 
                  onChange={(e) => setActiveClassId(Number(e.target.value))}
                  className="w-full appearance-none bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  disabled={loadingClasses}
                >
                  {loadingClasses && <option>Loading classes...</option>}
                  {!loadingClasses && classes.length === 0 && <option>No classes found</option>}
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.course_code})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {loadingStudents ? (
          <DashboardContentLoader text="Loading student list..." />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* At-Risk Banner for Professors */}
            {role !== 'admin' && filteredStudents.filter(s => s.is_at_risk).length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <h3 className="text-red-400 font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" /> At-Risk Students
                </h3>
                <div className="flex flex-wrap gap-2">
                  {filteredStudents.filter(s => s.is_at_risk).map(s => (
                    <span key={s.id} className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                      {s.name} ({s.accuracy}% acc / {s.progress}% comp)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                      {role === 'admin' ? (
                        <>
                          <th className="px-6 py-5 font-semibold">Name</th>
                          <th className="px-6 py-5 font-semibold">Confidence</th>
                          <th className="px-6 py-5 font-semibold">Readiness</th>
                          <th className="px-6 py-5 font-semibold text-right">Last Active</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-5 font-medium">Student Name</th>
                          <th className="px-6 py-5 font-medium">Progress</th>
                          <th className="px-6 py-5 font-medium">Accuracy</th>
                          <th className="px-6 py-5 font-medium border-0">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No students found.
                        </td>
                      </tr>
                    )}
                    {role === 'admin' ? (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-5 font-semibold text-white">{student.name}</td>
                          <td className="px-6 py-5">
                            <span className={`font-bold ${
                              student.confidence >= 75 ? "text-emerald-400" : student.confidence >= 60 ? "text-indigo-400" : "text-rose-400"
                            }`}>
                              {student.confidence}%
                            </span>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-300">
                            {student.readiness}%
                          </td>
                          <td className="px-6 py-5 text-slate-400 text-right">
                            {student.last_active}
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-5">
                            <div className="font-medium text-white">{student.name}</div>
                            <div className="text-xs text-slate-400 mt-1">{student.topics_completed} topics completed</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${student.progress}%` }} />
                              </div>
                              <span className="text-sm font-medium text-slate-300">{student.progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-sm font-semibold ${
                              student.accuracy >= 80 ? 'text-emerald-400' :
                              student.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {student.accuracy}%
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              student.status === 'Green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              student.status === 'Yellow' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {student.status === 'Green' ? 'On Track' : student.status === 'Yellow' ? 'Needs Review' : 'At Risk'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
