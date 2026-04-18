"use client";

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const BULLETS = [
  "Interactive side-by-side reading",
  "Automatic summaries for long chapters",
  "Dynamic flashcard generation",
] as const;

export default function Information() {
  return (
    <section
      className="bg-[#050a14] px-6 py-16 font-sans lg:px-10"
      aria-labelledby="information-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0b0e14] p-8 shadow-[0_0_60px_-15px_rgba(0,123,255,0.15)] md:p-12 lg:p-14 lg:px-16">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left column */}
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#007bff]">
                <IconCheckCircle className="h-5 w-5 shrink-0" />
                <span>99.9% Citation Accuracy</span>
              </div>

              <h3
                id="information-heading"
                className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]"
              >
                Never lose your source of information again.
              </h3>

              <p className="mt-5 text-sm leading-relaxed text-[#a0aec0] sm:text-lg">
                Unlike generic AI bots, Mentor AI provides direct links and highlighted passages within
                your original documents, ensuring you never have to worry about hallucinations.
              </p>

              <ul className="mt-8 space-y-4">
                {BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[#a0aec0]">
                    <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#007bff]" />
                    <span className="text-xs leading-relaxed sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column — document mockup */}
            <div className="relative flex min-h-[320px] items-center justify-center lg:min-h-[380px]">
              <div
                className="pointer-events-none absolute -right-4 top-0 h-48 w-48 rounded-full bg-[#007bff]/25 blur-3xl"
                aria-hidden
              />

              <div className="relative w-full max-w-md">
                <div className="relative rounded-2xl border border-white/10 bg-slate-800/40 p-6 pb-24 backdrop-blur-sm sm:pb-28">
                  {/* Placeholder lines */}
                  <div className="space-y-3">
                    <div className="h-2.5 w-full rounded-full bg-slate-600/35" />
                    <div className="h-2.5 w-[92%] rounded-full bg-slate-600/30" />
                    <div className="h-2.5 w-[88%] rounded-full bg-slate-600/25" />
                    <div className="h-2.5 w-full rounded-full bg-slate-600/30" />
                    <div className="h-2.5 w-[75%] rounded-full bg-slate-600/25" />
                    <div className="h-2.5 w-[95%] rounded-full bg-slate-600/20" />
                  </div>

                  {/* Highlight region */}
                  <div className="relative mt-8 rounded-xl border border-dashed border-sky-500/40 bg-slate-900/30 px-4 py-3">
                    <p className="text-xs italic leading-relaxed text-slate-500 sm:text-sm">
                      Section 4.2: The Thermal Bridge Effect...
                    </p>
                  </div>

                  {/* Cited passage tooltip */}
                  <div className="absolute bottom-[-16] z-10 max-w-[min(calc(100%-2rem),280px)] rounded-xl border border-white/20 bg-[#007bff] p-4 shadow-lg shadow-blue-900/50 sm:max-w-[300px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                      Cited passage
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white sm:text-sm">
                      Mentor AI has identified that the efficiency drops exactly at the transition
                      point mentioned on page 24.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
