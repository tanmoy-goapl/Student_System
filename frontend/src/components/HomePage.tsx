"use client";

import Link from "next/link";
import ResumeSteps from "@/components/ResumeSteps";
import LearningFeature from "@/components/LearningFeature";
import Information from "@/components/Information";
import StartLearning from "@/components/StartLearning";

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1.5l1.62 5.02h5.24l-4.24 3.08 1.62 5.02L12 11.54l-4.24 3.08 1.62-5.02-4.24-3.08h5.24L12 1.5zM5 14.5l.92 2.85h2.98l-2.41 1.75.92 2.85L5 20.1l-2.41 1.75.92-2.85-2.41-1.75h2.98L5 14.5zM17 14.5l.92 2.85h2.98l-2.41 1.75.92 2.85-2.41-1.75-2.41 1.75.92-2.85-2.41-1.75h2.98L17 14.5z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
    <section className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden px-6 pb-20 pt-10 font-sans text-white lg:px-10 lg:pt-14">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#020617]"
        aria-hidden
      />
      <div className="pointer-events-none absolute -left-32 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 top-1/3 -z-10 h-[380px] w-[380px] rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[90px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-12">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
            <SparkIcon className="h-3.5 w-3.5 text-cyan-400" />
            Next-gen AI learning
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            <span className="block text-white">Your Personal AI</span>
            <span className="mt-1 block bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Mentor for
            </span>
            <span className="mt-1 block bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Smarter
            </span>
            <span className="mt-1 block text-white">Learning.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Upload your study materials, ask questions, and get intelligent guidance tailored just
            for you. Master any subject with your private AI tutor.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-violet-500 hover:shadow-blue-500/35"
            >
              Start Learning Free
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
            >
              <PlayIcon className="h-4 w-4" />
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Right column — chat mockup */}
        <div className="relative lg:justify-self-end">
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 text-center font-mono text-xs text-slate-500">
                mentor-ai-session_01
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {/* User message */}
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-[10px] font-bold text-slate-300">
                  ME
                </div>
                <div className="rounded-2xl rounded-tl-md border border-white/5 bg-slate-800/80 px-4 py-3 text-sm leading-relaxed text-slate-200">
                  Can you explain the laws of thermodynamics in simple terms?
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                  <SparkIcon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-blue-500/20 bg-gradient-to-br from-blue-950/80 to-slate-900/90 px-4 py-3">
                  <p className="mb-2 text-sm font-semibold text-cyan-200">Mentor AI Assistant</p>
                  <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-slate-300">
                    <li>
                      <span className="font-medium text-slate-200">First law:</span> Energy cannot
                      be created or destroyed, only transferred or converted.
                    </li>
                    <li>
                      <span className="font-medium text-slate-200">Second law:</span> In natural
                      processes, entropy (disorder) tends to increase.
                    </li>
                    <li>
                      <span className="font-medium text-slate-200">Third law:</span> As temperature
                      approaches absolute zero, a system&apos;s entropy approaches a minimum.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <svg
                  className="h-5 w-5 shrink-0 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="text-sm text-slate-500">Ask anything...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <ResumeSteps />
    <LearningFeature />
    <Information />
    <StartLearning />
    </>
  );
}
