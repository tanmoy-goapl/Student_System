"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import { useRouter } from "next/navigation";

type LoginType = "admin" | "user" | "professor";

type Props = {
  onLoginSuccess?: () => void;
  redirectAfterLogin?: string;
};

export default function LoginForm({ onLoginSuccess, redirectAfterLogin }: Props) {
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });

      // Verify role matches selected login type
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

      // ── Store session ───────────────────────────────
      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("role", res.role);
      if (res.name) {
        localStorage.setItem("user_name", res.name);
      } else {
        // Fallback: derive name from email prefix
        const derived =
          email.split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
        localStorage.setItem("user_name", derived);
      }

      localStorage.setItem("user_email", res.email || email);

      onLoginSuccess?.();

      if (redirectAfterLogin) {
        router.push(redirectAfterLogin);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">

      {/* ── Tabs ───────────────────────────── */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">

          <button
            onClick={() => {
              setLoginType("admin");
              setError("");
            }}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${loginType === "admin"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Management Login
          </button>

                    <button
            onClick={() => {
              setLoginType("professor");
              setError("");
            }}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${loginType === "professor"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Professor Login
          </button>

          <button
            onClick={() => {
              setLoginType("user");
              setError("");
            }}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${loginType === "user"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Student Login
          </button>

        </div>
      </div>

      {/* ── Header Text ───────────────────── */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          {loginType === "admin" && "Admin access portal"}
          {loginType === "user" && "Student access portal"}
          {loginType === "professor" && "Professor access portal"}
        </p>
      </div>

      {/* ── Error ─────────────────────────── */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* ── Email ─────────────────────────── */}
      <div className="mb-4">
        <input
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
        />
      </div>

      {/* ── Password ──────────────────────── */}
      <div className="mb-6">
        <input
          type="password"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
        />
      </div>

      {/* ── Submit ───────────────────────── */}
      <button
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={handleLogin}
        disabled={loading || !email || !password}
      >
        {loading ? "Unlocking..." : "Unlock"}
      </button>

      {/* ── Default creds ─────────────────── */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
        <p className="font-semibold text-gray-600 mb-1">Default credentials:</p>
        <p>
          Management → <span className="font-mono">admin@example.com</span> /{" "}
          <span className="font-mono">admin123</span>
        </p>
        <p>
          Professor → <span className="font-mono">professor@gmail.com</span> /{" "}
          <span className="font-mono">professor123</span>
        </p>
        <p>
          Student → <span className="font-mono">student@example.com</span> /{" "}
          <span className="font-mono">student123</span>
        </p>
      </div>
    </div>
  );
}
