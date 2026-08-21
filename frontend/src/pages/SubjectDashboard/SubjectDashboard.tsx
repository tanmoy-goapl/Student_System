'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, CheckCircle2, Clock, PlayCircle, Trophy, Target, ArrowLeft, 
  FileText, ExternalLink, AlertTriangle, Award, Calendar, Percent, Download, Users
} from 'lucide-react';
import { PageLoadingState } from '@/components/DashboardLoading';

interface TopicData {
  title: string;
  status: 'NOT_STARTED' | 'WEAK' | 'LEARNING' | 'STRONG';
  accuracy: number;
  confidence?: number;
  exposure?: number;
  sessions: number;
  questions_attempted: number;
  last_studied: string | null;
  difficulty?: string;
  estimated_hours?: number;
  is_next_unfinished?: boolean;
}

interface SubjectProgress {
  topics_total: number;
  topics_mastered: number;
  topics_strong: number;
  topics_learning: number;
  topics_weak: number;
  topics_not_started: number;
  progress: number;
  exposure?: number;
  accuracy: number;
  confidence?: number;
  subject_health: string;
}

interface ResourceData {
  title: string;
  type: string;
  file: string;
}

interface SubjectDashboardProps {
  subjectName: string;
  classId?: number;
  hideBackButton?: boolean;
  backRoute?: string;
  backText?: string;
  source?: 'courses' | 'personal' | 'classes';
}

