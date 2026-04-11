"use client";

function IconCloudUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function IconMessageSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

const STEPS = [
  {
    step: "01",
    title: "Upload Documents",
    description:
      "Drop your PDFs, notes, or research papers into your secure dashboard.",
    Icon: IconCloudUpload,
  },
  {
    step: "02",
    title: "Ask Questions",
    description:
      "Ask anything from basic concepts to complex theories found in your materials.",
    Icon: IconMessageSquare,
  },
  {
    step: "03",
    title: "Get Smart Answers",
    description:
      "Receive instant, accurate explanations with citations to your original documents.",
    Icon: IconSparkles,
  },
] as const;

export default function ResumeSteps() {
  return (
    <section
      className="relative border-t border-white/5 bg-[#020617] px-6 py-20 font-sans text-white lg:px-10"
      aria-labelledby="resume-steps-heading"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-16 text-center">
          <h2
            id="resume-steps-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Simple 3-Step Process
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            We&apos;ve streamlined the learning process using advanced AI logic to help you focus on
            what matters.
          </p>
        </header>

        <div className="relative">
          {/* Connector line (desktop): behind icons, through circle centers */}
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-[52px] hidden h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent md:block"
            aria-hidden
          />

          <ul className="grid gap-14 md:grid-cols-3 md:gap-8 lg:gap-12">
            {STEPS.map(({ step, title, description, Icon }) => (
              <li key={step} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <span className="absolute -right-1 -top-1 z-10 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-bold text-white shadow-lg shadow-sky-900/40">
                    {step}
                  </span>
                  <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-full border border-sky-500/40 bg-white/[0.03] text-sky-400">
                    <Icon className="h-9 w-9" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
