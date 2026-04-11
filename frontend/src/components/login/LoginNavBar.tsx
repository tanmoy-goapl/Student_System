import Link from "next/link";
import Image from "next/image";

export default function LoginNavBar() {
  return (
    <div className="mb-10 flex items-center justify-between gap-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to home
      </Link>
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/mentor-logo.png"
          alt="Mentor AI"
          width={100}
          height={100}
          className="h-9 w-9 rounded-xl"
          priority
        />
        <span className="text-lg font-bold text-white">Mentor AI</span>
      </Link>
    </div>
  );
}
