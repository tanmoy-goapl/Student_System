"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Lock,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  BookOpen,
  UploadCloud,
  FileQuestion,
  RefreshCw,
  FileText,
  Brain,
  Target
} from "lucide-react";


/* ==========================================
   1. SHIMMER & BASE UTILITIES
   ========================================== */

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-800/40 rounded-lg ${className}`} />
  );
}

export function LoadingButton({
  loading,
  onClick,
  children,
  loadingText = "Processing...",
  disabled = false,
  className = "",
  type = "button"
}: {
  loading: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={loading ? undefined : onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition duration-200 cursor-pointer shadow-lg shadow-blue-500/10 ${
        loading || disabled
          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-500 text-white"
      } ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin text-blue-400" />}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

/* ==========================================
   2. SKELETONS (LOADING STATE)
   ========================================== */

export function CardSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <Shimmer className="w-10 h-10 rounded-xl" />
        <div className="flex-1 flex flex-col gap-2">
          <Shimmer className="w-1/2 h-4" />
          <Shimmer className="w-1/3 h-3" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5 mt-2">
        <Shimmer className="w-full h-3" />
        <Shimmer className="w-5/6 h-3" />
      </div>
    </div>
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Shimmer className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <Shimmer className="w-3/4 h-3.5" />
          <Shimmer className="w-1/4 h-2.5" />
        </div>
      </div>
      <Shimmer className="w-6 h-6 rounded-md shrink-0" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
      {/* Table Header */}
      <div className="grid border-b border-white/5 bg-slate-950/30 px-6 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1-fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex items-center">
            <Shimmer className="w-1/2 h-3" />
          </div>
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid px-6 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1-fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex items-center">
                <Shimmer className="w-2/3 h-3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-6 w-full min-h-[300px]">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <Shimmer className="w-48 h-4" />
          <Shimmer className="w-24 h-3" />
        </div>
        <Shimmer className="w-20 h-6" />
      </div>
      {/* Bar Chart bars layout */}
      <div className="flex-1 flex gap-4 items-end min-h-[160px] px-2">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ["h-16", "h-28", "h-36", "h-20", "h-40", "h-24", "h-32", "h-12"];
          return (
            <div key={i} className="flex-1 flex flex-col gap-2 items-center">
              <Shimmer className={`w-full ${heights[i]} rounded-t-md`} />
              <Shimmer className="w-8 h-2.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center p-3 rounded-xl border border-white/5 bg-slate-900/20">
          <Shimmer className="w-5 h-5 rounded-full" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Shimmer className="w-1/3 h-3" />
            <Shimmer className="w-1/5 h-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LearningSkeleton() {
  return (
    <div className="flex gap-6 w-full h-[calc(100vh-4rem)] bg-slate-950 p-6 overflow-hidden">
      {/* Left skeleton workspace */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
          <Shimmer className="w-1/4 h-3" />
          <Shimmer className="w-1/2 h-6" />
          <Shimmer className="w-1/3 h-4" />
          <div className="flex gap-2 mt-2">
            <Shimmer className="w-24 h-8 rounded-lg" />
            <Shimmer className="w-24 h-8 rounded-lg" />
          </div>
        </div>
        <div className="bg-slate-900/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-4 flex-1">
          <Shimmer className="w-1/5 h-4" />
          <div className="space-y-3 mt-2">
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-full h-3" />
            <Shimmer className="w-5/6 h-3" />
            <Shimmer className="w-4/5 h-3" />
          </div>
        </div>
      </div>
      {/* Right skeleton sidebar */}
      <div className="w-80 flex flex-col gap-6 shrink-0">
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
          <Shimmer className="w-1/2 h-4" />
          <div className="flex justify-center py-4">
            <Shimmer className="w-28 h-28 rounded-full" />
          </div>
          <Shimmer className="w-full h-3" />
        </div>
        <div className="bg-slate-900/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
          <Shimmer className="w-1/2 h-4" />
          <Shimmer className="w-full h-10 rounded-xl" />
          <Shimmer className="w-full h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PracticeSkeleton() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <Shimmer className="w-24 h-3" />
          <Shimmer className="w-32 h-3" />
        </div>
        <Shimmer className="w-full h-6 mt-2" />
        <Shimmer className="w-5/6 h-6" />
      </div>
      <div className="flex flex-col gap-3 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900/30 border border-white/5 p-4 rounded-xl flex items-center gap-4">
            <Shimmer className="w-5 h-5 rounded-full shrink-0" />
            <Shimmer className="w-1/2 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ withSidebar = true }: { withSidebar?: boolean }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {withSidebar && (
        <div className="w-64 bg-[#050914] border-r border-white/5 p-6 flex flex-col gap-8 shrink-0">
          <div className="flex items-center gap-3">
            <Shimmer className="w-8 h-8 rounded-lg" />
            <Shimmer className="w-32 h-4" />
          </div>
          <div className="flex-1 flex flex-col gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Shimmer className="w-5 h-5 rounded-md" />
                <Shimmer className="w-28 h-3" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <div className="h-16 border-b border-white/5 bg-[#050a14]/40 flex items-center justify-between px-8">
          <Shimmer className="w-32 h-4" />
          <div className="flex items-center gap-4">
            <Shimmer className="w-8 h-8 rounded-full" />
            <Shimmer className="w-20 h-4" />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <div className="md:col-span-2 lg:col-span-3">
            <TableSkeleton rows={4} cols={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatThinking() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const statuses = [
      "🧠 Understanding your question...",
      "📚 Searching documents...",
      "📄 Reading relevant files...",
      "🤖 Generating response..."
    ];
    const interval = setInterval(() => {
      setStep((s) => (s < statuses.length - 1 ? s + 1 : s));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const statuses = [
    "🧠 Understanding your question...",
    "📚 Searching documents...",
    "📄 Reading relevant files...",
    "🤖 Generating response..."
  ];

  return (
    <div className="flex flex-col gap-2.5 py-3.5 pl-4 pr-10 bg-slate-900/50 border border-white/5 rounded-2xl max-w-[85%] min-w-[280px] shrink-0 self-start transition-all">
      <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wide">
        <Loader2 size={13} className="animate-spin" />
        <span>MentorAI is thinking</span>
        <div className="flex gap-0.5 ml-1">
          <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
      <div className="text-[11px] text-slate-400 font-medium transition-all duration-300">
        {statuses[step]}
      </div>
    </div>
  );
}

/* ==========================================
   3. EMPTY STATE
   ========================================== */

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon: IconComponent = FileQuestion
}: {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border border-white/5 rounded-2xl max-w-lg mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-5 shadow-lg shadow-blue-500/5">
        <IconComponent size={28} />
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-xs leading-relaxed text-slate-400 mb-6 max-w-xs">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

/* ==========================================
   4. NO SEARCH RESULTS
   ========================================== */

export function NoSearchResults({
  query,
  onClear
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-900/20 border border-white/5 rounded-xl my-6">
      <div className="text-slate-500 mb-4">
        <Search size={32} />
      </div>
      <h4 className="text-sm font-bold text-white mb-1.5">No results found</h4>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        We couldn't find anything matching "{query}". Try checking your spelling or using different keywords.
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

/* ==========================================
   5. ERROR STATE
   ========================================== */

export function ErrorState({
  message = "Something went wrong while fetching data.",
  onRetry
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } catch (e) {
      console.error(e);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="bg-rose-950/20 border border-rose-500/15 p-6 rounded-2xl max-w-md mx-auto my-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-sm font-bold text-white mb-1">Execution failed</h3>
      <p className="text-xs text-rose-200/60 mb-5 leading-relaxed max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-xs font-bold text-rose-300 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
          <span>{retrying ? "Retrying..." : "Retry"}</span>
        </button>
      )}
    </div>
  );
}

/* ==========================================
   6. PERMISSION STATE
   ========================================== */

export function PermissionState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-950 min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/5">
        <Lock size={28} />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Access Denied</h2>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
        You do not have permissions to view this resource. If you believe this is an error, please contact your administrator.
      </p>
      <a
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-white/5"
      >
        Back to Dashboard
      </a>
    </div>
  );
}

/* ==========================================
   7. OFFLINE STATE
   ========================================== */

export function OfflineState() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-999 bg-amber-600 text-white text-xs font-semibold py-2.5 px-4 flex items-center justify-center gap-2 animate-bounce shadow-xl">
      <WifiOff size={14} />
      <span>You are currently offline. Some features and data generation might be unavailable.</span>
    </div>
  );
}

/* ==========================================
   8. SUCCESS STATE
   ========================================== */

export function SuccessState({
  title,
  description,
  actionText,
  onAction
}: {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-900/30 border border-white/5 rounded-2xl max-w-md mx-auto my-6">
      <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 mb-4 shadow-lg shadow-green-500/5">
        <CheckCircle2 size={28} />
      </div>
      <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed max-w-xs">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white transition shadow-lg shadow-green-500/10 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

/* ==========================================
   9. PROCESSING STATE
   ========================================== */

export function ProcessingState({
  title = "Analyzing details...",
  steps = [],
  currentStepIndex = 0
}: {
  title?: string;
  steps?: string[];
  currentStepIndex?: number;
}) {
  const targetPct = steps.length > 0 ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;
  const [pct, setPct] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setPct((p) => {
        if (p < targetPct) return Math.min(p + 2, targetPct);
        if (p > targetPct) return Math.max(p - 2, targetPct);
        return p;
      });
    }, 45);
    return () => clearInterval(interval);
  }, [targetPct]);

  const getStepIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("read") || t.includes("file") || t.includes("doc")) return <FileText size={13} className="text-blue-400 shrink-0" />;
    if (t.includes("parse") || t.includes("brain") || t.includes("topic")) return <Brain size={13} className="text-pink-400 shrink-0" />;
    if (t.includes("generate") || t.includes("quiz") || t.includes("question")) return <Target size={13} className="text-amber-400 shrink-0" />;
    if (t.includes("finalize") || t.includes("workspace") || t.includes("finish")) return <Sparkles size={13} className="text-indigo-400 shrink-0" />;
    return <BookOpen size={13} className="text-zinc-400 shrink-0" />;
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md mx-auto my-8 flex flex-col gap-6 shadow-[0_0_50px_-12px_rgba(91,95,255,0.25)] border-indigo-500/20 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/25">
            <Loader2 size={16} className="animate-spin text-[#5B5FFF]" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        </div>
        <span className="text-xs font-extrabold text-[#5B5FFF] bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/25 tracking-wide">{pct}%</span>
      </div>

      {/* Premium Progress Bar */}
      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
        <div
          className="h-full bg-gradient-to-r from-[#5B5FFF] via-cyan-400 to-[#5B5FFF] bg-[length:200%_auto] animate-gradient-shift transition-all duration-700 ease-out shadow-[0_0_12px_rgba(91,95,255,0.4)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step Tracker */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            // Clean up emoji prefix (e.g. 📄, 🧠, 🎯, ✨)
            const cleanStepText = step.replace(/^[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\u2300-\u23FF📄🧠🎯✨]+\s*/g, "");

            return (
              <div 
                key={idx} 
                className={`flex gap-3.5 items-center text-xs transition-all duration-300 ${
                  isCompleted ? "opacity-75" : isActive ? "opacity-100 scale-[1.01]" : "opacity-30"
                }`}
              >
                {isCompleted ? (
                  <div className="p-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                    <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                  </div>
                ) : isActive ? (
                  <div className="p-0.5 bg-indigo-500/20 rounded-full border border-indigo-500/30 animate-pulse">
                    <Loader2 size={11} className="animate-spin text-[#5B5FFF] shrink-0" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-800 shrink-0 bg-slate-900/50" />
                )}
                
                {getStepIcon(step)}

                <span className={`text-xs tracking-wide ${
                  isCompleted 
                    ? "text-slate-400 font-medium line-through decoration-slate-800" 
                    : isActive 
                      ? "text-white font-semibold" 
                      : "text-slate-500"
                }`}>
                  {cleanStepText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================
   10. FIRST-TIME USER STATE (ONBOARDING)
   ========================================== */

export function FirstTimeUserState({
  userName,
  steps = [],
  onStart
}: {
  userName?: string;
  steps?: { title: string; description: string; icon: any }[];
  onStart?: () => void;
}) {
  const defaultSteps = [
    {
      title: "Upload Study Material",
      description: "Submit your PDFs, marksheets, or syllabus under the Documents portal.",
      icon: UploadCloud
    },
    {
      title: "Enroll in Classrooms",
      description: "Join classrooms created by your professors to access curriculum slides.",
      icon: BookOpen
    },
    {
      title: "Converse with MentorAI",
      description: "Ask questions, review guides, or prepare custom roadmap goals.",
      icon: Sparkles
    }
  ];

  const onboardingSteps = steps.length > 0 ? steps : defaultSteps;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 flex flex-col gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white">
          Welcome to Mentor AI{userName ? `, ${userName}` : ""}!
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Get started with your personalized learning assistant in just a few quick steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {onboardingSteps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div key={idx} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <StepIcon size={20} />
              </div>
              <div className="text-xs font-bold text-white">{step.title}</div>
              <p className="text-[10px] leading-relaxed text-slate-400">{step.description}</p>
            </div>
          );
        })}
      </div>

      {onStart && (
        <button
          onClick={onStart}
          className="self-center mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          Let's Go
        </button>
      )}
    </div>
  );
}
