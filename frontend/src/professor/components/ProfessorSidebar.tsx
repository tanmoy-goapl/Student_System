"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, BookOpen, Users, FileText, ClipboardCheck, 
  BarChart3, Settings, ChevronLeft, ChevronRight, ChevronDown, Sparkles, MessageSquare, LogOut
} from "lucide-react";
import { prepareChatForLogout } from "@/components/ChatSessionProvider";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  inactiveCount: number;
  weakTopic?: string;
}

export default function ProfessorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeClass, setActiveClass] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesExpanded, setClassesExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  const [userName, setUserName] = useState("Dr. Sunil Sharma");
  const [userEmail, setUserEmail] = useState("sunilsharma@gmail.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("user_name") || "Dr. Sunil Sharma");
      setUserEmail(localStorage.getItem("user_email") || "sunilsharma@gmail.com");
      const saved = localStorage.getItem("professor_sidebar_collapsed");
      if (saved === "true") {
        setCollapsed(true);
      }
    }

    const fetchSidebarClasses = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const professorId = userId ? parseInt(userId, 10) : 1;
        const res = await fetch(`/api/classroom/my_classes/${professorId}`);
        if (!res.ok) throw new Error("Failed to load sidebar classes");
        const data = await res.json();
        const myClasses = data.classes || [];

        const mapped: ClassItem[] = myClasses.map((c: any) => {
          const nameLower = c.name.toLowerCase();
          let displayName = c.name;
          let displayCode = c.course_code || c.code;
          let weakTopic = "Deadlock Avoidance";
          let inactiveCount = 5;

          // Map real DB classes back to their original sidebar batch names
          if (c.id === 1 || nameLower.includes("machine learning")) {
            displayName = "CSE-5A";
            displayCode = "CS-501";
            weakTopic = "Deadlock Avoidance";
            inactiveCount = 5;
          } else if (c.id === 2 || nameLower.includes("ai")) {
            displayName = "CSE-5B";
            displayCode = "CS-501";
            weakTopic = "DBMS Normalization";
            inactiveCount = 2;
          } else if (c.id === 3 || nameLower.includes("operating system")) {
            displayName = "AIML-3A";
            displayCode = "AI-302";
            weakTopic = "Backpropagation";
            inactiveCount = 4;
          } else if (c.id === 4 || nameLower.includes("dsa")) {
            displayName = "ECE-7A";
            displayCode = "EC-701";
            weakTopic = "Signal Nyquist";
            inactiveCount = 3;
          }

          return {
            id: String(c.id),
            name: displayName,
            code: displayCode,
            studentCount: c.student_count || 0,
            inactiveCount,
            weakTopic
          };
        });

        setClasses(mapped);
        if (mapped.length > 0) {
          setActiveClass(mapped[0].id);
          setClassesExpanded({ [mapped[0].id]: true });
        }
      } catch (err) {
        console.error("Error fetching sidebar classes:", err);
      }
    };

    fetchSidebarClasses();
  }, []);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("professor_sidebar_collapsed", String(next));
  };

  const handleLogout = () => {
    prepareChatForLogout();
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/";
  };

  const navItems = [
    { label: "Home", path: "/professor", icon: Home },
    { label: "AI Chatbot", path: "/professor/chatbot", icon: MessageSquare },
    { label: "Document Management", path: "/professor/documents", icon: FileText },
    { label: "Classes", path: "/professor/classrooms", icon: BookOpen },
    { label: "Students", path: "/professor/students", icon: Users },
    { label: "Content Studio", path: "/professor/content", icon: FileText },
    // { label: "Assessments", path: "/professor/assessments", icon: ClipboardCheck },
    { label: "Insights", path: "/professor/insights", icon: BarChart3 },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const toggleClassExpand = (classId: string) => {
    setClassesExpanded(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className={`h-screen border-r border-white/5 bg-[#090D1F] flex flex-col justify-between select-none shrink-0 text-white font-sans transition-all duration-300 ${collapsed ? "w-20" : "w-56"}`}>
      {/* Fixed Logo Header */}
      <div className={`p-5 shrink-0 flex ${collapsed ? "flex-col items-center gap-3" : "items-center justify-between"}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-wider text-white">Mentor AI</h1>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">Teacher Studio</p>
            </div>
          )}
        </div>
        <button 
          onClick={handleToggle}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Scrollable Navigation & Class List */}
      <div className={`flex-1 overflow-y-auto purple-scrollbar px-5 pb-5 space-y-6 ${collapsed ? "scrollbar-none" : ""}`}>
        {/* Navigation Items */}
        <div>
          {!collapsed && (
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3 px-1">Navigation</h2>
          )}
          <nav className="space-y-1">
            {navItems.map(item => {
              const active = pathname === item.path || (item.path !== "/professor" && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.label}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition ${
                    collapsed ? "justify-center py-3 px-0 mx-auto w-12" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Classes Section - Only show when expanded */}
        {!collapsed && classes.length > 0 && (
          <>
            <div className="w-full h-px bg-white/5" />
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3 px-1">My Classes</h2>
              <div className="space-y-2">
                {classes.map(cls => {
                  const isSelected = activeClass === cls.id;
                  const isExpanded = !!classesExpanded[cls.id];
                  return (
                    <div key={cls.id} className="rounded-xl overflow-hidden transition-all duration-300">
                      <div
                        onClick={() => {
                          setActiveClass(cls.id);
                          toggleClassExpand(cls.id);
                          router.push(`/classes/${cls.id}`);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                          isSelected 
                            ? "bg-blue-600/10 border border-blue-500/20 text-white" 
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-blue-500" : "bg-white/20"}`} />
                          <div className="text-xs font-semibold">
                            <p className="leading-tight">{cls.name}</p>
                            <p className="text-[9px] text-white/40 font-normal">{cls.code} • {cls.studentCount} Students</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Profile */}
      <div className={`p-4 border-t border-white/5 bg-black/10 flex shrink-0 ${collapsed ? "flex-col items-center gap-4" : "items-center justify-between gap-3"}`}>
        <div className="flex items-center gap-2.5 truncate max-w-full">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)] shrink-0">
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div className="truncate">
              <h4 className="text-xs font-bold text-white leading-tight truncate">{userName}</h4>
              <p className="text-[9px] text-white/40 truncate">{userEmail}</p>
            </div>
          )}
        </div>
        <button 
          onClick={handleLogout}
          className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-450 hover:text-rose-400 transition shrink-0"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
