"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, BarChart3, Briefcase, GraduationCap, 
  FileSpreadsheet, Settings, Sparkles, MessageSquare, LogOut
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("Management");
  const [userEmail, setUserEmail] = useState("rg@gmail.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("user_name") || "Management");
      setUserEmail(localStorage.getItem("user_email") || "rg@gmail.com");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/";
  };

  const navItems = [
    { label: "Home", path: "/admin", icon: Home },
    { label: "AI Chatbot", path: "/admin/chatbot", icon: MessageSquare },
    { label: "Document Management", path: "/admin/documents", icon: FileSpreadsheet },
    { label: "Users & Faculty", path: "/admin/users", icon: Users },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Placements", path: "/admin/placements", icon: Briefcase },
    { label: "Reports", path: "/admin/reports", icon: FileSpreadsheet },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="w-64 h-screen border-r border-white/5 bg-[#090D1F] flex flex-col justify-between select-none shrink-0 text-white font-sans">
      {/* Fixed Logo Header */}
      <div className="p-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white">Mentor AI</h1>
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest leading-none">Admin Studio</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto purple-scrollbar px-5 pb-5 space-y-6">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3 px-1">Navigation</h2>
          <nav className="space-y-1">
            {navItems.map(item => {
              const active = pathname === item.path || (item.path !== "/admin" && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.label}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-violet-600/20 to-indigo-650/10 text-white border border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.1)]"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-white/5 bg-black/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 truncate">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-650 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(139,92,246,0.15)] shrink-0">
            {getInitials(userName)}
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-white leading-tight truncate">{userName}</h4>
            <p className="text-[9px] text-white/40 truncate">{userEmail}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-400 transition shrink-0"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
