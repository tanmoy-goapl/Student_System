"use client";

import React, { useState, useEffect } from "react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  TrendingUp, Award, Target, BookOpen, Brain, 
  Activity, CheckCircle2, ChevronRight, BarChart3,
  Loader2, AlertCircle, Zap
} from "lucide-react";

interface AnalyticsData {
  overview: {
    currentStreak: number;
    averageAccuracy: number;
    totalQuizAttempts: number;
    topicsCompleted: number;
    topicsCompletedList: string[];
    masteredTopics: number;
    masteredTopicsList: string[];
    activeRoadmaps: number;
  };
  weeklyActivity: { date: string; attempts: number; accuracy: number }[];
  subjectPerformance: {
    subject: string;
    progress: number;
    completedTopics: number;
    remainingTopics: number;
    totalTopics: number;
    averageAccuracy: number;
  }[];
  roadmapPerformance: {
    roadmapName: string;
    currentWeek: number;
    currentDay: number;
    progress: number;
    remainingTasks: number;
  }[];
  weaknessAnalysis: {
    weak: { topic: string; accuracy: number }[];
    medium: { topic: string; accuracy: number }[];
    strong: { topic: string; accuracy: number }[];
  };
  learningVelocity: {
    topicsCompletedThisWeek: number;
    quizAttemptsThisWeek: number;
    accuracyImprovement: number;
  };
  recommendations: string[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const studentId = localStorage.getItem("user_id");
        if (!studentId) throw new Error("Please log in to view analytics");
        
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/analytics/data?student_id=${studentId}&_t=${timestamp}`, {
          cache: "no-store"
        });
        if (!res.ok) throw new Error("Failed to load analytics data");
        
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p>Crunching your performance data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-red-400 bg-red-500/10 p-8 rounded-2xl border border-red-500/20">
          <AlertCircle size={40} />
          <p className="text-lg font-medium">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  // If the backend returns the old structure (because the user hasn't restarted Docker), show a friendly message
  if (!data.overview) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-orange-400 bg-orange-500/10 p-8 rounded-2xl border border-orange-500/20 text-center max-w-2xl">
          <AlertCircle size={40} />
          <p className="text-lg font-medium">Ghost Process Detected on Port 8001!</p>
          <p className="text-sm text-orange-400/80">
            Even after a Docker rebuild, you are still receiving the old payload. This almost certainly means you have a "ghost" Python/Uvicorn process running in the background on your machine that is stealing port 8001. <br/><br/>
            Because this ghost process is intercepting all traffic on port 8001, your newly built Docker container is likely failing to start in the background!<br/><br/>
            Please run the following commands in your terminal to kill the rogue process, then restart your container:<br/><br/>
            <code className="bg-black/50 p-2 rounded block text-left">
              sudo killall uvicorn<br/>
              sudo killall python<br/>
              docker compose up -d --build backend
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <BarChart3 className="text-blue-400" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance</h1>
          <p className="text-slate-400">Real-time insights powered by your actual performance data.</p>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Activity} label="Current Streak" value={`${data.overview.currentStreak} Days`} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard icon={Target} label="Avg Accuracy" value={`${data.overview.averageAccuracy}%`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={TrendingUp} label="Quiz Attempts" value={data.overview.totalQuizAttempts} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="Topics Completed" value={data.overview.topicsCompleted} color="text-purple-400" bg="bg-purple-500/10" tooltipList={data.overview.topicsCompletedList} />
        <StatCard icon={Award} label="Mastered Topics" value={data.overview.masteredTopics} color="text-yellow-400" bg="bg-yellow-500/10" tooltipList={data.overview.masteredTopicsList} />
        <StatCard icon={BookOpen} label="Active Roadmaps" value={data.overview.activeRoadmaps} color="text-cyan-400" bg="bg-cyan-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Charts & Velocity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* WEEKLY ACTIVITY CHART */}
          <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="text-blue-400" size={20} />
              Weekly Activity
            </h2>
            <div className="h-[300px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weeklyActivity} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line yAxisId="left" type="monotone" dataKey="attempts" name="Quiz Attempts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* SUBJECT PERFORMANCE */}
          <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <BookOpen className="text-purple-400" size={20} />
              Subject Performance
            </h2>
            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 purple-scrollbar">
              {data.subjectPerformance.length > 0 ? (
                data.subjectPerformance.map((subj, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-medium text-white">{subj.subject}</p>
                        <p className="text-xs text-slate-400">
                          {subj.completedTopics} / {subj.totalTopics} Topics Completed • {subj.averageAccuracy}% Avg Accuracy
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{subj.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${subj.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500">No subjects practiced yet.</div>
              )}
            </div>
          </div>

          {/* ROADMAP PERFORMANCE */}
          {data.roadmapPerformance.length > 0 && (
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4">Active Roadmaps</h2>
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 purple-scrollbar">
                {data.roadmapPerformance.map((rm, idx) => (
                  <div key={idx} className="bg-[#0f172a]/50 p-4 rounded-xl border border-white/5 space-y-3">
                    <p className="text-sm font-semibold text-white">{rm.roadmapName}</p>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Week {rm.currentWeek} • Day {rm.currentDay}</span>
                      <span>{rm.remainingTasks} Tasks Left</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${rm.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Velocity, Weakness, AI Recommendations */}
        <div className="space-y-8">
          
          {/* LEARNING VELOCITY */}
          <div className="bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a] border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={100} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
              <Zap className="text-yellow-400" size={20} />
              Learning Velocity
            </h2>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-sm text-slate-300">Topics Completed (This Week)</span>
                <span className="font-bold text-white text-lg">{data.learningVelocity.topicsCompletedThisWeek}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-sm text-slate-300">Quiz Attempts (This Week)</span>
                <span className="font-bold text-white text-lg">{data.learningVelocity.quizAttemptsThisWeek}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-sm text-slate-300">Accuracy vs Last Week</span>
                <span className={`font-bold text-lg ${data.learningVelocity.accuracyImprovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.learningVelocity.accuracyImprovement >= 0 ? '+' : ''}{data.learningVelocity.accuracyImprovement}%
                </span>
              </div>
            </div>
          </div>

          {/* AI RECOMMENDATIONS */}
          <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="text-cyan-400" size={20} />
              Mentor AI Recommendations
            </h2>
            <div className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-3 bg-[#0f172a]/50 p-4 rounded-xl border border-white/5">
                  <div className="mt-0.5"><ChevronRight className="text-cyan-500" size={16} /></div>
                  <p className="text-sm text-slate-200 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WEAKNESS ANALYSIS */}
          <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Weakness Analysis</h2>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 purple-scrollbar">
              <div>
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Weak (&lt; 50%)</h3>
                <div className="flex flex-wrap gap-2">
                  {data.weaknessAnalysis.weak.length > 0 ? data.weaknessAnalysis.weak.map((w, i) => (
                    <span key={i} className="text-xs bg-red-500/10 text-red-300 px-2 py-1 rounded border border-red-500/20">
                      {w.topic} ({w.accuracy}%)
                    </span>
                  )) : <span className="text-xs text-slate-500">None detected</span>}
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Medium (50 - 75%)</h3>
                <div className="flex flex-wrap gap-2">
                  {data.weaknessAnalysis.medium.length > 0 ? data.weaknessAnalysis.medium.map((m, i) => (
                    <span key={i} className="text-xs bg-orange-500/10 text-orange-300 px-2 py-1 rounded border border-orange-500/20">
                      {m.topic} ({m.accuracy}%)
                    </span>
                  )) : <span className="text-xs text-slate-500">None detected</span>}
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strong (&gt; 75%)</h3>
                <div className="flex flex-wrap gap-2">
                  {data.weaknessAnalysis.strong.length > 0 ? data.weaknessAnalysis.strong.slice(0, 8).map((s, i) => (
                    <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                      {s.topic} ({s.accuracy}%)
                    </span>
                  )) : <span className="text-xs text-slate-500">None detected</span>}
                  {data.weaknessAnalysis.strong.length > 8 && (
                     <span className="text-xs text-slate-500 px-2 py-1">+{data.weaknessAnalysis.strong.length - 8} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, tooltipList }: { icon: any, label: string, value: string | number, color: string, bg: string, tooltipList?: string[] }) {
  return (
    <div className="group relative bg-[#1e293b]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 backdrop-blur-sm transition-transform hover:scale-105 hover:z-50 cursor-default">
      <div className={`p-3 rounded-xl ${bg}`}>
        <Icon className={color} size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
      
      {tooltipList && tooltipList.length > 0 && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] bg-slate-900 border border-white/10 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl pointer-events-none">
          <p className="text-xs font-semibold text-slate-300 mb-2 border-b border-white/5 pb-1 uppercase tracking-wider">{label}</p>
          <ul className="text-xs text-slate-400 space-y-1 text-left list-disc list-inside">
            {tooltipList.map((item, i) => (
              <li key={i} className="truncate">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
