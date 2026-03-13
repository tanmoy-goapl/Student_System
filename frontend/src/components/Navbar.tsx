"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [role, setRole] = useState<"admin" | "student" | null>(null);

  useEffect(() => {
    const updateRole = () => {
      const storedRole = localStorage.getItem("role") as "admin" | "student" | null;
      setRole(storedRole);
    };

    // Initial load
    updateRole();

    // Listen for storage changes (when user logs in/out)
    window.addEventListener("storage", updateRole);
    
    // Also check on pathname change (in case of same-tab navigation)
    updateRole();

    return () => {
      window.removeEventListener("storage", updateRole);
    };
  }, [pathname]);

  const navItems = [
    { id: "home", label: "HOME", path: "/" },
    { id: "dashboard", label: "DASHBOARD", path: "/dashboard" },
    { id: "profile", label: "PROFILE", path: "/profile" },
    // documents tab should only be visible after login (role is set)
    ...(role ? [{ id: "documents", label: "DOCUMENTS", path: "/documents" }] : []),
    { id: "chat", label: "CHAT", path: "/chat" },
    // { id: "integrations", label: "INTEGRATIONS", path: "/integrations" },
    // settings page should also only be visible after login
    ...(role ? [{ id: "settings", label: "SETTINGS", path: "/settings" }] : []),
  ];

  // Only add users page for admin - explicitly check role
  const filteredNavItems =
    role === "admin"
      ? [...navItems, { id: "users", label: "USERS", path: "/users" }]
      : navItems;

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="bg-blue-600 shadow-sm sticky top-0 z-30">
      <div className="max-w-full mx-auto px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-white mr-4"
          >
            Mentor AI
          </Link>
          {filteredNavItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive(item.path)
                  ? "text-white font-bold border-b-2 border-cyan-300 pb-1"
                  : "text-white hover:text-cyan-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="h-px bg-gray-300"></div>
    </header>
  );
}

