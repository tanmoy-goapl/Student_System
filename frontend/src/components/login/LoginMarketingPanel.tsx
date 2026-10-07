import LoginFeatureItem from "./LoginFeatureItem";
import LoginChatPreview from "./LoginChatPreview";

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

export default function LoginMarketingPanel() {
  return (
    <div className="flex flex-col justify-center lg:max-w-xl lg:pr-8">
      <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-300">
        <span aria-hidden>✨</span>
        Your AI mentor awaits
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
        Welcome back <span aria-hidden>👋</span>
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
        Continue your learning journey with your AI mentor. Ask anything, learn everything.
      </p>

      <div className="mt-10 space-y-6">
        <LoginFeatureItem
          title="AI-Powered Learning"
          description="GPT-4-level reasoning on your materials."
        >
          <IconBolt className="h-5 w-5" />
        </LoginFeatureItem>
        <LoginFeatureItem
          title="Instant Answers"
          description="Responses in milliseconds, always cited."
        >
          <IconChat className="h-5 w-5" />
        </LoginFeatureItem>
        <LoginFeatureItem
          title="Multi-Doc Intelligence"
          description="Synthesize info across dozens of files."
        >
          <IconBook className="h-5 w-5" />
        </LoginFeatureItem>
      </div>

      <LoginChatPreview />
    </div>
  );
}
