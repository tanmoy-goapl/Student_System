"use client";

import React, { useState } from "react";
import { 
  ClipboardCheck, Search, PlusCircle, Sparkles, AlertTriangle, 
  Clock, TrendingUp, Filter, MoreVertical, FileText
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";

interface AssessmentItem {
  id: string;
  title: string;
  subject: string;
  type: string;
  status: string;
  dueDate: string;
  submissions: number;
  totalStudents: number;
  averageScore?: number;
}

export default function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState("Active");
  const [searchQuery, setSearchQuery] = useState("");

  const overviewCards = [
    {
      label: "Active Assessments",
      value: "8",
      subtitle: "Across 4 Classes",
      icon: ClipboardCheck,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "Needs Grading",
      value: "42",
      subtitle: "Submissions pending review",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "AI Auto-Graded",
      value: "85%",
      subtitle: "Time saved this week",
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Low Performance",
      value: "2",
      subtitle: "Assessments below 60% avg",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
    },
  ];

  const mockAssessments: AssessmentItem[] = [
    {
      id: "A-101",
      title: "Midterm Examination",
      subject: "Operating Systems",
      type: "Exam",
      status: "Active",
      dueDate: "Oct 25, 2026",
      submissions: 45,
      totalStudents: 120,
    },
    {
      id: "A-102",
      title: "CPU Scheduling Quiz",
      subject: "Operating Systems",
      type: "Quiz",
      status: "Needs Grading",
      dueDate: "Oct 18, 2026",
      submissions: 118,
      totalStudents: 120,
      averageScore: 78.5,
    },
    {
      id: "A-103",
      title: "Sorting Algorithms Assignment",
      subject: "Data Structures",
      type: "Assignment",
      status: "Completed",
      dueDate: "Oct 10, 2026",
      submissions: 85,
      totalStudents: 85,
      averageScore: 84.2,
    },
    {
      id: "A-104",
      title: "Memory Management Concepts",
      subject: "Operating Systems",
      type: "Quiz",
      status: "Draft",
      dueDate: "Nov 02, 2026",
      submissions: 0,
      totalStudents: 120,
    },
  ];

  const filteredAssessments = mockAssessments.filter(a => {
    if (activeTab === "Active" && (a.status === "Completed" || a.status === "Draft")) return false;
    if (activeTab === "Past" && a.status !== "Completed") return false;
    if (activeTab === "Drafts" && a.status !== "Draft") return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#020817] text-slate-300 font-sans overflow-hidden selection:bg-blue-500/30">
      <ProfessorSidebar />

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="flex-none h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#020817]/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ClipboardCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Assessments</h1>
              <p className="text-sm text-slate-400 font-medium">Manage quizzes, exams, and assignments</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl border border-white/10 transition-colors text-sm font-medium">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Auto-Generate with AI
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 text-sm border border-blue-400/20">
              <PlusCircle className="w-4 h-4" />
              Create Assessment
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {overviewCards.map((card, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
                    <card.icon className="w-24 h-24" />
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-4 relative z-10`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-slate-400 text-sm font-medium mb-1">{card.label}</h3>
                    <div className="text-3xl font-bold text-white mb-1 tracking-tight">{card.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{card.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Area */}
            <div className="bg-[#0a0f1e]/80 border border-white/10 rounded-2xl flex flex-col shadow-xl backdrop-blur-sm">
              
              {/* Toolbar */}
              <div className="p-5 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                
                {/* Tabs */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                  {["Active", "Needs Grading", "Past", "Drafts"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab 
                          ? "bg-white/10 text-white shadow-sm" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Filters & Search */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search assessments..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-64"
                    />
                  </div>
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-colors flex items-center gap-2 text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Submissions</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Score</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.length > 0 ? (
                      filteredAssessments.map((assessment) => (
                        <tr key={assessment.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                {assessment.type === "Exam" ? <ClipboardCheck className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                              </div>
                              <div>
                                <h4 className="text-white font-medium text-sm">{assessment.title}</h4>
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{assessment.subject}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                  <span>Due: {assessment.dueDate}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-slate-300 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">{assessment.type}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              {assessment.status === "Active" && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>}
                              {assessment.status === "Needs Grading" && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                              {assessment.status === "Completed" && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                              {assessment.status === "Draft" && <span className="w-2 h-2 rounded-full bg-slate-400"></span>}
                              <span className={`text-sm font-medium
                                ${assessment.status === "Active" ? "text-blue-400" : ""}
                                ${assessment.status === "Needs Grading" ? "text-amber-400" : ""}
                                ${assessment.status === "Completed" ? "text-emerald-400" : ""}
                                ${assessment.status === "Draft" ? "text-slate-400" : ""}
                              `}>{assessment.status}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium">{assessment.submissions} / {assessment.totalStudents}</span>
                                <span className="text-slate-500">{Math.round((assessment.submissions / assessment.totalStudents) * 100)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${assessment.submissions === assessment.totalStudents ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${(assessment.submissions / assessment.totalStudents) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {assessment.averageScore ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${assessment.averageScore >= 80 ? 'text-emerald-400' : assessment.averageScore < 60 ? 'text-rose-400' : 'text-slate-200'}`}>
                                  {assessment.averageScore}%
                                </span>
                                {assessment.averageScore >= 80 && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500 italic">Pending</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-medium text-slate-300">No assessments found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
