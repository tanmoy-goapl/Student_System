"use client";

import { useState } from "react";
import { login } from "@/lib/api";

type Props = {
  onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("role", res.role);
      onLoginSuccess?.();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center mb-8">Student System</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-1 font-medium text-gray-700">Password</label>
            <input
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">Default credentials:</p>
            <p>
              Student →{" "}
              <span className="font-mono">student@example.com</span> /{" "}
              <span className="font-mono">student123</span>
            </p>
            <p>
              Admin &nbsp;&nbsp;→{" "}
              <span className="font-mono">admin@example.com</span> /{" "}
              <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

