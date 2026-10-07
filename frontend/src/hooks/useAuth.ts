"use client";

import { useEffect, useState } from "react";

export type Role = "student" | "professor" | "admin" | null;

interface AuthState {
  role: Role;
  userId: string | null;
  userName: string | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    role: null,
    userId: null,
    userName: null,
    loading: true,
  });

  useEffect(() => {
    // In the future, this could be replaced with an API call (e.g. /me) or JWT decoding
    const checkAuth = () => {
      try {
        const storedRole = localStorage.getItem("role") as Role;
        const storedUserId = localStorage.getItem("user_id");
        const storedUserName = localStorage.getItem("user_name");
        
        setAuthState({
          role: storedRole || null,
          userId: storedUserId || null,
          userName: storedUserName || null,
          loading: false,
        });
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState({
          role: null,
          userId: null,
          userName: null,
          loading: false,
        });
      }
    };

    checkAuth();
    
    // Listen for storage changes across tabs
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  return authState;
}
