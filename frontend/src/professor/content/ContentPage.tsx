"use client";

import React, { useState } from "react";
import { 
  FileText, Search, Upload, Sparkles, BookOpen, Clock, 
  TrendingUp, AlertTriangle, PlusCircle, CheckCircle, ChevronDown
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";

interface MaterialItem {
  id: string;
  title: string;
  type: string;
  pages: number;
  uploadedAt: string;
  chapter?: string;
  badge?: string;
  tags: string[];
  insight: string;
  button1: string;
  button2: string;
  button3: string;
}

export default function ContentPage() {
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeClass, setActiveClass] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const overviewCards = [
    {
      label: "Total Materials",
      value: "24",
      subtitle: "Across 3 Subjects",
      icon: FileText,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "AI Processed",
      value: "87%",
      subtitle: "21 of 24 materials processed",
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Quizzes Generated",
      value: "38",
      subtitle: "+6 this week",
      icon: CheckCircle,
      gradient: "from-indigo-600 to-purple-600",
    },
    {
      label: "Weak Topic Resources",
      value: "3",
      subtitle: "Wave Optics, Thermodynamics, Calculus",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
    },
  ];

  const aiActions = [
    { title: "Summarize Chapter", desc: "Extract key concepts and generate summaries", badge: "SUMMARY", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
    { title: "Generate Quiz", desc: "Auto-generate questions for assessments", badge: "ASSESSMENT", color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
    { title: "Create Flashcards", desc: "AI-powered flashcards for smart revision", badge: "FLASHCARDS", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
    { title: "Simplify Topic", desc: "Break down complex topics into simple terms", badge: "EXPLAIN", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10" },
    { title: "Generate Revision Notes", desc: "Concise review summaries for students", badge: "REVISION", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
    { title: "Create Practice Set", desc: "Structured problem sets matching weak topics", badge: "PRACTICE", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10" },
  ];

  const materials: MaterialItem[] = [
    {
      id: "1",
      title: "Thermodynamics Ch.5",
      type: "PDF",
      pages: 24,
      uploadedAt: "3 days ago",
      chapter: "Chapter 5",
      tags: ["Summary", "Topics Extracted", "Quiz Generated", "Weak Topic"],
      insight: "14 students struggling — Options: simplified revision notes",
      button1: "Open",
      button2: "Simplify",
      button3: "Quiz",
    },
    {
      id: "2",
      title: "Wave Optics — Revision Notes",
      type: "PDF",
      pages: 10,
      uploadedAt: "1 week ago",
      tags: ["Summary", "Topics Extracted", "Weak Topic", "Low Score"],
      insight: "Class avg 52% — Option: visual explanation cards",
      button1: "Open",
      button2: "Simplify",
      button3: "Quiz",
    },
    {
      id: "3",
      title: "Organic Chemistry Lab Manual",
      type: "PDF",
      pages: 45,
      uploadedAt: "2 days ago",
      tags: ["Summary", "Topics Extracted", "Quiz Generated", "Flashcards"],
      insight: "Well understood — Ready for advanced lab questions",
      button1: "Open",
      button2: "Summarize",
      button3: "Quiz",
    },
    {
      id: "4",
      title: "Calculus — Integration Methods",
      type: "PDF",
      pages: 32,
      uploadedAt: "today",
      badge: "Processing...",
      tags: ["Weak Topic"],
      insight: "AI processing in progress — info will render shortly",
      button1: "Open",
      button2: "Summarize",
      button3: "Quiz",
    },
    {
      id: "5",
      title: "Physics Formula Reference Sheet",
      type: "PDF",
      pages: 8,
      uploadedAt: "3 weeks ago",
      tags: ["Summary", "Flashcards", "Quiz Generated"],
      insight: "High usage by students — Create topic-wise practice sets",
      button1: "Open",
      button2: "Summarize",
      button3: "Quiz",
    },
    {
      id: "6",
      title: "Probability & Statistics",
      type: "DOCX",
      pages: 22,
      uploadedAt: "5 days ago",
      tags: ["Summary", "Topics Extracted", "Needs Quiz"],
      insight: "No quiz generated yet — Create assessment for this chapter",
      button1: "Open",
      button2: "Summarize",
      button3: "Quiz",
    },
  ];

  const recommendations = [
    { type: "CONTENT GAP", title: "Generate Simplified Notes — Wave Optics", desc: "14 students below threshold • Custom explanation recommended", btn: "Generate Now", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { type: "MISSING QUIZ", title: "Create Revision Quiz — Calculus Integration", desc: "No assessments created for this chapter yet", btn: "Create Quiz", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { type: "ENHANCEMENT", title: "Add Visual Examples — Thermodynamics Ch.5", desc: "Complex diagrams would improve conceptual retention", btn: "Generate Visuals", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { type: "FLASHCARDS", title: "Create Flashcard Set — Organic Chemistry", desc: "High prep-grade potential for this student group", btn: "Create Flashcards", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Content</h1>
            <p className="text-[10px] text-slate-400">Manage and transform teaching materials with AI</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ask across all materials..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 w-44"
              />
            </div>

            {/* Upload Material */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/5 transition">
              <Upload className="w-3.5 h-3.5 text-slate-300" />
              <span>Upload Material</span>
            </button>

            {/* Generate Content */}
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition">
              <PlusCircle className="w-3.5 h-3.5 text-white" />
              <span>Generate Content</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl hover:border-white/10 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-3xl font-extrabold text-white">{card.value}</span>
                      <p className="text-xs font-bold text-slate-300 mt-1">{card.label}</p>
                      <p className="text-[9px] text-slate-400/80 mt-0.5">{card.subtitle}</p>
                    </div>
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Content Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Content Actions</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Powered by GPT-4 Turbo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiActions.map((act, idx) => (
                <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/20 p-4 flex flex-col justify-between hover:border-blue-500/20 hover:bg-slate-900/30 transition cursor-pointer min-h-[110px]">
                  <div>
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-white">{act.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold tracking-wider border ${act.color}`}>
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-snug">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Materials Library */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Materials Library</h2>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  {materials.length} Files
                </span>
              </div>
            </div>

            {/* Grid of Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map(mat => (
                <div key={mat.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[220px] backdrop-blur-sm group hover:border-blue-500/30 hover:bg-slate-900/60 transition duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <FileText className="w-4.5 h-4.5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{mat.title}</h4>
                          <p className="text-[9px] text-slate-400 font-medium">
                            {mat.type} • {mat.pages} pages • Uploaded {mat.uploadedAt}
                          </p>
                        </div>
                      </div>
                      {mat.badge && (
                        <span className="px-1.5 py-0.5 text-[7px] font-extrabold tracking-wider bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md animate-pulse">
                          {mat.badge}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {mat.tags.map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 text-[8px] font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Insight note */}
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[9px] flex items-center gap-2 text-slate-300 leading-snug">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <p>{mat.insight}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                    <button className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition shadow shadow-blue-500/10">
                      {mat.button1}
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {mat.button2}
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition">
                      {mat.button3}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Recommendations</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Based on Content Activity
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/40 p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition hover:border-white/10">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${rec.color}`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">{rec.type}</span>
                      <h4 className="text-[11px] font-bold text-white mt-1 leading-snug">{rec.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{rec.desc}</p>
                    </div>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition self-end md:self-center shrink-0">
                    {rec.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Filter & Organize Section */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Filter & Organize</h3>
            <div className="space-y-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 block">Subject</span>
                {["All", "Physics", "Chemistry", "Mathematics"].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubject(sub)}
                    className={`px-3 py-1 rounded-lg border transition ${
                      activeSubject === sub ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 block">Class</span>
                {["All", "Grade 11", "Grade 12"].map(cls => (
                  <button
                    key={cls}
                    onClick={() => setActiveClass(cls)}
                    className={`px-3 py-1 rounded-lg border transition ${
                      activeClass === cls ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 block">Type</span>
                {["All", "PDF", "Docs", "Slides"].map(tp => (
                  <button
                    key={tp}
                    onClick={() => setActiveType(tp)}
                    className={`px-3 py-1 rounded-lg border transition ${
                      activeType === tp ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 block">Status</span>
                {["All", "Processed", "Pending", "Weak Topic"].map(st => (
                  <button
                    key={st}
                    onClick={() => setActiveStatus(st)}
                    className={`px-3 py-1 rounded-lg border transition ${
                      activeStatus === st ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
