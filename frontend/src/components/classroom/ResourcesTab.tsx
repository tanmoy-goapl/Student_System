"use client";

import { useState, useEffect, useRef } from "react";
import { PlusCircle, FileText, Download, Trash2, Calendar, File, RefreshCw, Users } from "lucide-react";
import { getClassResources, uploadClassResource, deleteClassResource } from "@/lib/api";

interface Resource {
    id: number;
    title: string;
    type: string;
    uploaded_at: string;
    uploaded_by_name: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    syllabus: { label: "Syllabus", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    notes: { label: "Notes", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    assignment: { label: "Assignment", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    pyq: { label: "Previous Year", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

export default function ResourcesTab({ classId, role, userId }: { classId: number; role: string; userId: number }) {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Upload Form State
    const [title, setTitle] = useState("");
    const [type, setType] = useState("notes");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchResources();
    }, [classId, userId]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const res = await getClassResources(classId, userId);
            if (res.success) {
                setResources(res.resources);
            }
        } catch (error) {
            console.error("Failed to fetch resources:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !title) return;

        setUploading(true);
        try {
            const res = await uploadClassResource(classId, selectedFile, title, type, userId);
            if (res.success) {
                setShowUploadModal(false);
                setTitle("");
                setSelectedFile(null);
                setType("notes");
                fetchResources();
            }
        } catch (error) {
            console.error("Failed to upload:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (resourceId: number) => {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        try {
            const res = await deleteClassResource(resourceId, userId);
            if (res.success) {
                setResources((prev) => prev.filter((r) => r.id !== resourceId));
            }
        } catch (error) {
            console.error("Failed to delete resource:", error);
        }
    };

    const handleDownload = (resourceId: number) => {
        // Open the download link directly
        window.open(`/api/classroom/resource/download/${resourceId}?user_id=${userId}`, "_blank");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Class Resources</h2>
                    <p className="text-slate-400 text-sm">Access learning materials, assignments, and past papers.</p>
                </div>
                {role === "professor" && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                        <PlusCircle size={18} />
                        Upload Resource
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
            ) : resources.length === 0 ? (
                <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-12 text-center">
                    <FileText size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No resources available</h3>
                    <p className="text-slate-500 text-sm">
                        {role === "professor" ? "Upload your first document to share with students." : "Your professor hasn't uploaded any resources yet."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((resource) => {
                        const typeCfg = TYPE_CONFIG[resource.type] || TYPE_CONFIG["notes"];
                        return (
                            <div key={resource.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/30 transition-colors flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${typeCfg.color}`}>
                                        {typeCfg.label}
                                    </span>
                                    {role === "professor" && (
                                        <button 
                                            onClick={() => handleDelete(resource.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                            title="Delete resource"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-white font-medium text-lg leading-tight mb-3 flex-1">{resource.title}</h3>
                                
                                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        <span>{new Date(resource.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users size={12} />
                                        <span>{resource.uploaded_by_name}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDownload(resource.id)}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-700/50 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Download size={16} />
                                    Download File
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && role === "professor" && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Upload New Resource</h2>
                        </div>
                        
                        <form onSubmit={handleUpload} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Resource Title</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Chapter 1: Processes" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Resource Type</label>
                                <select 
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                                >
                                    <option value="syllabus">Syllabus</option>
                                    <option value="notes">Notes</option>
                                    <option value="assignment">Assignment</option>
                                    <option value="pyq">Previous Year Paper</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">File</label>
                                <div 
                                    className="w-full border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setSelectedFile(e.target.files[0]);
                                            }
                                        }}
                                        required
                                    />
                                    <File className="mx-auto w-8 h-8 text-slate-500 mb-2" />
                                    {selectedFile ? (
                                        <p className="text-sm text-indigo-400 font-medium truncate">{selectedFile.name}</p>
                                    ) : (
                                        <p className="text-sm text-slate-400">Click to browse or drag and drop</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                                    disabled={uploading || !title || !selectedFile}
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        "Upload Resource"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
