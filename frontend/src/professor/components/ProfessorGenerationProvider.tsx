"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Loader2, X } from "lucide-react";

export type GenerationActionType = "lesson" | "quiz" | "revision" | "simplify" | "practice";
export type GenerationJobStatus = "generating" | "complete" | "error";

export interface GenerationJob {
  id: string;
  title: string;
  topic: string;
  status: GenerationJobStatus;
  result: string;
  error?: string;
}

interface StartGenerationRequest {
  title: string;
  topic: string;
  subjectName: string;
  actionType: GenerationActionType;
  classroomId?: string;
  description?: string;
  professorId?: number;
}

interface GenerationContextValue {
  generationJobs: GenerationJob[];
  startGeneration: (request: StartGenerationRequest) => string;
  dismissGenerationJob: (id: string) => void;
  viewingJobId: string | null;
  setViewingJobId: (id: string | null) => void;
}

const ProfessorGenerationContext = createContext<GenerationContextValue | null>(null);

function getJobLabel(title: string) {
  return title.replace("Create ", "").replace("Generate ", "");
}

function jobTone(status: GenerationJobStatus) {
  if (status === "generating") {
    return {
      border: "border-violet-400/35 bg-[#11132a]/95 hover:border-violet-300/60",
      iconBg: "bg-violet-500/15",
      icon: "text-violet-300",
      label: "text-violet-300",
    };
  }
  if (status === "complete") {
    return {
      border: "border-emerald-400/25 bg-[#0b1b1a]/95 hover:border-emerald-300/50",
      iconBg: "bg-emerald-500/15",
      icon: "text-emerald-300",
      label: "text-emerald-300",
    };
  }
  return {
    border: "border-rose-400/25 bg-[#1d1018]/95 hover:border-rose-300/50",
    iconBg: "bg-rose-500/15",
    icon: "text-rose-300",
    label: "text-rose-300",
  };
}

function GenerationNotification({
  job,
  onView,
  onDismiss,
}: {
  job: GenerationJob;
  onView: () => void;
  onDismiss: () => void;
}) {
  const label = getJobLabel(job.title);
  const isGenerating = job.status === "generating";
  const isComplete = job.status === "complete";
  const tone = jobTone(job.status);

  return (
    <div className={`relative rounded-2xl border p-3.5 text-left shadow-2xl backdrop-blur-md transition hover:-translate-y-0.5 ${tone.border}`}>
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${label} generation for ${job.topic}`}
        className="flex w-full items-start gap-3 pr-7 text-left"
      >
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.iconBg}`}>
          {isGenerating ? <Loader2 className={`h-4 w-4 animate-spin ${tone.icon}`} /> : isComplete ? <CheckCircle2 className={`h-4 w-4 ${tone.icon}`} /> : <AlertTriangle className={`h-4 w-4 ${tone.icon}`} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-bold text-white">
              {isGenerating ? `${label} generation started` : isComplete ? `${label} ready` : `${label} failed`}
            </span>
            <Bell className={`h-3.5 w-3.5 shrink-0 ${tone.icon}`} />
          </span>
          <span className="mt-1 block truncate text-[10px] text-slate-300">
            {isGenerating ? `Generating ${label.toLowerCase()} for “${job.topic}”` : job.topic}
          </span>
          <span className={`mt-2 block text-[9px] font-semibold uppercase tracking-wider ${tone.label}`}>
            Click to view {isGenerating ? "live progress" : "result"}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${label} generation notification`}
        className="absolute right-2 top-2 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ProfessorGenerationNotifications({
  jobs,
  onView,
  onDismiss,
  enabled,
}: {
  jobs: GenerationJob[];
  onView: (id: string) => void;
  onDismiss: (id: string) => void;
  enabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (!enabled || pathname === "/professor" || jobs.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[120] w-[min(390px,calc(100vw-2rem))] space-y-2"
      role="status"
      aria-live="polite"
    >
      {jobs.slice(-5).reverse().map((job) => (
        <GenerationNotification
          key={job.id}
          job={job}
          onView={() => {
            onView(job.id);
            router.push("/professor");
          }}
          onDismiss={() => onDismiss(job.id)}
        />
      ))}
    </div>
  );
}

export default function ProfessorGenerationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  const updateGenerationJob = useCallback((id: string, updates: Partial<GenerationJob>) => {
    setGenerationJobs((jobs) => jobs.map((job) => (job.id === id ? { ...job, ...updates } : job)));
  }, []);

  const startGeneration = useCallback((request: StartGenerationRequest) => {
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const professorId = request.professorId ?? Number(window.localStorage.getItem("user_id") || 2);

    setGenerationJobs((jobs) => [
      ...jobs,
      { id: jobId, title: request.title, topic: request.topic, status: "generating" as const, result: "" },
    ].slice(-8));

    void (async () => {
      try {
        const params = new URLSearchParams({
          topic: request.topic,
          subject: request.subjectName,
          user_id: String(professorId),
          action_type: request.actionType,
        });
        if (request.classroomId) params.set("target_classroom_id", request.classroomId);
        if (request.description) params.set("description", request.description);

        const response = await fetch(`/api/learning/generate_material/stream?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let fullText = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              fullText += decoder.decode(value, { stream: true });
              updateGenerationJob(jobId, { result: fullText });
            }
          }
          const finalChunk = decoder.decode();
          if (finalChunk) {
            fullText += finalChunk;
            updateGenerationJob(jobId, { result: fullText });
          }
        } finally {
          reader.releaseLock();
        }

        updateGenerationJob(jobId, { status: "complete" });
      } catch (error: unknown) {
        updateGenerationJob(jobId, {
          status: "error",
          error: error instanceof Error ? error.message : "Failed to generate content",
        });
      }
    })();

    return jobId;
  }, [updateGenerationJob]);

  const dismissGenerationJob = useCallback((id: string) => {
    setGenerationJobs((jobs) => jobs.filter((job) => job.id !== id));
    setViewingJobId((currentId) => (currentId === id ? null : currentId));
  }, []);

  const value = useMemo<GenerationContextValue>(() => ({
    generationJobs,
    startGeneration,
    dismissGenerationJob,
    viewingJobId,
    setViewingJobId,
  }), [generationJobs, startGeneration, dismissGenerationJob, viewingJobId]);

  return (
    <ProfessorGenerationContext.Provider value={value}>
      {children}
      <ProfessorGenerationNotifications
        enabled={enabled}
        jobs={generationJobs}
        onView={(id) => setViewingJobId(id)}
        onDismiss={dismissGenerationJob}
      />
    </ProfessorGenerationContext.Provider>
  );
}

export function useProfessorGeneration() {
  const context = useContext(ProfessorGenerationContext);
  if (!context) {
    throw new Error("useProfessorGeneration must be used inside ProfessorGenerationProvider");
  }
  return context;
}
