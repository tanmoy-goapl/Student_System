"use client";

import Link from "next/link";

export default function StartLearning() {
  return (
    <section className="bg-[#050a14] px-6 py-16 font-sans lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0066ff] to-[#4d4dff] px-8 py-14 shadow-[0_25px_60px_-15px_rgba(0,102,255,0.35)] md:px-12 md:py-16 lg:px-16 lg:py-20">
          {/* Decorative arcs */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10 md:h-80 md:w-80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full border border-white/10 md:h-96 md:w-96"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full border border-white/5 md:right-12 md:top-12"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-10 left-10 h-32 w-32 rounded-full border border-white/5"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              <span className="block">Start learning smarter</span>
              <span className="block">today</span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Join 50,000+ students and professionals who are already transforming their learning
              process with Mentor AI.
            </p>

            <Link
              href="/chat"
              className="mt-10 inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-base font-bold text-[#0066ff] shadow-lg shadow-black/10 transition hover:bg-white/95"
            >
              Get Started Free
            </Link>

            <p className="mt-6 text-xs text-white/55 sm:text-sm">
              No credit card required • Free trial included
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
