"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login } from "@/lib/api";
import LoginShell from "./LoginShell";
import { Check, Copy } from "lucide-react";

type LoginType = "admin" | "user" | "professor";

type Props = {
  onLoginSuccess?: () => void;
  /** Where to navigate after successful login */
  redirectAfterLogin?: string;
};

export default function LoginScreen({ onLoginSuccess, redirectAfterLogin = "/profile" }: Props) {
  const [loginType, setLoginType] = useState<LoginType>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const nextPath = redirectAfterLogin;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });

      if (loginType === "admin" && res.role !== "admin") {
        setError("This account is not an admin account");
        setLoading(false);
        return;
      }
      if (loginType === "user" && res.role !== "student") {
        setError("This account is not a student account");
        setLoading(false);
        return;
      }
      if (loginType === "professor" && res.role !== "professor") {
        setError("This account is not a professor account");
        setLoading(false);
        return;
      }

      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("role", res.role);
      if (res.name) {
        localStorage.setItem("user_name", res.name);
      } else {
        const derived = email
          .split("@")[0]
          .replace(/[._]/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        localStorage.setItem("user_name", derived);
      }
      localStorage.setItem("user_email", res.email || email);

      onLoginSuccess?.();
      router.push(nextPath);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback for older browsers / insecure context
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed"; // avoid scrolling
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(key);

      setTimeout(() => {
        setCopied(null);
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const roleTabs: { id: LoginType; label: string }[] = [
    { id: "admin", label: "Management" },
    { id: "professor", label: "Professor" },
    { id: "user", label: "Student" },
  ];

  return (
    <LoginShell>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/mentor-logo.png"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-xl"
          />
          <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">Login to Mentor AI</h2>
          <p className="mt-2 text-sm text-slate-400">Pick up right where you left off.</p>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-1 rounded-xl bg-slate-800/80 p-1">
          {roleTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setLoginType(id);
                setError("");
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition sm:text-sm ${loginType === id
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          onClick={() => {
            /* OAuth placeholder */
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-slate-900/90 px-3 text-slate-500">or continue with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-medium text-sky-400 hover:text-sky-300"
                onClick={() => { }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <a href="/chat" className="font-semibold text-sky-400 hover:text-sky-300">
            Sign up free
          </a>
        </p>

        <div className="mt-8 rounded-lg border border-white/5 bg-slate-950/50 p-4 text-[11px] leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-400">Demo credentials</p>

          {/* Management */}
          <p className="mt-2 flex items-center gap-2">
            Management →
            <span className="flex items-center gap-1 font-mono text-slate-400">
              rg@gmail.com
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("rg@gmail.com", "admin-email")}
              >
                {copied === "admin-email" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
            /
            <span className="flex items-center gap-1 font-mono">
              admin123
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("admin123", "admin-pass")}
              >
                {copied === "admin-pass" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
          </p>

          {/* Professor */}
          <p className="mt-2 flex items-center gap-2">
            Professor →
            <span className="flex items-center gap-1 font-mono text-slate-400">
              sunilsharma@gmail.com
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("sunilsharma@gmail.com", "prof-email")}
              >
                {copied === "prof-email" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
            /
            <span className="flex items-center gap-1 font-mono">
              prof123
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("prof123", "prof-pass")}
              >
                {copied === "prof-pass" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
          </p>

          {/* Student */}
          <p className="mt-2 flex items-center gap-2">
            Student →
            <span className="flex items-center gap-1 font-mono text-slate-400">
              student@gmail.com
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("student@gmail.com", "student-email")}
              >
                {copied === "student-email" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
            /
            <span className="flex items-center gap-1 font-mono">
              student123
              <button
                className="text-slate-400 hover:text-white transition"
                onClick={() => handleCopy("student123", "student-pass")}
              >
                {copied === "student-pass" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
          </p>
        </div>
      </div>
    </LoginShell>
  );
}
