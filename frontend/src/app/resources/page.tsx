"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FileText, ChevronDown } from 'lucide-react';
import ResourcesTab from '@/components/classroom/ResourcesTab';

export default function ResourcesPage() {
  const { role } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 pl-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-amber-500" /> 
              Global Resource Library
            </h1>
            <p className="text-slate-400">Manage syllabus, notes, and materials across your classes.</p>
          </div>
          
          {/* Class Selector Dropdown */}
          <div className="relative w-64">
            <select 
              value={activeClassId || ''} 
              onChange={(e) => setActiveClassId(Number(e.target.value))}
              className="w-full appearance-none bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
        </div>

        {activeClassId && (
          <div className="animate-in fade-in duration-500">
            <ResourcesTab 
              classId={activeClassId} 
              role="professor" 
              userId={Number(localStorage.getItem('user_id') || '2')} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
