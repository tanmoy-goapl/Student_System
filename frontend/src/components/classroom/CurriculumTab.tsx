"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Book, RefreshCw, FileText, Play, CheckCircle, Zap } from "lucide-react";
import { getClassCurriculum, uploadClassCurriculum, regenerateClassCurriculum, updateClassCurriculum } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CurriculumTab({ classId, role, userId }: { classId: number; role: string; userId: number }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    
    const [curriculum, setCurriculum] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCurriculum();
    }, [classId, userId]);

    const fetchCurriculum = async () => {
        setLoading(true);
        try {
            const res = await getClassCurriculum(classId, userId);
            if (res.success && res.curriculum) {
                setCurriculum(res.curriculum);
            } else {
                setCurriculum(null);
            }
        } catch (error) {
            console.error("Failed to fetch curriculum:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await uploadClassCurriculum(classId, file, userId);
            if (res.success && res.curriculum) {
                setCurriculum(res.curriculum);
            }
        } catch (error) {
            console.error("Failed to upload curriculum:", error);
            alert("Failed to extract curriculum from PDF. Ensure the file contains text.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const res = await regenerateClassCurriculum(classId, userId);
            if (res.success && res.curriculum) {
                setCurriculum(res.curriculum);
            }
        } catch (error) {
            console.error("Failed to regenerate:", error);
            alert("Failed to regenerate curriculum.");
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    if (!curriculum) {
        return (
            <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-12 text-center">
                <Book size={48} className="mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Curriculum Available</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    {role === "professor" 
                        ? "Upload a syllabus PDF to automatically extract the course units and topics using AI." 
                        : "Your professor hasn't generated the curriculum for this class yet."}
                </p>
                {role === "professor" && (
                    <div>
                        <input 
                            type="file" 
                            accept=".pdf,.txt" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleUpload} 
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Extracting with AI...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload Syllabus PDF
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{curriculum.subject_name || "Class Curriculum"}</h2>
                    <p className="text-slate-400 text-sm">AI extracted topics and learning paths</p>
                </div>
                {role === "professor" && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleRegenerate}
                            disabled={regenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl transition-colors font-medium text-sm border border-slate-700"
                        >
                            <RefreshCw size={16} className={regenerating ? "animate-spin" : ""} />
                            Regenerate
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {(curriculum.units || []).map((unit: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-white">{unit.title}</h3>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {(unit.topics || []).map((topic: string, tIdx: number) => (
                                <div key={tIdx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <span className="text-slate-300 font-medium">{topic}</span>
                                    </div>
                                    
                                    {role === "student" && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => router.push(`/learning?class_id=${classId}&topic=${encodeURIComponent(topic)}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Play size={14} /> Learn
                                            </button>
                                            <button 
                                                onClick={() => router.push(`/practice?class_id=${classId}&topic=${encodeURIComponent(topic)}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Zap size={14} /> Practice
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
