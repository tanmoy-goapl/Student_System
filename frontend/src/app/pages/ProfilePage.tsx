"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

const roleBadge: Record<string, string> = {
  admin:     "bg-violet-500/15 text-violet-300 border-violet-500/30",
  professor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  student:   "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

function Field({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <div
        className={`rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-200 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || <span className="text-slate-500">Not available</span>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({ userId: "", role: "", name: "", email: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role   = localStorage.getItem("role");
    const name   = localStorage.getItem("user_name");
    const email  = localStorage.getItem("user_email");
    const authenticated = !!userId && !!role;
    setIsAuthenticated(authenticated);
    setUserInfo({ userId: userId || "", role: role || "", name: name || "", email: email || "" });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    router.replace("/login?next=/profile");
  }, [ready, isAuthenticated, router]);

  if (!ready) return <Loader fullScreen text="Loading..." />;

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
        <p className="text-slate-400">Redirecting to login…</p>
      </div>
    );
  }

  const initials = userInfo.name
    ? userInfo.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : userInfo.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="mt-1 text-sm text-slate-400">Your account details</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">

        {/* Avatar + identity */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold capitalize text-white">
              {userInfo.name || "Unknown User"}
            </p>
            <span
              className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                roleBadge[userInfo.role] ?? "bg-slate-700 border-white/10 text-slate-300"
              }`}
            >
              {userInfo.role || "—"}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <Field label="Name"    value={userInfo.name}   capitalize />
          <Field label="Email"   value={userInfo.email}  />
          {/* <Field label="User ID" value={userInfo.userId} /> */}
          <Field label="Role"    value={userInfo.role}   capitalize />
        </div>

        {/* Logout */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("user_id");
              localStorage.removeItem("role");
              localStorage.removeItem("user_name");
              localStorage.removeItem("user_email");
              setIsAuthenticated(false);
              setUserInfo({ userId: "", role: "", name: "", email: "" });
              router.replace("/login?next=/profile");
            }}
            className="inline-flex items-center gap-2 rounded-xl cursor-pointer border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}