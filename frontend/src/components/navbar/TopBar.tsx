"use client";

import { User, PanelRightOpen, PanelRightClose, BarChart3, Bell, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  rightOpen?: boolean;
  onRightOpenChange?: (open: boolean) => void;
}

export default function TopBar({ rightOpen = false, onRightOpenChange }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHomePage = pathname === "/" || pathname === "/courses" || pathname === "/personal";
  const isChatPage = pathname?.startsWith("/chat");

  const sourceParam = searchParams?.get("source");

  let selectedMode = "courses";
  if (pathname?.startsWith("/personal") || sourceParam === "personal") {
    selectedMode = "personal";
  } else if (pathname?.startsWith("/courses") || pathname === "/" || sourceParam === "courses") {
    selectedMode = "courses";
  }

  const { role } = useAuth();

  const showToggle = ["/", "/courses", "/personal", "/learning", "/practice"].some(
    p => pathname === p || pathname?.startsWith(p + "/")
  ) && sourceParam !== "classes";

  const getPageTitle = () => {
    if (pathname?.startsWith("/chat")) return "AI Chatbot";
    if (pathname?.startsWith("/classroom") || pathname?.startsWith("/classes") || sourceParam === "classes") return "My Classes";
    if (pathname?.startsWith("/documents")) return "My Documents";
    if (pathname?.startsWith("/performance")) return "Performance Analytics";
    if (pathname?.startsWith("/settings")) return "Settings";
    return "";
  };

  return (
    <div className="w-full h-full flex items-center justify-between px-6">
      {/* LEFT: Mode toggle (sliding pill selector) or Static Title */}
      <div className="flex-shrink-0">
        {role === "student" ? (
          showToggle ? (
            <div className="relative flex items-center bg-slate-900/60 border border-white/5 p-1 rounded-full w-52 h-9 shadow-inner select-none">
              {/* Sliding indicator */}
              <div
                className={`absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/10 transition-all duration-300 ease-out ${
                  selectedMode === "courses" ? "left-1 w-[96px]" : "left-[104px] w-[96px]"
                }`}
              />
              {/* Buttons */}
              <button
                onClick={() => {
                  if (pathname === "/personal" || pathname === "/courses" || pathname === "/") {
                    router.push("/courses");
                  } else {
                    const params = new URLSearchParams(searchParams?.toString() || "");
                    params.set("source", "courses");
                    params.delete("roadmap_id");
                    params.delete("topic");
                    params.delete("subject");
                    router.push(`${pathname}?${params.toString()}`);
                  }
                }}
                className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                  selectedMode === "courses" ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                Courses
              </button>
              <button
                onClick={() => {
                  if (pathname === "/personal" || pathname === "/courses" || pathname === "/") {
                    router.push("/personal");
                  } else {
                    const params = new URLSearchParams(searchParams?.toString() || "");
                    params.set("source", "personal");
                    params.delete("topic");
                    params.delete("subject");
                    router.push(`${pathname}?${params.toString()}`);
                  }
                }}
                className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                  selectedMode === "personal" ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                Personal
              </button>
            </div>
          ) : (
            <h2 className="text-white font-bold tracking-wider uppercase text-sm ml-2">{getPageTitle()}</h2>
          )
        ) : role === "professor" ? (
          <h2 className="text-white font-bold tracking-wider uppercase text-sm ml-2">My Classes</h2>
        ) : role === "admin" ? (
          <h2 className="text-white font-bold tracking-wider uppercase text-sm ml-2">Admin Portal</h2>
        ) : null}
      </div>

      {/* CENTER: Primary-focus Search bar (only on home page) */}
      <div className="flex-1 max-w-sm mx-8">
        {isHomePage && (
          <div className="relative group">
            <div className="flex items-center gap-2.5 bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-1.5 transition-all duration-200 focus-within:border-blue-500/40 focus-within:bg-slate-900/70 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:shadow-[0_0_12px_rgba(59,130,246,0.08)]">
              <Search className="w-3.5 h-3.5 text-white/30 group-focus-within:text-blue-400 transition-colors duration-200" />
              <input
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/20 focus:outline-none"
                placeholder="Search or Ask AI…"
              />
              <div className="flex items-center gap-0.5 pointer-events-none select-none">
                <span className="text-[9px] font-semibold text-white/25 bg-white/5 border border-white/5 px-1 py-0.5 rounded">⌘</span>
                <span className="text-[9px] font-semibold text-white/25 bg-white/5 border border-white/5 px-1 py-0.5 rounded">K</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Action Icons */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <Link href={role === "professor" ? "/professor?tab=analytics" : role === "admin" ? "/admin?tab=analytics" : "/analytics"} className="group relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/0 border border-transparent hover:bg-white/5 hover:border-white/5 hover:scale-105 active:scale-95 transition-all duration-200">
            <BarChart3 className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-200" />
          </div>
          {/* Tooltip */}
          <span className="pointer-events-none absolute top-full right-0 mt-2 z-[999] px-2 py-1 rounded-md bg-slate-950 border border-white/5 shadow-xl text-white text-[10px] font-medium whitespace-nowrap opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
            Analytics
          </span>
        </Link>

        {/* <button className="group relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/0 border border-transparent hover:bg-white/5 hover:border-white/5 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
            <Bell className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-200" />
          </div>
          <span className="pointer-events-none absolute top-full right-0 mt-2 z-[999] px-2 py-1 rounded-md bg-slate-950 border border-white/5 shadow-xl text-white text-[10px] font-medium whitespace-nowrap opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
            Notifications
          </span>
        </button> */}

        <Link href="/profile" className="group relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/0 border border-transparent hover:bg-white/5 hover:border-white/5 hover:scale-105 active:scale-95 transition-all duration-200">
            <User className="w-4 h-4 text-white/50 group-hover:text-white transition-colors duration-200" />
          </div>
          {/* Tooltip */}
          <span className="pointer-events-none absolute top-full right-0 mt-2 z-[999] px-2 py-1 rounded-md bg-slate-950 border border-white/5 shadow-xl text-white text-[10px] font-medium whitespace-nowrap opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
            Profile
          </span>
        </Link>

        {/* Insights button — only on chat page */}
        {isChatPage && (
          <button
            onClick={() => onRightOpenChange?.(!rightOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all duration-200 hover:scale-105 active:scale-95
              ${rightOpen
                ? "bg-blue-600/20 border-blue-500/40 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                : "bg-slate-900/60 border-white/5 text-white/50 hover:text-white hover:bg-white/5 hover:border-white/10"
              }`}
          >
            {rightOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span className="hidden sm:inline">{rightOpen ? "Close" : "Insights"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

