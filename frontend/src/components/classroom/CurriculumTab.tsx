"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Upload,
    Book,
    RefreshCw,
    Play,
    Zap,
    Sparkles,
    Plus,
    Trash2,
    Check,
    X,
} from "lucide-react";
import {
    getClassCurriculum,
    uploadClassCurriculum,
    generateClassCurriculum,
    updateClassCurriculum,
} from "@/lib/api";
import { useRouter } from "next/navigation";

interface CurriculumUnit {
    title: string;
    topics: string[];
}

interface CurriculumData {
    subject_name?: string;
    units: CurriculumUnit[];
}

const cloneCurriculum = (data: CurriculumData): CurriculumData => ({
    subject_name: data.subject_name || "",
    units: (data.units || []).map((unit) => ({
        title: unit.title || "",
        topics: [...(unit.topics || [])],
    })),
});

export default function CurriculumTab({ classId, role, userId }: { classId: number; role: string; userId: number }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
    const [draft, setDraft] = useState<CurriculumData | null>(null);
    const [editing, setEditing] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [description, setDescription] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCurriculum = useCallback(async () => {
        setLoading(true);
        setDraft(null);
        setEditing(false);
        setShowGenerator(false);
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
    }, [classId, userId]);

    useEffect(() => {
        fetchCurriculum();
    }, [fetchCurriculum]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await uploadClassCurriculum(classId, file, userId);
            if (!res.success || !res.curriculum) {
                throw new Error(res.error || "Failed to process the curriculum.");
            }
            setCurriculum(res.curriculum);
            setDraft(null);
            setEditing(false);
            setShowGenerator(false);
        } catch (error) {
            console.error("Failed to upload curriculum:", error);
            alert(error instanceof Error ? error.message : "Failed to replace curriculum. Ensure the file contains readable text.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleReplaceClick = () => {
        if (uploading) return;
        const confirmed = window.confirm(
            "Replace this class curriculum with a new syllabus? The current generated topics will be updated after the new file is processed."
        );
        if (confirmed) {
            fileInputRef.current?.click();
        }
    };

    const handleGenerate = async () => {
        if (role !== "professor") return;
        setGenerating(true);
        try {
            const res = await generateClassCurriculum(classId, description, userId);
            if (!res.success || !res.curriculum) {
                throw new Error(res.error || "AI did not return a curriculum draft.");
            }
            setDraft(cloneCurriculum(res.curriculum));
            setEditing(true);
            setShowGenerator(false);
        } catch (error) {
            console.error("Failed to generate curriculum draft:", error);
            alert(error instanceof Error ? error.message : "Failed to generate curriculum draft.");
        } finally {
            setGenerating(false);
        }
    };

    const startEditing = () => {
        const source = draft || curriculum;
        if (!source) return;
        setDraft(cloneCurriculum(source));
        setEditing(true);
    };

    const discardDraft = () => {
        setDraft(null);
        setEditing(false);
    };

    const handlePublish = async () => {
        if (!draft) return;

        const cleanedDraft: CurriculumData = {
            subject_name: draft.subject_name?.trim() || "Class Curriculum",
            units: draft.units
                .map((unit) => ({
                    title: unit.title.trim(),
                    topics: unit.topics.map((topic) => topic.trim()).filter(Boolean),
                }))
                .filter((unit) => unit.title && unit.topics.length > 0),
        };

        if (!cleanedDraft.units.length) {
            alert("Add at least one unit with one topic before publishing.");
            return;
        }

        setPublishing(true);
        try {
            const res = await updateClassCurriculum(classId, cleanedDraft, userId);
            if (!res.success || !res.curriculum) {
                throw new Error(res.error || "Failed to publish curriculum.");
            }
            setCurriculum(res.curriculum);
            setDraft(null);
            setEditing(false);
        } catch (error) {
            console.error("Failed to publish curriculum:", error);
            alert(error instanceof Error ? error.message : "Failed to publish curriculum.");
        } finally {
            setPublishing(false);
        }
    };

    const updateDraft = (update: (current: CurriculumData) => CurriculumData) => {
        setDraft((current) => (current ? update(current) : current));
    };

    const updateUnitTitle = (unitIndex: number, title: string) => {
        updateDraft((current) => {
            const units = [...current.units];
            units[unitIndex] = { ...units[unitIndex], title };
            return { ...current, units };
        });
    };

    const updateTopic = (unitIndex: number, topicIndex: number, topic: string) => {
        updateDraft((current) => {
            const units = [...current.units];
            const topics = [...units[unitIndex].topics];
            topics[topicIndex] = topic;
            units[unitIndex] = { ...units[unitIndex], topics };
            return { ...current, units };
        });
    };

    const addUnit = () => {
        updateDraft((current) => ({
            ...current,
            units: [...current.units, { title: `Unit ${current.units.length + 1}`, topics: ["New topic"] }],
        }));
    };

    const removeUnit = (unitIndex: number) => {
        updateDraft((current) => ({
            ...current,
            units: current.units.filter((_, index) => index !== unitIndex),
        }));
    };

    const addTopic = (unitIndex: number) => {
        updateDraft((current) => {
            const units = [...current.units];
            units[unitIndex] = {
                ...units[unitIndex],
                topics: [...units[unitIndex].topics, "New topic"],
            };
            return { ...current, units };
        });
    };

    const removeTopic = (unitIndex: number, topicIndex: number) => {
        updateDraft((current) => {
            const units = [...current.units];
            units[unitIndex] = {
                ...units[unitIndex],
                topics: units[unitIndex].topics.filter((_, index) => index !== topicIndex),
            };
            return { ...current, units };
        });
    };

    const syllabusInput = role === "professor" ? (
        <input
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
        />
    ) : null;

    const generationPanel = role === "professor" && (showGenerator || !curriculum) && !draft ? (
        <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Sparkles size={20} className="text-indigo-300 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-white">Generate AI Curriculum Draft</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Create a simple Units → Topics outline using the class details. You can edit it before publishing.
                        </p>
                    </div>
                </div>
                {curriculum && (
                    <button
                        type="button"
                        onClick={() => setShowGenerator(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Close generator"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional: describe the level, duration, or concepts the class should cover."
                className="w-full resize-none bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium"
                >
                    {generating ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            Generating draft...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Draft
                        </>
                    )}
                </button>
                <span className="text-xs text-slate-500">Nothing is published until you approve it.</span>
            </div>
        </div>
    ) : null;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    if (!curriculum && !draft) {
        return (
            <div className="space-y-4">
                {syllabusInput}
                {generationPanel}
                <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-8 text-center">
                    <Book size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No Published Curriculum</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                        {role === "professor"
                            ? "Generate an editable AI draft or upload a syllabus to create the class curriculum."
                            : "Your professor hasn't published a curriculum for this class yet."}
                    </p>
                    {role === "professor" && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium"
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Upload Syllabus Instead
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const visibleCurriculum = draft || curriculum;

    return (
        <div className="space-y-8">
            {syllabusInput}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{visibleCurriculum?.subject_name || "Class Curriculum"}</h2>
                    <p className="text-slate-400 text-sm">
                        {draft ? "Editable AI draft — not visible to students" : "Units and topics for this class"}
                    </p>
                </div>
                {role === "professor" && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {draft ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium"
                                >
                                    {publishing ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                                    {publishing ? "Publishing..." : "Publish to Class"}
                                </button>
                                <button
                                    type="button"
                                    onClick={discardDraft}
                                    disabled={publishing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium"
                                >
                                    <X size={16} />
                                    Discard Draft
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={startEditing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm font-medium"
                                >
                                    Edit Curriculum
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGenerator(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors text-sm font-medium"
                                >
                                    <Sparkles size={16} />
                                    Generate AI Draft
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleReplaceClick}
                            disabled={uploading || publishing}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium"
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Replace Curriculum
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {generationPanel}

            {draft && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                    <Sparkles size={16} />
                    This is an editable draft. Students will continue seeing the last published curriculum until you publish this one.
                </div>
            )}

            {editing && draft ? (
                <div className="space-y-5">
                    <div className="bg-slate-900 border border-indigo-400/30 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Edit Curriculum</h3>
                                <p className="text-sm text-slate-400">Keep the outline simple: units with topics underneath.</p>
                            </div>
                            <button type="button" onClick={addUnit} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 rounded-lg text-sm">
                                <Plus size={15} /> Add Unit
                            </button>
                        </div>
                        <input
                            value={draft.subject_name || ""}
                            onChange={(event) => setDraft({ ...draft, subject_name: event.target.value })}
                            placeholder="Curriculum subject name"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                        />
                    </div>

                    {draft.units.map((unit, unitIndex) => (
                        <div key={unitIndex} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    value={unit.title}
                                    onChange={(event) => updateUnitTitle(unitIndex, event.target.value)}
                                    placeholder={`Unit ${unitIndex + 1}`}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeUnit(unitIndex)}
                                    className="p-2.5 text-slate-500 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors"
                                    aria-label={`Remove ${unit.title || `unit ${unitIndex + 1}`}`}
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                            <div className="space-y-2 pl-2 sm:pl-5">
                                {unit.topics.map((topic, topicIndex) => (
                                    <div key={topicIndex} className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                        <input
                                            value={topic}
                                            onChange={(event) => updateTopic(unitIndex, topicIndex, event.target.value)}
                                            placeholder="Topic"
                                            className="flex-1 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeTopic(unitIndex, topicIndex)}
                                            className="p-2 text-slate-500 hover:text-rose-300 transition-colors"
                                            aria-label="Remove topic"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addTopic(unitIndex)}
                                    className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200 pt-1"
                                >
                                    <Plus size={14} /> Add topic
                                </button>
                            </div>
                        </div>
                    ))}

                    {!draft.units.length && (
                        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-400">
                            Add a unit to start building the curriculum.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleCurriculum?.units.map((unit, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800">
                                <h3 className="font-semibold text-lg text-white">{unit.title}</h3>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {(unit.topics || []).map((topic: string, topicIndex: number) => (
                                    <div key={topicIndex} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="text-slate-300 font-medium">{topic}</span>
                                        </div>
                                        {role === "student" && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/learning?class_id=${classId}&topic=${encodeURIComponent(topic)}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    <Play size={14} /> Learn
                                                </button>
                                                <button
                                                    type="button"
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
            )}
        </div>
    );
}
