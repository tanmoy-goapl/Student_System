"use client";

import AdminSidebar from "@/admin/components/AdminSidebar";
import ProfessorSidebar from "@/professor/components/ProfessorSidebar";
import Loader from "@/components/Loader";

export type DashboardRole = "admin" | "professor";

export function DashboardLoadingShell({
  role,
  text,
}: {
  role: DashboardRole;
  text: string;
}) {
  return (
    <div className="h-screen overflow-hidden bg-[#020617] text-white">
      <div className="flex h-full min-w-0">
        {role === "admin" ? <AdminSidebar /> : <ProfessorSidebar />}
        <main className="flex min-w-0 flex-1 items-center justify-center bg-gradient-to-b from-[#040815] to-[#020617]">
          <Loader size={32} text={text} />
        </main>
      </div>
    </div>
  );
}

export function DashboardContentLoader({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader size={32} text={text} />
    </div>
  );
}

export function InlineLoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader size={24} text={text} />
    </div>
  );
}

export function PageLoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#090D1F]">
      <Loader size={32} text={text} />
    </div>
  );
}