export default function SubjectDashboard({ subjectName, classId, hideBackButton, backRoute, backText, source: navigationSource }: SubjectDashboardProps) {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [classResources, setClassResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topics' | 'analytics' | 'resources'>('topics');
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySource = searchParams?.get('source');
  const source = navigationSource || querySource;

  const resolvedBackRoute = backRoute || (source === 'classes' ? '/classes' : '/courses');
  const resolvedBackText = backText || (source === 'classes' ? 'Back to Classes' : 'Back to Dashboard');

  const cleanTopicTitle = (title: string) =>
    title
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*\*/g, '')
      .trim();

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        const studentId = localStorage.getItem("user_id");
        if (!studentId) return;
        const classQuery = classId ? `&class_id=${classId}` : "";
        const res = await fetch(`/api/courses/subject/${encodeURIComponent(subjectName)}?student_id=${studentId}${classQuery}`);
        const data = await res.json();
        if (data.success) {
          setTopics(data.topics);
          setProgress(data.progress);
          setResources(data.resources || []);
          setClassResources(data.class_resources || []);
        }
      } catch (err) {
        console.error("Failed to load subject data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjectData();
  }, [subjectName, classId]);

  const downloadClassResource = (resourceId: number) => {
    const studentId = localStorage.getItem("user_id");
    window.open(`/api/classroom/resource/download/${resourceId}?user_id=${studentId}`, "_blank");
  };

  const handleTopicClick = (topicName: string) => {
    const learningSource = source === 'classes' ? 'classes' : 'courses';
    const classQuery = classId ? `&class_id=${classId}` : "";
    router.push(`/learning?topic=${encodeURIComponent(topicName)}&subject=${encodeURIComponent(subjectName)}&source=${learningSource}${classQuery}`);
  };

  const openResource = (file: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
    const cacheBuster = new Date().getTime();
    window.open(`${backendUrl}/uploads/${file}?t=${cacheBuster}`, '_blank');
  };

  if (loading) return <PageLoadingState text="Loading Subject Data..." />;

  const progressPercentage = progress ? progress.progress : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STRONG': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'LEARNING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'WEAK': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'NOT_STARTED': return 'text-slate-400 bg-white/5 border-white/10';
      default: return 'text-slate-400 bg-white/5 border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'STRONG': return <Trophy className="w-4 h-4" />;
      case 'LEARNING': return <CheckCircle2 className="w-4 h-4" />;
      case 'WEAK': return <AlertTriangle className="w-4 h-4" />;
      case 'NOT_STARTED': return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  // Analytics tab calculations
  const weakTopics = topics.filter(t => t.status === 'WEAK');
  const remainingTopics = topics.filter(t => t.status !== 'STRONG');

  return (
    <div className={`${hideBackButton ? '' : 'min-h-screen p-8'} max-w-5xl mx-auto space-y-8`}>
      {/* Header & Back Button */}
      {!hideBackButton && (
        <button
          onClick={() => router.push(resolvedBackRoute)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> {resolvedBackText}
        </button>
      )}

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
                <div className="text-3xl font-bold text-indigo-400">{progress.topics_mastered} <span className="text-lg text-slate-500">/ {progress.topics_total}</span></div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-rose-400">{progress.topics_total - progress.topics_mastered}</div>
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
            {tab === 'topics' ? 'Learning' : tab === 'analytics' ? 'Analytics' : 'Resources'}
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

            {topics.length === 0 ? (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Curriculum Topics Available</h3>
                <p className="text-sm text-slate-400 mt-1">Your professor has not generated the curriculum for this class yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic, i) => (
                <div 
                  key={i}
                  onClick={() => handleTopicClick(cleanTopicTitle(topic.title))}
                  className={`group bg-white/5 border rounded-2xl p-5 hover:bg-white/10 transition cursor-pointer relative overflow-hidden flex flex-col h-full ${topic.is_next_unfinished ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {topic.is_next_unfinished && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 mb-2">
                          <Target className="w-3 h-3" /> Continue Learning
                        </div>
                      )}
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-2 pr-4">{cleanTopicTitle(topic.title)}</h3>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase shrink-0 ${getStatusColor(topic.status)}`}>
                      {getStatusIcon(topic.status)}
                      {topic.status}
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-5 gap-2 border-t border-white/10 pt-4">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Difficulty</div>
                      <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm inline-block ${topic.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10' : topic.difficulty === 'Medium' ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                        {topic.difficulty || 'Medium'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Accuracy</div>
                      <div className={`text-sm font-bold ${topic.accuracy >= 85 ? 'text-emerald-400' : topic.accuracy >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {topic.accuracy !== undefined ? `${topic.accuracy}%` : '0%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence</div>
                      <div className="text-sm font-bold text-indigo-400">
                        {topic.confidence !== undefined ? `${topic.confidence}%` : '0%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sessions</div>
                      <div className="text-sm font-bold text-white">{topic.sessions !== undefined ? topic.sessions : '0'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Questions</div>
                      <div className="text-sm font-bold text-white">{topic.questions_attempted !== undefined ? topic.questions_attempted : '0'}</div>
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
            )}
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
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
                  <span className="text-sm text-slate-400 font-medium">Exposure</span>
                  <BookOpen className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-3xl font-bold text-teal-400 mt-2">{progress?.exposure || 0}%</div>
                <p className="text-xs text-slate-500 mt-1">Syllabus attempted</p>
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
                  <span className="text-sm text-slate-400 font-medium">Confidence</span>
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-indigo-400 mt-2">{progress?.confidence || 0}%</div>
                <p className="text-xs text-slate-500 mt-1">Reliability score</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Remaining</span>
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white mt-2">{remainingTopics.length}</div>
                <p className="text-xs text-slate-500 mt-1">Out of {topics.length}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-400 font-medium">Weak</span>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-bold text-rose-400 mt-2">{weakTopics.length}</div>
                <p className="text-xs text-slate-500 mt-1">Need practice</p>
              </div>
            </div>

            {/* Bottom details grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Weak Topics detail list */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Weak Topics (Below 50% accuracy)
                </h3>
                {weakTopics.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">Great! No weak topics detected for this subject.</p>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {weakTopics.map((topic, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        <span className="text-sm text-white font-medium truncate pr-4">{cleanTopicTitle(topic.title)}</span>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-rose-400 font-semibold">{topic.accuracy}% accuracy</span>
                          <span className="text-[10px] text-slate-500 block">{topic.sessions} sessions</span>
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
                        onClick={() => handleTopicClick(cleanTopicTitle(topic.title))}
                        className="flex justify-between items-center p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-xl cursor-pointer transition"
                      >
                        <span className="text-sm text-slate-200 font-medium truncate pr-4">{cleanTopicTitle(topic.title)}</span>
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
          <div className="space-y-10">
            {/* Class Resources Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Class Resources
                </h2>
                <span className="text-xs text-slate-500">Shared in enrolled classroom</span>
              </div>

              {classResources.length === 0 ? (
                <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No Resources Available</h3>
                  <p className="text-sm text-slate-400 mt-1">Instructors have not uploaded resources for this class yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classResources.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => downloadClassResource(res.id)}
                      className="group bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-white/10 transition rounded-2xl p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 uppercase">
                            {res.type}
                          </span>
                          <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 transition flex items-center gap-1 font-semibold">
                            <Download size={10} /> DOWNLOAD
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-2 leading-snug mb-3">
                          {res.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{res.uploaded_at ? new Date(res.uploaded_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{res.uploaded_by_name || 'Instructor'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
