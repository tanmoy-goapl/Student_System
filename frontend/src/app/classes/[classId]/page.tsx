"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getClassDetails } from "@/lib/api";
import { ArrowLeft, Users, FileText, BarChart, BookOpen, CheckSquare, TrendingUp, ListTree } from "lucide-react";
import ResourcesTab from "@/components/classroom/ResourcesTab";
import CurriculumTab from "@/components/classroom/CurriculumTab";
import SubjectDashboard from "@/pages/SubjectDashboard/SubjectDashboard";
import Loader from "@/components/Loader";

export default function ClassDetailsPage() {
    const params = useParams<{ classId: string }>();
    const router = useRouter();
    const { role, userId, loading: authLoading } = useAuth();
    
    const [classDetails, setClassDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("resources");

    useEffect(() => {
        if (!authLoading && userId && params?.classId) {
            loadClassDetails();
        }
    }, [authLoading, userId, params?.classId]);

    const loadClassDetails = async () => {
        if (!userId || !params?.classId) return;
        setLoading(true);
        try {
            const res = await getClassDetails(parseInt(params!.classId as string, 10), parseInt(userId, 10));
            if (res.success) {
                setClassDetails(res);
            } else {
                router.push("/classes");
            }
        } catch (error) {
            console.error("Failed to load class details:", error);
            router.push("/classes");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <Loader fullScreen text="Loading class..." />;
    }

    if (!classDetails) {
        return null; // Will redirect
    }

    const professorTabs = [
        { id: "resources", label: "Resources", icon: FileText },
        { id: "curriculum", label: "Curriculum", icon: ListTree },
    ];

    const studentTabs = [
        { id: "curriculum", label: "Learning", icon: ListTree },
        { id: "resources", label: "Resources", icon: FileText },
    ];

    const tabs = role === "professor" ? professorTabs : studentTabs;

    if (role === "student") {
        return (
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white w-full purple-scrollbar">
                <SubjectDashboard 
                    subjectName={classDetails.name} 
                    classId={Number(params!.classId)}
                    hideBackButton={false} 
                    backRoute="/classes" 
                    backText="Back to Classes" 
                    source="classes"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden text-white w-full">
            {/* Header */}
            <div className="shrink-0 border-b border-white/10 p-6 bg-slate-900/50">
                <button 
                    onClick={() => {
                        if (role === "professor") {
                            router.push("/professor/classrooms");
                        } else {
                            router.push("/classes");
                        }
                    }}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Classes
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                            {classDetails.name}
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-sm font-mono tracking-wider border border-indigo-500/20">
                                {classDetails.code}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="shrink-0 border-b border-white/10 px-6 bg-slate-900/30">
                <div className="flex gap-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-all ${
                                    isActive 
                                        ? "border-indigo-500 text-indigo-400" 
                                        : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700"
                                }`}
                            >
                                <Icon size={18} />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 purple-scrollbar">
                <div className="max-w-5xl mx-auto">
                    {activeTab === "resources" && (
                        <ResourcesTab classId={Number(params!.classId)} role={role || "student"} userId={Number(userId || "0")} subjectName={classDetails.name} />
                    )}
                    {activeTab === "curriculum" && (
                        role === "professor" ? (
                            <CurriculumTab classId={Number(params!.classId)} role={role} userId={Number(userId || "0")} />
                        ) : (
                            <SubjectDashboard subjectName={classDetails.name} classId={Number(params!.classId)} hideBackButton={true} source="classes" />
                        )
                    )}
                    {activeTab !== "resources" && activeTab !== "curriculum" && (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-800/20 rounded-2xl border border-slate-700/30 border-dashed">
                            <BookOpen size={48} className="text-slate-600 mb-4" />
                            <h3 className="text-xl font-medium text-slate-300 mb-2">Coming Soon</h3>
                            <p className="text-slate-500">The {tabs.find(t => t.id === activeTab)?.label} section is under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
