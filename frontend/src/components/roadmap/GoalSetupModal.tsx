'use client';

import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  GraduationCap,
  Lightbulb,
  LucideIcon,
  PencilLine,
  Sparkles,
  Target,
  X,
} from "lucide-react";

interface GoalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roadmapData: any) => void;
}

type GoalType = "internship" | "semester_exam" | "weak_subject" | "project" | "custom";

interface GoalPreset {
  icon: LucideIcon;
  eyebrow: string;
  label: string;
  description: string;
  topicLabel: string;
  topicPlaceholder: string;
  descriptionPlaceholder: string;
  descriptionHint: string;
  suggestions: string[];
}

const GOAL_PRESETS: Record<GoalType, GoalPreset> = {
  internship: {
    icon: BriefcaseBusiness,
    eyebrow: "Career outcome",
    label: "Internship or job preparation",
    description: "Choose a target role or track. Your roadmap will connect skills to practice, portfolio evidence, and interviews.",
    topicLabel: "Target role or internship track",
    topicPlaceholder: "e.g. Data Analyst internship or Backend Developer role",
    descriptionPlaceholder: "e.g. I know Excel and basic Python; I want one portfolio project and interview practice in 8 weeks.",
    descriptionHint: "Mention your current skills, preferred tools, target company type, or portfolio needs.",
    suggestions: ["Data Analyst internship", "Frontend Developer internship", "Machine Learning internship", "Backend Developer role"],
  },
  semester_exam: {
    icon: GraduationCap,
    eyebrow: "Academic outcome",
    label: "Exam or certification preparation",
    description: "Choose the subject and exam. The plan will move from prerequisites to worked problems, revision, and assessment.",
    topicLabel: "Subject or exam focus",
    topicPlaceholder: "e.g. Operating Systems semester exam or JEE Physical Chemistry",
    descriptionPlaceholder: "e.g. My exam is in 6 weeks; I understand the basics but need a problem-solving and revision plan.",
    descriptionHint: "Add the exam date, current level, syllabus units, or the areas carrying the most marks.",
    suggestions: ["Operating Systems exam", "Data Structures and Algorithms exam", "JEE Physical Chemistry", "DBMS certification"],
  },
  weak_subject: {
    icon: Target,
    eyebrow: "Skill improvement",
    label: "Strengthen a weak subject",
    description: "Name the subject or skill that needs attention. The roadmap will focus on gaps, deliberate practice, and confidence-building checkpoints.",
    topicLabel: "Subject or skill to improve",
    topicPlaceholder: "e.g. Probability, SQL query optimization, or Thermodynamics",
    descriptionPlaceholder: "e.g. I can follow examples but struggle to solve problems independently, especially with probability distributions.",
    descriptionHint: "Tell us what feels difficult, what you have already tried, and how much time you can study.",
    suggestions: ["Probability and Statistics", "SQL query optimization", "Thermodynamics", "Data Structures"],
  },
  project: {
    icon: PencilLine,
    eyebrow: "Build outcome",
    label: "Build a project or portfolio piece",
    description: "Describe the thing you want to build. The roadmap will turn it into milestones, implementation work, testing, and a final demonstration.",
    topicLabel: "Project or outcome",
    topicPlaceholder: "e.g. A personal finance app or an image-classification model",
    descriptionPlaceholder: "e.g. I want a working MVP, I am comfortable with JavaScript, and I can spend 5 hours each week.",
    descriptionHint: "Include the audience, preferred stack, expected deliverable, or any technical constraints.",
    suggestions: ["Personal finance dashboard", "Image-classification model", "Astrophysics simulation", "Campus placement portfolio"],
  },
  custom: {
    icon: Lightbulb,
    eyebrow: "Open-ended goal",
    label: "Explore any topic",
    description: "Use any subject, role, hobby, research area, or outcome. The topic you enter is always the source of truth.",
    topicLabel: "Topic or outcome",
    topicPlaceholder: "e.g. Astrophysics, Digital Marketing, React Native, or Public Speaking",
    descriptionPlaceholder: "e.g. I am a beginner and want a practical, portfolio-ready outcome in 8 weeks.",
    descriptionHint: "Add your level, target outcome, preferred approach, or constraints so the plan feels personal.",
    suggestions: ["Astrophysics", "Digital Marketing", "React Native", "Public Speaking"],
  },
};

const INITIAL_GOAL_TYPE: GoalType = "custom";

