'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, BarChart3, Settings, 
  FileText, Download, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Activity, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { useSearchParams } from 'next/navigation';

// Static Mock Data for Resources removed to use dynamic ResourcesTab

interface ClassRecord {
  id: number;
  name: string;
  code: string;
  course_code: string;
  students: number;
}

interface TopicMetric {
  name: string;
  score: number;
}

interface ProfessorMetrics {
  studentCount: number;
  activeStudents: number;
  inactiveStudents: number;
  averageAccuracy: number;
  averageConfidence: number;
  averageExposure: number;
  completionRate: number;
  weakTopics: TopicMetric[];
  strongTopics: TopicMetric[];
  alerts: string[];
}

interface StudentRecord {
  id: string;
  name: string;
  progress: number;
  accuracy: number;
  confidence: number;
  exposure: number;
  status: string; // Red, Yellow, Green
  topics_completed: number;
  is_at_risk: boolean;
  streak: number;
  last_practiced_at: string | null;
  recent_quiz: { topic: string; score: number } | null;
}

interface TopicAnalytics {
  name: string;
  accuracy: number;
  completion: number;
  mastered: number;
  completed: number;
  in_progress: number;
  not_started: number;
}

interface UnitAnalytics {
  name: string;
  accuracy: number;
  completion: number;
  health: string; // Red, Yellow, Green
}

interface ActivityFeedItem {
  id: number;
  text: string;
  time: string;
}

import { Suspense } from 'react';

function ProfessorDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') as any;

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'resources'>(
    ['overview', 'students', 'resources'].includes(tabParam) ? tabParam : 'overview'
  );

  useEffect(() => {
    if (tabParam && ['overview', 'students', 'resources'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [metrics, setMetrics] = useState<ProfessorMetrics | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [topicAnalytics, setTopicAnalytics] = useState<TopicAnalytics[]>([]);
  const [unitAnalytics, setUnitAnalytics] = useState<UnitAnalytics[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);


  // Fetch Classes
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

  // Fetch Analytics for active class
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!activeClassId) return;
      setLoadingAnalytics(true);
      try {
        const res = await fetch(`/api/professor/class/${activeClassId}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setStudents(data.students);
          setTopicAnalytics(data.topicAnalytics);
          setUnitAnalytics(data.unitAnalytics);
          setActivityFeed(data.activityFeed);
        }
      } catch (e) {
        console.error("Failed to fetch professor class analytics", e);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, [activeClassId]);

  const currentClass = classes.find(c => c.id === activeClassId);

  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("");
  useEffect(() => {
    setUserName(localStorage.getItem("user_name") || "Professor");
    const role = localStorage.getItem("role") || "professor";
    setUserRole(role.charAt(0).toUpperCase() + role.slice(1));
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      {/* Professor Sidebar */}
      <div className="w-64 border-r border-white/10 bg-[#080d19] p-6 hidden md:block shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-sm">{userName}</h2>
            <p className="text-xs text-slate-400">{userRole}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Assigned Classes</h3>
          {loadingClasses ? (
             <div className="flex items-center justify-center p-4">
               <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
             </div>
          ) : (
            <div className="space-y-1">
              {classes.length === 0 && (
                <p className="text-xs text-slate-400 px-3">No classes assigned.</p>
              )}
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveClassId(c.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeClassId === c.id 
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{c.name} ({c.course_code})</span>
                  </div>
                  {activeClassId === c.id && <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto purple-scrollbar relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Class View</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {currentClass?.name || 'Select a Class'}
            </h1>
          </div>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 w-fit">
            <Settings className="w-4 h-4" /> Manage Class
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 mb-6 pb-2">
          {[
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'students', icon: Users, label: 'Students' },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loadingAnalytics && activeClassId ? (
          <div className="flex items-center justify-center p-24">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          </div>
        ) : !activeClassId ? (
          <div className="text-center p-24 text-slate-400">
            Select a class from the sidebar to view analytics.
          </div>
        ) : (
          <>
            {/* Tab Content: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Alerts Section */}
                {metrics?.alerts && metrics.alerts.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                      <AlertTriangle className="w-5 h-5" /> Action Required
                    </div>
                    <ul className="list-disc list-inside text-sm text-amber-200/80 space-y-1">
                      {metrics.alerts.map((alert, idx) => (
                        <li key={idx}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{metrics?.studentCount ?? 0}</h3>
                    <p className="text-sm text-slate-400">Total Students</p>
                    <div className="mt-2 text-xs text-emerald-400">{metrics?.activeStudents ?? 0} Active • {metrics?.inactiveStudents ?? 0} Inactive</div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10">
                        <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{metrics?.averageAccuracy ?? 0}%</h3>
                    <p className="text-sm text-slate-400">Class Avg Accuracy</p>
                  </div>
                  
                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{metrics?.completionRate ?? 0}%</h3>
                    <p className="text-sm text-slate-400">Avg Completion</p>
                  </div>

                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-amber-500/10">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{metrics?.weakTopics?.length ?? 0}</h3>
                    <p className="text-sm text-slate-400">Weak Topics</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weak & Strong Topics */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                      <h2 className="text-lg font-semibold mb-4 text-amber-400">Class Weakest Topics (&lt;70%)</h2>
                      <div className="space-y-4">
                        {!metrics?.weakTopics?.length && (
                          <p className="text-sm text-slate-400">No weak topics detected yet!</p>
                        )}
                        {metrics?.weakTopics?.map((topic, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-full flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-200">{topic.name}</span>
                                <span className="text-amber-400">{topic.score}% Avg</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                                  style={{ width: `${topic.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                      <h2 className="text-lg font-semibold mb-4 text-emerald-400">Class Strongest Topics (&gt;85%)</h2>
                      <div className="space-y-4">
                        {!metrics?.strongTopics?.length && (
                          <p className="text-sm text-slate-400">No strong topics detected yet.</p>
                        )}
                        {metrics?.strongTopics?.map((topic, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-full flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-200">{topic.name}</span>
                                <span className="text-emerald-400">{topic.score}% Avg</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                                  style={{ width: `${topic.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl h-full max-h-[500px] overflow-y-auto purple-scrollbar">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" /> Recent Activity Feed
                    </h2>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                      {activityFeed.length === 0 && (
                        <p className="text-sm text-slate-400 text-center relative z-10">No recent activity.</p>
                      )}
                      {activityFeed.map((item) => (
                        <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-3 h-3 rounded-full border border-indigo-500 bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-white/5 bg-slate-950/50 hover:bg-slate-900/80 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <time className="text-[10px] font-medium text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                            </div>
                            <p className="text-xs text-slate-300 leading-snug">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Tab Content: Students */}
            {activeTab === 'students' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl overflow-x-auto">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Student Roster
                  </h2>
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-sm">
                        <th className="pb-3 px-4 font-semibold">Student</th>
                        <th className="pb-3 px-4 font-semibold">Status</th>
                        <th className="pb-3 px-4 font-semibold">Accuracy</th>
                        <th className="pb-3 px-4 font-semibold">Confidence</th>
                        <th className="pb-3 px-4 font-semibold">Exposure</th>
                        <th className="pb-3 px-4 font-semibold">Progress</th>
                        <th className="pb-3 px-4 font-semibold">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {students.map((s) => (
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-medium text-white">{s.name}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${s.status === 'Green' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'Yellow' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-emerald-400 font-medium">{s.accuracy}%</td>
                          <td className="py-4 px-4 text-indigo-400 font-medium">{s.confidence}%</td>
                          <td className="py-4 px-4 text-teal-400 font-medium">{s.exposure}%</td>
                          <td className="py-4 px-4 text-white font-medium">{s.progress}%</td>
                          <td className="py-4 px-4 text-slate-400 text-xs">
                            {s.last_practiced_at ? new Date(s.last_practiced_at).toLocaleString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">No students enrolled in this class.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfessorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <ProfessorDashboardContent />
    </Suspense>
  );
}
