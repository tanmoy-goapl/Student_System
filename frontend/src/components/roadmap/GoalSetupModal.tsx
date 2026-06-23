'use client';
import { useState } from "react";

interface GoalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roadmapData: any) => void;
}

export default function GoalSetupModal({ isOpen, onClose, onSuccess }: GoalSetupModalProps) {
  const [goalType, setGoalType] = useState("internship");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const studentId = parseInt(localStorage.getItem("user_id") || "1", 10);
      
      // Step 1: Create Goal
      const goalRes = await fetch("/api/roadmap/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          goal_type: goalType,
          title: title,
          deadline: deadline || null
        })
      });
      const goalData = await goalRes.json();
      
      if (!goalData.success) throw new Error("Failed to create goal");

      // Step 2: Generate Roadmap
      const roadmapRes = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          goal_id: goalData.goal.id
        })
      });
      const roadmapData = await roadmapRes.json();
      
      if (roadmapData.success) {
        onSuccess(roadmapData);
        onClose();
      }
    } catch (error) {
      console.error("Error setting up goal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">Set Your Learning Goal</h2>
          <p className="text-sm text-slate-400 mb-6">Tell us what you want to achieve, and our AI will build a personalized roadmap for you.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Goal Category</label>
              <select 
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 text-white text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
              >
                <option value="internship">Crack an Internship/Job</option>
                <option value="semester_exam">Prepare for Semester Exams</option>
                <option value="weak_subject">Improve Weak Subject</option>
                <option value="custom">Learn a Custom Topic</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Specific Goal (e.g. Master Docker)</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Learn Full Stack Web Development"
                className="w-full bg-[#1e293b] border border-white/10 text-white text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deadline / Timeframe</label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full bg-[#1e293b] border border-white/10 text-white text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-6">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {isLoading ? "Generating Roadmap..." : "Generate AI Roadmap"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