export default function GoalSetupModal({ isOpen, onClose, onSuccess }: GoalSetupModalProps) {
  const [goalType, setGoalType] = useState<GoalType>(INITIAL_GOAL_TYPE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const preset = GOAL_PRESETS[goalType];
  const PresetIcon = preset.icon;

  const resetForm = () => {
    setGoalType(INITIAL_GOAL_TYPE);
    setTitle("");
    setDescription("");
    setDeadline("");
    setErrorMessage("");
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const rawStudentId = localStorage.getItem("user_id");
      const studentId = rawStudentId ? parseInt(rawStudentId, 10) : NaN;
      if (!Number.isInteger(studentId) || studentId <= 0) {
        throw new Error("Authentication required. Please sign in again.");
      }

      // Save the learner's exact topic, category, context, and target date.
      const goalRes = await fetch("/api/roadmap/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          goal_type: goalType,
          title: trimmedTitle,
          description: description.trim() || null,
          deadline: deadline || null,
        }),
      });
      const goalData = await goalRes.json();

      if (!goalRes.ok || !goalData.success || !goalData.goal?.id) {
        throw new Error("We could not save this learning goal.");
      }

      // Start generation in the background; the dashboard will poll for completion.
      const roadmapRes = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          goal_id: goalData.goal.id,
        }),
      });
      const roadmapData = await roadmapRes.json();

      if (!roadmapRes.ok || !roadmapData.success) {
        throw new Error("We could not start roadmap generation.");
      }

      onSuccess(roadmapData);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error setting up goal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-setup-title"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1427] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/80">Personal roadmap</p>
            <h2 id="goal-setup-title" className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Set a learning goal
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
              Pick a planning lens, name the exact topic, and add context. You can create a roadmap for any valid subject or outcome.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close roadmap form"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="rounded-2xl border border-indigo-400/15 bg-indigo-500/[0.07] p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <PresetIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">{preset.eyebrow}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{preset.label}</p>
                  <p className="mt-1 text-xs leading-4 text-slate-400">{preset.description}</p>
                </div>
              </div>

              <label htmlFor="roadmap-goal-type" className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Planning lens
              </label>
              <div className="relative mt-1.5">
                <select
                  id="roadmap-goal-type"
                  value={goalType}
                  onChange={(event) => setGoalType(event.target.value as GoalType)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#18243a] px-3 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/15"
                >
                  <option value="internship">Internship or job preparation</option>
                  <option value="semester_exam">Exam or certification preparation</option>
                  <option value="weak_subject">Strengthen a weak subject</option>
                  <option value="project">Build a project or portfolio piece</option>
                  <option value="custom">Explore any topic</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-cyan-300" />
                  <label htmlFor="roadmap-title" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {preset.topicLabel}
                  </label>
                </div>
                <input
                  id="roadmap-title"
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setErrorMessage("");
                  }}
                  required
                  maxLength={180}
                  placeholder={preset.topicPlaceholder}
                  className="mt-2.5 w-full rounded-xl border border-white/10 bg-[#18243a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15"
                />
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Try a topic</p>
                    <p className="text-[11px] text-slate-600">Suggestions change with the lens</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preset.suggestions.map((suggestion) => {
                      const isSelected = title.trim().toLowerCase() === suggestion.toLowerCase();
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setTitle(suggestion);
                            setErrorMessage("");
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                            isSelected
                              ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-300" />
                  <label htmlFor="roadmap-description" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Context <span className="normal-case font-normal text-slate-500">(optional)</span>
                  </label>
                </div>
                <textarea
                  id="roadmap-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder={preset.descriptionPlaceholder}
                  className="mt-2.5 w-full resize-none rounded-xl border border-white/10 bg-[#18243a] px-3 py-2.5 text-sm leading-5 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/10"
                />
                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="text-xs leading-5 text-slate-500">{preset.descriptionHint}</p>
                  <span className="shrink-0 text-[10px] text-slate-600">{description.length}/600</span>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-300" />
                <label htmlFor="roadmap-deadline" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Target date <span className="normal-case font-normal text-slate-500">(optional)</span>
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center">
                <input
                  id="roadmap-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#18243a] px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark] focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/10"
                />
                <p className="text-xs leading-5 text-slate-500">Leave this blank for a balanced six-week roadmap. The date controls the pace when provided.</p>
              </div>
            </section>

            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
              <p className="max-w-sm text-xs leading-5 text-slate-500">
                Your topic and context guide the AI. The category only changes the planning approach.
              </p>
              <div className="flex shrink-0 items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {isLoading ? "Starting roadmap..." : "Generate roadmap"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
