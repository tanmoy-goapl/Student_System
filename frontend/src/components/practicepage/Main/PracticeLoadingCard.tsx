import React, { useState, useEffect } from "react";
import { Sparkles, Brain, Lightbulb, CheckCircle2, Zap, BookOpen, Clock } from "lucide-react";

interface PracticeLoadingCardProps {
  topic?: string;
  difficulty?: string;
  isNextBatch?: boolean;
}

const STUDY_TIPS = [
  {
    icon: Lightbulb,
    category: "Cognitive Science",
    tip: "Active Retrieval: Testing yourself on concepts before re-reading notes boosts long-term memory retention by over 50%.",
    tag: "Active Recall",
  },
  {
    icon: Zap,
    category: "Exam Strategy",
    tip: "Process of Elimination: Discarding two implausible options first instantly raises your statistical success rate to 80%+.",
    tag: "Test Taking",
  },
  {
    icon: Brain,
    category: "Learning Hack",
    tip: "Interleaved Practice: Mixing different problem types and difficulties strengthens adaptive problem-solving skills.",
    tag: "Deep Work",
  },
  {
    icon: Clock,
    category: "Time Management",
    tip: "Stem Analysis: Dedicate the first 20 seconds solely to understanding what the question requires before checking options.",
    tag: "Pacing",
  },
  {
    icon: BookOpen,
    category: "Metacognition",
    tip: "Error Priming: Making mistakes during practice sessions actually primes your brain for deeper, lasting comprehension.",
    tag: "Growth Mindset",
  },
];

export default function PracticeLoadingCard({
  topic = "General Subject",
  difficulty = "Medium",
  isNextBatch = false,
}: PracticeLoadingCardProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState(18);

  // Rotate study tips smoothly
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % STUDY_TIPS.length);
    }, 3800);
    return () => clearInterval(tipInterval);
  }, []);

  // Simulate smooth progress steps
  useEffect(() => {
    const step1 = setTimeout(() => {
      setActiveStep(2);
      setProgress(58);
    }, 1600);

    const step2 = setTimeout(() => {
      setActiveStep(3);
      setProgress(88);
    }, 3600);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
    };
  }, []);

  const currentTip = STUDY_TIPS[tipIndex];
  const TipIcon = currentTip.icon;

  return (
    <div className="flex-1 flex items-center justify-center min-h-[520px] p-6">
      <div className="relative w-full max-w-xl">
        {/* Ambient background glows */}
        <div className="absolute -top-12 -left-12 w-60 h-60 bg-violet-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Main Card */}
        <div className="relative bg-[#0D1226]/85 border border-violet-500/25 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl shadow-violet-950/40 overflow-hidden">
          {/* Subtle Top Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse" />

          {/* Central Animated Quantum Icon */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="relative mb-5">
              {/* Outer Pulsing Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 to-cyan-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
              
              {/* Inner Glass Card Core */}
              <div className="relative w-20 h-20 flex items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20 rounded-2xl shadow-xl backdrop-blur-md transition-transform duration-300 hover:scale-105">
                <Brain className="w-10 h-10 text-cyan-400 animate-pulse" />
              </div>
            </div>

            {/* Topic & Difficulty Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <span className="px-3 py-1 bg-violet-500/15 border border-violet-400/30 rounded-full text-xs font-semibold text-violet-300 uppercase tracking-wider">
                {topic}
              </span>
              <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-400/30 rounded-full text-xs font-semibold text-cyan-300 capitalize">
                {difficulty} Difficulty
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {isNextBatch ? "Preparing Your Next Question..." : "Synthesizing Practice Session..."}
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Our AI is curating realistic, syllabus-grounded questions tailored to your performance.
            </p>
          </div>

          {/* Progress Bar & Stages */}
          <div className="space-y-3.5 mb-7">
            <div className="flex justify-between items-center text-xs font-medium text-slate-400">
              <span className="text-violet-300 font-medium">
                {activeStep === 1 && "1. Analyzing topic concepts & syllabus"}
                {activeStep === 2 && "2. Formulating scenario-based questions"}
                {activeStep === 3 && "3. Calibrating distractors & explanations"}
              </span>
              <span className="text-cyan-400 font-semibold">{progress}%</span>
            </div>

            {/* Glowing Shimmer Bar */}
            <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-lg shadow-violet-500/40 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Step Checkpoints */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div
                className={`flex items-center gap-1.5 text-[0.7rem] font-medium transition-colors ${
                  activeStep >= 1 ? "text-violet-300" : "text-slate-500"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeStep >= 1 ? "text-violet-400" : "text-slate-600"}`} />
                <span>Extract Notes</span>
              </div>
              <div
                className={`flex items-center justify-center gap-1.5 text-[0.7rem] font-medium transition-colors ${
                  activeStep >= 2 ? "text-indigo-300" : "text-slate-500"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeStep >= 2 ? "text-indigo-400" : "text-slate-600"}`} />
                <span>Build MCQs</span>
              </div>
              <div
                className={`flex items-center justify-end gap-1.5 text-[0.7rem] font-medium transition-colors ${
                  activeStep >= 3 ? "text-cyan-300" : "text-slate-500"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeStep >= 3 ? "text-cyan-400" : "text-slate-600"}`} />
                <span>Finalize Bank</span>
              </div>
            </div>
          </div>

          {/* AI Study Tip & Brain Hack Carousel Card */}
          <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:border-violet-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300">
                  <TipIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  💡 Study Insight • <span className="text-violet-400">{currentTip.category}</span>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-[0.65rem] font-medium text-slate-400">
                {currentTip.tag}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
              "{currentTip.tip}"
            </p>

            {/* Tip indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              {STUDY_TIPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTipIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === tipIndex ? "w-5 bg-violet-400" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                  }`}
                  aria-label={`Go to tip ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
