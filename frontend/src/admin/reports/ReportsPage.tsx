"use client";

import React, { useState } from "react";
import { 
  FileText, Download, Calendar, Search, Sparkles, Filter, 
  RefreshCw, CheckCircle, Clock, AlertCircle, Play, Mail, FileSpreadsheet
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

interface GeneratedReport {
  id: string;
  name: string;
  type: "Academic" | "Placement" | "Faculty" | "System Audit";
  date: string;
  size: string;
  status: "Completed" | "Processing" | "Failed";
  generatedBy: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  recipients: string;
  nextRun: string;
  active: boolean;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("Academic");
  const [department, setDepartment] = useState("All");
  const [timeframe, setTimeframe] = useState("This Semester");
  const [format, setFormat] = useState("PDF");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([
    { id: "1", name: "CS_Dept_Semester_Performance_Report", type: "Academic", date: "2026-07-14", size: "2.4 MB", status: "Completed", generatedBy: "Dr. Arun Patel" },
    { id: "2", name: "Placement_Readiness_Mock_Interviews_Q2", type: "Placement", date: "2026-07-12", size: "4.1 MB", status: "Completed", generatedBy: "System Automator" },
    { id: "3", name: "Faculty_Evaluation_Assessment_Completion", type: "Faculty", date: "2026-07-10", size: "1.8 MB", status: "Completed", generatedBy: "Dr. Arun Patel" },
    { id: "4", name: "System_Access_Logs_Audit_July_Week1", type: "System Audit", date: "2026-07-07", size: "12.5 MB", status: "Completed", generatedBy: "Security Daemon" },
    { id: "5", name: "Math_Dept_Calculus_Weakness_DeepDive", type: "Academic", date: "2026-07-06", size: "840 KB", status: "Completed", generatedBy: "AI Engine" }
  ]);

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    { id: "1", name: "Weekly Faculty Delay Summary", frequency: "Weekly", recipients: "deans@university.edu", nextRun: "2026-07-20", active: true },
    { id: "2", name: "Monthly Placement Readiness Rollup", frequency: "Monthly", recipients: "placement-cell@university.edu", nextRun: "2026-08-01", active: true },
    { id: "3", name: "Daily Critical Dropout Alert Audit", frequency: "Daily", recipients: "arunpatel@university.edu", nextRun: "2026-07-15", active: false }
  ]);

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setGenerating(false);
            // Append new mock report
            const newReport: GeneratedReport = {
              id: String(Date.now()),
              name: `${department}_${reportType}_Report_${timeframe.replace(" ", "_")}`,
              type: reportType as any,
              date: new Date().toISOString().split('T')[0],
              size: "1.2 MB",
              status: "Completed",
              generatedBy: "Dr. Arun Patel"
            };
            setGeneratedReports(prevReports => [newReport, ...prevReports]);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const toggleSchedule = (id: string) => {
    setScheduledReports(prev => prev.map(sch => sch.id === id ? { ...sch, active: !sch.active } : sch));
  };

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Reports Studio</h1>
            <p className="text-[10px] text-slate-400">Generate, schedule, and export platform metrics</p>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-8 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          
          {/* Dashboard Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex items-center justify-between backdrop-blur-xl">
              <div>
                <span className="text-2xl font-extrabold text-white">42</span>
                <p className="text-xs font-bold text-slate-300 mt-1">Total Reports Generated</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Across this semester</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex items-center justify-between backdrop-blur-xl">
              <div>
                <span className="text-2xl font-extrabold text-violet-400">3</span>
                <p className="text-xs font-bold text-slate-300 mt-1">Active Scheduled Deliveries</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Automated email reporting</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex items-center justify-between backdrop-blur-xl">
              <div>
                <span className="text-2xl font-extrabold text-emerald-400">99.8%</span>
                <p className="text-xs font-bold text-slate-300 mt-1">Export Integrity Rate</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Reliable data validation check</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Report Generator Panel */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-4.5 h-4.5 text-violet-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Custom Report Generator</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Report Category</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Academic", "Placement", "Faculty", "System Audit"].map(tp => (
                    <button
                      key={tp}
                      onClick={() => setReportType(tp)}
                      className={`px-3 py-2 rounded-xl border text-[10px] font-bold text-left transition ${
                        reportType === tp 
                          ? "bg-violet-500/10 border-violet-500/40 text-violet-300" 
                          : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-xs focus:outline-none focus:border-violet-500/40 text-slate-350 font-semibold"
                >
                  <option value="All">All Departments</option>
                  <option value="Computer_Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Electronics">Electronics</option>
                </select>
              </div>

              {/* Timeframe selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-xs focus:outline-none focus:border-violet-500/40 text-slate-350 font-semibold"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="This Semester">This Semester</option>
                  <option value="Full Academic Year">Full Academic Year</option>
                </select>
              </div>

              {/* Format selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Format</label>
                <div className="flex gap-2">
                  {["PDF", "CSV", "Excel", "JSON"].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-extrabold transition ${
                        format === fmt 
                          ? "bg-violet-500/10 border-violet-500/40 text-violet-300" 
                          : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Progress or Run Button */}
            <div className="pt-4 flex items-center justify-between border-t border-white/5">
              <div className="flex-1 max-w-md">
                {generating && (
                  <div className="space-y-1.5 pr-6">
                    <div className="flex justify-between text-[10px] font-bold text-violet-400 uppercase">
                      <span>Assembling data modules...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                <span>{generating ? "Assembling..." : "Compile & Generate"}</span>
              </button>
            </div>
          </div>

          {/* Bottom Columns: Recent Generated Reports & Scheduled Deliveries */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Generated Archives (takes 2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Generated Archive</h3>
                <span className="text-[10px] text-slate-550 font-bold">5 Available</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-semibold text-slate-300">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                      <th className="pb-2.5">Name</th>
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5">Generated On</th>
                      <th className="pb-2.5">Size</th>
                      <th className="pb-2.5 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {generatedReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="py-3 font-bold text-white group-hover:text-violet-400 transition truncate max-w-[200px]">
                          {rep.name}
                        </td>
                        <td className="py-3">
                          <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-950 border border-white/5 font-extrabold tracking-wider">
                            {rep.type}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{rep.date}</td>
                        <td className="py-3 text-slate-500">{rep.size}</td>
                        <td className="py-3 text-right">
                          <button className="h-6 w-6 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/20 hover:bg-violet-500/10 flex items-center justify-center text-slate-300 hover:text-violet-400 transition ml-auto">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scheduled Deliveries (takes 1 col) */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Scheduled Deliveries</h3>
                <span className="text-[10px] text-slate-550 font-bold">Recurring</span>
              </div>

              <div className="space-y-3">
                {scheduledReports.map(sch => (
                  <div key={sch.id} className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col justify-between min-h-[100px] hover:border-white/10 transition">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-[11px] font-bold text-slate-200">{sch.name}</h4>
                        <span className="px-1 py-0.5 rounded bg-violet-500/15 text-violet-400 text-[8px] font-extrabold uppercase">
                          {sch.frequency}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500">Recipients: {sch.recipients}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 mt-2.5 border-t border-white/5">
                      <span className="text-[9px] text-slate-500">Next Run: {sch.nextRun}</span>
                      <button
                        onClick={() => toggleSchedule(sch.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition ${
                          sch.active 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25" 
                            : "bg-slate-800/40 border border-white/5 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {sch.active ? "Active" : "Paused"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
