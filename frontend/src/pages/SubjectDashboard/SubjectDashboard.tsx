'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, CheckCircle2, Clock, PlayCircle, Trophy, Target, ArrowLeft, 
  FileText, ExternalLink, AlertTriangle, Award, Calendar, Percent
} from 'lucide-react';
import Loader from '@/components/Loader';

interface TopicData {
  title: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Mastered';
  accuracy: number;
  attempts: number;
  last_studied: string | null;
  difficulty?: string;
  estimated_hours?: number;
  is_next_unfinished?: boolean;
}

interface SubjectProgress {
  completed: number;
  total: number;
  accuracy: number;
}

interface ResourceData {
  title: string;
  type: string;
  file: string;
}

interface SubjectDashboardProps {
  subjectName: string;
}

export default function SubjectDashboard({ subjectName }: SubjectDashboardProps) {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topics' | 'analytics' | 'resources'>('topics');
  const router = useRouter();

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        const studentId = localStorage.getItem("user_id");
        if (!studentId) return;
        const res = await fetch(`/api/courses/subject/${encodeURIComponent(subjectName)}?student_id=${studentId}`);
        const data = await res.json();
        if (data.success) {
          setTopics(data.topics);
          setProgress(data.progress);
          setResources(data.resources || []);
        }
      } catch (err) {
        console.error("Failed to load subject data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjectData();
  }, [subjectName]);

  const handleTopicClick = (topicName: string) => {
    router.push(`/learning?topic=${encodeURIComponent(topicName)}&subject=${encodeURIComponent(subjectName)}&source=courses`);
  };

  const openResource = (file: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
    const cacheBuster = new Date().getTime();
    window.open(`${backendUrl}/uploads/${file}?t=${cacheBuster}`, '_blank');
  };

  if (loading) return <Loader fullScreen text="Loading Subject Data..." />;

  const progressPercentage = progress && progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mastered': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'In Progress': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-white/5 border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mastered': return <Trophy className="w-4 h-4" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'In Progress': return <Clock className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  // Analytics tab calculations
  const weakTopics = topics.filter(t => t.attempts > 0 && t.accuracy < 70);
  const remainingTopics = topics.filter(t => t.status !== 'Completed' && t.status !== 'Mastered');

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Back Button */}
      <button 
        onClick={() => router.push('/courses')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{subjectName}</h1>
            </div>
            <p className="text-slate-400 ml-13">University Curriculum Module</p>
          </div>

          {progress && (
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{progressPercentage}%</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-400">{progress.completed} <span className="text-lg text-slate-500">/ {progress.total}</span></div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-rose-400">{progress.total - progress.completed}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{progress.accuracy}%</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Avg Accuracy</div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-white/10 mt-8 overflow-hidden relative z-10">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Modern Tabs Bar */}
      <div className="flex border-b border-white/10 gap-8">
        {(['topics', 'analytics', 'resources'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold uppercase tracking-wider transition-colors relative ${
              activeTab === tab ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'topics' ? 'Topics' : tab === 'analytics' ? 'Analytics' : 'Resources'}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <div className="min-h-[300px]">
        {/* 1. Topics Tab */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              Module Topics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic, i) => (
                <div 
                  key={i}
                  onClick={() => handleTopicClick(topic.title)}
                  className={`group bg-white/5 border rounded-2xl p-5 hover:bg-white/10 transition cursor-pointer relative overflow-hidden flex flex-col h-full ${topic.is_next_unfinished ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {topic.is_next_unfinished && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 mb-2">
                          <Target className="w-3 h-3" /> Continue Learning
                        </div>
                      )}
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-2 pr-4">{topic.title}</h3>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase shrink-0 ${getStatusColor(topic.status)}`}>
                      {getStatusIcon(topic.status)}
                      {topic.status}
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Difficulty</div>
                      <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm inline-block ${topic.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10' : topic.difficulty === 'Medium' ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                        {topic.difficulty || 'Medium'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Accuracy</div>
                      <div className={`text-sm font-bold ${topic.accuracy >= 70 ? 'text-emerald-400' : topic.accuracy > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {topic.accuracy > 0 ? `${topic.accuracy}%` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Attempts</div>
                      <div className="text-sm font-bold text-white">{topic.attempts > 0 ? topic.attempts : '-'}</div>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="absolute right-4 bottom-4 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                      <PlayCircle className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Subject Analytics
            </h2>

            {/* Top row metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Progress</span>
                  <Percent className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white mt-2">{progressPercentage}%</div>
                <p className="text-xs text-slate-500 mt-1">Syllabus completion</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Avg Accuracy</span>
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-emerald-400 mt-2">{progress?.accuracy || 0}%</div>
                <p className="text-xs text-slate-500 mt-1">Target is 70%+</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Topics Remaining</span>
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white mt-2">{remainingTopics.length}</div>
                <p className="text-xs text-slate-500 mt-1">Out of {topics.length} total</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Weak Topics</span>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-bold text-rose-400 mt-2">{weakTopics.length}</div>
                <p className="text-xs text-slate-500 mt-1">Need focus & practice</p>
              </div>
            </div>

            {/* Bottom details grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Weak Topics detail list */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Weak Topics (Below 70%)
                </h3>
                {weakTopics.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">Great! No weak topics detected for this subject.</p>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {weakTopics.map((topic, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        <span className="text-sm text-white font-medium truncate pr-4">{topic.title}</span>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-rose-400 font-semibold">{topic.accuracy}% accuracy</span>
                          <span className="text-[10px] text-slate-500 block">{topic.attempts} attempts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topics remaining list */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Remaining Modules to Study
                </h3>
                {remainingTopics.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">Congratulations! You have completed all topics for this subject.</p>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {remainingTopics.map((topic, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleTopicClick(topic.title)}
                        className="flex justify-between items-center p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-xl cursor-pointer transition"
                      >
                        <span className="text-sm text-slate-200 font-medium truncate pr-4">{topic.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-0.5 bg-white/5 border border-white/10 rounded">
                          {topic.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Semester Resources
              </h2>
              <span className="text-xs text-slate-500">Provided by Course Instructors</span>
            </div>

            {resources.length === 0 ? (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Resources Available</h3>
                <p className="text-sm text-slate-400 mt-1">Instructors have not uploaded resources for this subject yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map((res, i) => (
                  <div 
                    key={i}
                    onClick={() => openResource(res.file)}
                    className="group bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-white/10 transition rounded-2xl p-5 flex items-center gap-4 cursor-pointer relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition truncate">{res.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase border border-indigo-500/30">
                          {res.type}
                        </span>
                        <span className="text-xs text-slate-500">Static Document</span>
                      </div>
                    </div>

                    <div className="absolute right-4 text-slate-500 group-hover:text-white transition">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
