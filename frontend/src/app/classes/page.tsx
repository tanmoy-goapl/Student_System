"use client";

import { useEffect, useState } from "react";
import { DepartmentOption, getMyClasses, createClass, joinClass, deleteClassroom, listClassroomDepartments } from "@/lib/api";
import { PlusCircle, LogIn, Users, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function ClassesPage() {
    const { role, userId, loading: authLoading } = useAuth();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    
    const [newClassName, setNewClassName] = useState("");
    const [newCourseCode, setNewCourseCode] = useState("");
    const [newDepartment, setNewDepartment] = useState("CS");
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [joinCode, setJoinCode] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && userId) {
            loadClasses();
        }
    }, [authLoading, userId]);

    useEffect(() => {
        listClassroomDepartments(userId ? parseInt(userId, 10) : undefined)
            .then((rows) => {
                setDepartments(rows);
                if (rows.length > 0) setNewDepartment((current) => rows.some((row) => row.code === current) ? current : rows[0].code);
            })
            .catch(() => setDepartments([
                { id: "cs", code: "CS", name: "CS Department" },
                { id: "ai", code: "AI", name: "AI Department" },
            ]));
    }, []);

    const loadClasses = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await getMyClasses(parseInt(userId, 10));
            if (res.success) {
                setClasses(res.classes);
            }
        } catch (error) {
            console.error("Failed to load classes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim() || !newCourseCode.trim() || !userId) return;
        setActionLoading(true);
        try {
            const res = await createClass({ name: newClassName, course_code: newCourseCode, department: newDepartment, professor_id: parseInt(userId, 10) });
            if (res.success) {
                setShowCreateModal(false);
                setNewClassName("");
                setNewCourseCode("");
                setNewDepartment("CS");
                loadClasses();
            }
        } catch (error) {
            console.error("Failed to create class:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinClass = async () => {
        if (!joinCode.trim() || !userId) return;
        setActionLoading(true);
        try {
            const res = await joinClass({ code: joinCode.trim(), student_id: parseInt(userId, 10) });
            if (res.success) {
                setShowJoinModal(false);
                setJoinCode("");
                loadClasses();
            }
        } catch (error) {
            console.error("Failed to join class:", error);
            alert("Invalid class code or already joined.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClass = async (classId: number) => {
        if (!userId) return;
        setActionLoading(true);
        try {
            const res = await deleteClassroom(classId, parseInt(userId, 10));
            if (res.success) {
                loadClasses();
            } else {
                alert(res.message || "Failed to delete classroom.");
            }
        } catch (error) {
            console.error("Failed to delete classroom:", error);
            alert("An error occurred while deleting the classroom.");
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-8 text-slate-400">Loading classes...</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Classes</h1>
                    <p className="text-slate-400">
                        {role === "professor" ? "Manage your teaching classrooms" : "Classes you are enrolled in"}
                    </p>
                </div>
                
                {role === "professor" ? (
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
                    >
                        <PlusCircle size={20} />
                        <span>Create Class</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => setShowJoinModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
                    >
                        <LogIn size={20} />
                        <span>Join Class</span>
                    </button>
                )}
            </div>

            {classes.length === 0 ? (
                <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-slate-700/50">
                    <BookOpen size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No classes yet</h3>
                    <p className="text-slate-400">
                        {role === "professor" ? "Create your first class to get started." : "Join a class using a code provided by your professor."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls, idx) => (
                        <Link href={`/classes/${cls.id}`} key={idx}>
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/30 transition-colors h-full cursor-pointer">
                                <h3 className="text-xl font-semibold text-white mb-2">{cls.name} <span className="text-sm font-normal text-slate-400">({cls.course_code})</span></h3>
                                <span className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                                    {cls.department || "CS"} Department
                                </span>
                                
                                {role === "professor" ? (
                                    <div className="space-y-3 mt-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Join Code</span>
                                            <span className="px-2 py-1 bg-slate-900 rounded text-indigo-400 font-mono tracking-wider">{cls.code}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Students</span>
                                            <div className="flex items-center gap-1 text-slate-300">
                                                <Users size={14} />
                                                <span>{cls.student_count}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (confirm(`Are you sure you want to delete the class "${cls.name}"?`)) {
                                                    await handleDeleteClass(cls.id);
                                                }
                                            }}
                                            className="w-full mt-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition-colors border border-rose-500/20 flex justify-center items-center"
                                        >
                                            Delete Class
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 mt-4">
                                        <div className="text-sm text-slate-400">
                                            Professor: <span className="text-slate-300">{cls.professor_name}</span>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Joined: {new Date(cls.joined_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Create New Class</h2>
                        <input 
                            type="text" 
                            placeholder="Course Code (e.g. CS101)" 
                            value={newCourseCode}
                            onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-4 uppercase focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                            type="text" 
                            placeholder="Class Name (e.g. Intro to Computer Science)" 
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-indigo-500"
                        />
                        <select
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-indigo-500"
                        >
                            {departments.length === 0 && <option value="CS">CS Department</option>}
                            {departments.map((department) => (
                                <option key={department.code} value={department.code}>{department.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateClass}
                                disabled={actionLoading || !newClassName.trim() || !newCourseCode.trim()}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-colors"
                            >
                                {actionLoading ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Class Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Join Class</h2>
                        <input 
                            type="text" 
                            placeholder="Enter Class Code" 
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 font-mono tracking-widest uppercase focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowJoinModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleJoinClass}
                                disabled={actionLoading || !joinCode.trim()}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-colors"
                            >
                                {actionLoading ? "Joining..." : "Join"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
