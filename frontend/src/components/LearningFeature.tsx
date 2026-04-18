"use client";

import Link from "next/link";

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l2.608-8.877L3.372 12.5a.75.75 0 01-.182-1.395l11.25-4.5a.75.75 0 01.175-.005z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
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

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      />
    </svg>
  );
}

const FEATURES = [
  {
    title: "AI-Powered Learning",
    description:
      "Harness GPT-4-level reasoning applied specifically to your educational content.",
    Icon: IconBolt,
  },
  {
    title: "Multi-Doc Intelligence",
    description:
      "Our AI can synthesize information across dozens of files simultaneously.",
    Icon: IconBook,
  },
  {
    title: "Instant Responses",
    description:
      "Get answers in milliseconds, allowing you to maintain your flow state.",
    Icon: IconChat,
  },
  {
    title: "Personalized Guidance",
    description:
      "The AI learns your weaknesses and provides practice tailored to your needs.",
    Icon: IconShield,
  },
] as const;

export default function LearningFeature() {
  return (
    <section
      className="bg-[#050a14] px-6 py-16 font-sans text-white lg:px-10"
      aria-labelledby="learning-features-heading"
    >
      <div className="max-w-[70vw]">
        <div className="mb-12 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <h3
              id="learning-features-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Supercharged Learning Features
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-lg">
              Everything you need to master any subject in record time. Our AI is built with privacy
              and accuracy at its core.
            </p>
          </div>
          <Link
            href="/chat"
            className="shrink-0 text-sm font-semibold text-[#00a3ff] transition hover:text-sky-300 lg:pb-0.5"
          >
            Explore all features <span aria-hidden>&gt;</span>
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {FEATURES.map(({ title, description, Icon }) => (
            <li
              key={title}
              className="rounded-xl border border-gray-800 bg-[#0f172a] p-6 shadow-lg shadow-black/20"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500 text-sky-500">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
