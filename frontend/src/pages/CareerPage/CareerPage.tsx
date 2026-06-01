'use client';

import CareerKPICards from "@/components/careerpage/Main/CareerKPICards";

export default function CareerPage() {
    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4">
            <div className="flex-1 space-y-4">
                <CareerKPICards />
            </div>

            <div className="w-[20vw]">
                Sidebar
            </div>
        </div>
    );
}