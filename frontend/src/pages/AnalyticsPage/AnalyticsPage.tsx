'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Clock, Target, BookOpen, Compass, 
  CheckCircle2, AlertTriangle, XCircle, Brain, LayoutDashboard
} from 'lucide-react';
import { DashboardContentLoader } from '@/components/DashboardLoading';

interface OverallStats {
  studyStreak: number;
  learningHours: number;
  quizAccuracy: number;
  topicsCovered: number;
  activeRoadmaps: number;
}

interface CourseStat {
  subject: string;
  topicsCovered: number;
  accuracy: number;
}

interface RoadmapStat {
  id: number;
  title: string;
  progress: number;
  week: number;
  status: string;
}

interface WeaknessData {
  distribution: {
    strong: number;
    medium: number;
    weak: number;
  };
  critical: Array<{
    topic: string;
    subject: string;
    accuracy: number;
  }>;
}

interface WeeklyActivity {
  day: string;
  date: string;
  attempts: number;
  questions: number;
}

interface AnalyticsData {
  overall: OverallStats;
  courses: CourseStat[];
  roadmaps: RoadmapStat[];
  weaknesses: WeaknessData;
  weeklyActivity: WeeklyActivity[];
}

const StatCard = ({ title, value, icon: Icon, color, suffix = "" }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-500/20 text-${color}-400`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h3 className="text-sm text-slate-400 font-medium">{title}</h3>
      <div className="text-2xl font-bold text-white mt-1">
        {value}{suffix}
      </div>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const studentId = localStorage.getItem("user_id") || "1";
        const res = await fetch(`/api/analytics/data/${studentId}`);
        const text = await res.text();
        try {
          const result = JSON.parse(text);
          if (result.success) {
            setData(result.data);
          } else {
            setErrorMsg(result.message || "Result success was false");
          }
        } catch (e) {
          setErrorMsg(`Failed to parse JSON: ${text.substring(0, 100)}`);
        }
      } catch (err: any) {
        console.error("Failed to load analytics:", err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <DashboardContentLoader text="Loading Analytics..." />;
  if (errorMsg) return <div className="text-red-400 text-center mt-20">Error: {errorMsg}</div>;
  if (!data) return <div className="text-white text-center mt-20">Failed to load data</div>;

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-slate-400">Track your progress, identify weaknesses, and adapt your roadmap.</p>
        </div>
      </div>

      {/* 1. Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Study Streak" value={data.overall.studyStreak} suffix=" Days" icon={TrendingUp} color="orange" />
        <StatCard title="Learning Time" value={data.overall.learningHours} suffix="h" icon={Clock} color="blue" />
        <StatCard title="Overall Accuracy" value={data.overall.quizAccuracy} suffix="%" icon={Target} color="emerald" />
        <StatCard title="Topics Mastered" value={data.overall.topicsCovered} icon={BookOpen} color="purple" />
        <StatCard title="Active Roadmaps" value={data.overall.activeRoadmaps} icon={Compass} color="cyan" />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 5. Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Weekly Activity (Questions Attempted)
            </h2>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="day" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="questions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorQuestions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Weakness Analysis */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <Brain className="w-4 h-4 text-purple-400" />
            Critical Weaknesses
          </h2>
          
          <div className="flex-1 space-y-4">
            {data.weaknesses.critical.length === 0 ? (
              <div className="text-center text-slate-400 py-10">No critical weaknesses detected!</div>
            ) : (
              data.weaknesses.critical.map((topic, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{topic.topic}</h4>
                    <p className="text-[11px] text-slate-400">{topic.subject}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">{topic.accuracy}%</div>
                    <div className="text-[10px] uppercase text-red-500/80 tracking-wider">Accuracy</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Course Analytics */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Course Progress
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto hide-scrollbar">
            {data.courses.length === 0 ? (
              <div className="text-center text-slate-400 py-4">No course data yet.</div>
            ) : (
              data.courses.map((course, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-white">{course.subject}</span>
                    <span className="text-xs text-slate-400">{course.topicsCovered} Topics • {course.accuracy}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                      style={{ width: `${course.accuracy}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Personal Roadmap Analytics */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <Compass className="w-4 h-4 text-cyan-400" />
            Roadmap Tracking
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto hide-scrollbar">
            {data.roadmaps.length === 0 ? (
              <div className="text-center text-slate-400 py-4">No active roadmaps.</div>
            ) : (
              data.roadmaps.map((rm, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="truncate pr-4">
                      <span className="text-sm font-medium text-white truncate block">{rm.title}</span>
                      <span className="text-[11px] text-slate-400">Week {rm.week} • {rm.status}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 shrink-0">{rm.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" 
                      style={{ width: `${rm.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
