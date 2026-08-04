"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Upload, Sparkles, BookOpen, Clock, 
  TrendingUp, AlertTriangle, PlusCircle, CheckCircle, ChevronDown,
  Trash2, X, Loader2, Download, Eye, AlertCircle
} from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import ReactMarkdown from "react-markdown";
import {
  getMyClasses,
  getDocumentsData,
  deleteDocument,
  streamExplainSimpler,
  streamGiveExamples,
  streamGenerateMaterial
} from "@/lib/api";

interface MaterialItem {
  id: string;
  name: string;
  type: string;
  pages: number;
  sizeMB: number;
  uploadedAt: string;
  subject: string;
  category: string;
  visibility: string;
  classroom_id?: number | string;
}

const markdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 border-b border-white/10 pb-2 mb-4 tracking-tight mt-6" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-sm font-bold text-blue-300 mt-5 mb-3 tracking-wide" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-xs font-semibold text-slate-200 mt-4 mb-2" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-4 text-slate-350 text-[11px] leading-relaxed" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-[11px] text-slate-350" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-[11px] text-slate-350" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-1 text-slate-350" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-500 bg-blue-500/5 px-4 py-3 rounded-r-xl my-4 text-slate-300 italic text-[11px]" {...props} />,
  code: ({node, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <pre className="bg-[#0c1020] border border-white/10 p-3.5 rounded-xl font-mono text-[10px] text-blue-200 overflow-x-auto my-3">
        <code className={className} {...props}>{children}</code>
      </pre>
    ) : (
      <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-indigo-300 mx-0.5" {...props}>{children}</code>
    );
  },
  strong: ({node, ...props}: any) => <strong className="font-bold text-white" {...props} />
};

const parseAndRenderMarkdown = (text: string) => {
  if (!text) return null;
  
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentTableRows: string[][] = [];
  let currentTextBlock: string[] = [];

  const flushText = (key: string | number) => {
    if (currentTextBlock.length > 0) {
      elements.push(
        <ReactMarkdown 
          key={`text-${key}`}
          components={markdownComponents}
        >
          {currentTextBlock.join("\n")}
        </ReactMarkdown>
      );
      currentTextBlock = [];
    }
  };

  const flushTable = (key: string | number) => {
    if (currentTableRows.length > 0) {
      const rows = currentTableRows.filter(row => {
        const joined = row.join("").trim();
        return !/^[|\s-]+$/.test(joined) && joined.length > 0;
      });

      if (rows.length > 0) {
        const headers = rows[0];
        const bodyRows = rows.slice(1);
        
        elements.push(
          <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1220]/60 backdrop-blur-sm">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-b border-white/10 bg-blue-500/10 text-blue-300 font-bold">
                  {headers.map((h, i) => (
                    <th key={i} className="p-2.5 font-bold uppercase tracking-wider border-r border-white/5 last:border-0">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bodyRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2.5 text-slate-350 font-medium border-r border-white/5 last:border-0">
                        <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                          {cell.trim()}
                        </ReactMarkdown>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      currentTableRows = [];
    }
  };

  let elementKey = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      flushText(elementKey++);
      
      const cells = line.split("|").map(c => c.trim());
      if (line.startsWith("|")) cells.shift();
      if (line.endsWith("|")) cells.pop();
      
      currentTableRows.push(cells);
    } else {
      if (currentTableRows.length > 0) {
        flushTable(elementKey++);
      }
      currentTextBlock.push(lines[i]);
    }
  }
  
  flushText(elementKey++);
  flushTable(elementKey++);
  
  return <>{elements}</>;
};

export default function ContentPage() {
  const [userId, setUserId] = useState<number>(2); // Default professor user ID
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeClass, setActiveClass] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Computer Science");
  const [uploadClassId, setUploadClassId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // AI Stream Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState("");
  const [aiStreamText, setAiStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Generate Custom Study Material states
  const [showGenMaterialModal, setShowGenMaterialModal] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genSubject, setGenSubject] = useState("Computer Science");
  const [genClassId, setGenClassId] = useState("");
  const [isGeneratingMaterial, setIsGeneratingMaterial] = useState(false);

  // Document Preview Modal states
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState<boolean>(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isPreviewPdf, setIsPreviewPdf] = useState<boolean>(false);

  // Load user, classes, and materials on mount
  useEffect(() => {
    let uid = 2;
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("user_id");
      if (storedId) {
        uid = Number(storedId);
        setUserId(uid);
      }
    }
    loadData(uid);
  }, []);

  const loadData = async (uid: number) => {
    setIsLoading(true);
    try {
      // 1. Fetch classrooms taught by professor
      const classesRes = await getMyClasses(uid);
      if (classesRes && classesRes.success) {
        setClasses(classesRes.classes || []);
      }
      
      // 2. Fetch documents uploaded/available to professor
      const docsRes = await getDocumentsData(uid);
      if (docsRes && docsRes.documents) {
        setMaterials(docsRes.documents);
      }
    } catch (err) {
      console.error("Failed to load professor content page data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document deletion
  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;
    try {
      await deleteDocument(docId);
      setMaterials(prev => prev.filter(m => m.id !== docId));
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document");
    }
  };

  const handlePreview = (doc: any) => {
    setPreviewDoc(doc);
    setTextContent(null);
    setTextError(null);
    setIsPreviewPdf(false);
    setTextLoading(true);

    const cleanId = doc.id.replace("db-", "");
    fetch(`/api/documents/view?document_id=${cleanId}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load document");
            return res.text();
        })
        .then(text => {
            const isRealPdf = text.startsWith("%PDF-");
            if (isRealPdf) {
                setIsPreviewPdf(true);
            } else {
                setIsPreviewPdf(false);
                setTextContent(text);
            }
        })
        .catch(err => {
            setTextError(err.message || "Could not read document contents.");
        })
        .finally(() => {
            setTextLoading(false);
        });
  };

  const handleDownload = (doc: any) => {
    const cleanId = doc.id.replace("db-", "");
    const url = `/api/documents/view?document_id=${cleanId}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle document upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("user_id", String(userId));
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("subject", uploadSubject);
      formData.append("category", "Studies");
      formData.append("visibility", "course_shared");
      formData.append("document_type", "general");
      if (uploadClassId) {
        formData.append("classroom_id", uploadClassId);
      }
      formData.append("file", uploadFile);

      const res = await fetch("/api/upload/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");

      // Reset form and reload
      setUploadFile(null);
      setUploadTitle("");
      setUploadClassId("");
      setShowUploadModal(false);
      await loadData(userId);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger streaming AI actions
  const triggerAIAction = async (actionType: "simplify" | "summarize", docName: string) => {
    // Abort previous stream if active
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);

    setAiModalTitle(actionType === "simplify" ? `Simplifying Topic: ${docName}` : `Summarizing Chapter: ${docName}`);
    setAiStreamText("");
    setShowAIModal(true);
    setIsStreaming(true);

    try {
      const topicClean = docName.replace(/\.[^/.]+$/, ""); // Strip file extension
      
      if (actionType === "simplify") {
        await streamExplainSimpler(userId, topicClean, (text) => {
          setAiStreamText(text);
        }, controller.signal);
      } else {
        await streamGiveExamples(userId, topicClean, (text) => {
          setAiStreamText(text);
        }, controller.signal);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("AI Action stream error:", err);
        setAiStreamText("Error generating response. Please try again.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const closeAIModal = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setShowAIModal(false);
    setAiStreamText("");
  };

  // Generate Custom Study Material Action
  const handleGenerateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic.trim()) return;

    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);

    setAiModalTitle(`Generating Study Material: ${genTopic}`);
    setAiStreamText("");
    setShowGenMaterialModal(false);
    setShowAIModal(true);
    setIsStreaming(true);

    try {
      await streamGenerateMaterial(
        genTopic.trim(),
        genSubject,
        userId,
        (text) => {
          setAiStreamText(text);
        },
        controller.signal,
        genClassId || undefined
      );
      
      // Auto-reload the documents in the grid
      await loadData(userId);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Study Guide generation stream error:", err);
        setAiStreamText("Error generating study material. Please try again.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Filter materials based on search query and filter pills
  const filteredMaterials = materials.filter(mat => {
    // 1. Search Query filter
    const matchesSearch = mat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mat.subject.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Subject Filter
    if (activeSubject !== "All" && mat.subject.toLowerCase() !== activeSubject.toLowerCase()) {
      return false;
    }

    // 3. Class Filter
    if (activeClass !== "All") {
      const selectedClass = classes.find(c => String(c.id) === activeClass);
      if (selectedClass) {
        // Match by classroom ID if present, otherwise fallback to matching class name
        if (mat.classroom_id) {
          if (String(mat.classroom_id) !== activeClass) return false;
        } else {
          // If no classroom ID on document, see if subject/name matches class name
          const classClean = selectedClass.name.toLowerCase();
          if (!mat.subject.toLowerCase().includes(classClean) && !mat.name.toLowerCase().includes(classClean)) {
            return false;
          }
        }
      }
    }

    // 4. Type Filter
    if (activeType !== "All" && mat.type.toUpperCase() !== activeType.toUpperCase()) {
      return false;
    }

    // 5. Status Filter
    if (activeStatus !== "All") {
      if (activeStatus === "Processed" && mat.category !== "Studies") return false;
      if (activeStatus === "Pending" && mat.category === "Studies") return false;
    }

    return true;
  });

  // Calculate dynamic KPIs
  const totalMaterials = materials.length;
  const processedPercentage = totalMaterials > 0 
    ? Math.round((materials.filter(m => m.category === "Studies" || m.pages > 0).length / totalMaterials) * 100)
    : 100;
  const uniqueSubjects = Array.from(new Set(materials.map(m => m.subject.toLowerCase()))).length;

  const overviewCards = [
    {
      label: "Total Materials",
      value: String(totalMaterials),
      subtitle: `Across ${uniqueSubjects} Subjects`,
      icon: FileText,
      gradient: "from-blue-600 to-indigo-500",
    },
    {
      label: "AI Processed",
      value: `${processedPercentage}%`,
      subtitle: `${materials.filter(m => m.category === "Studies" || m.pages > 0).length} of ${totalMaterials} processed`,
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "My Classes Taught",
      value: String(classes.length),
      subtitle: "Active learning feeds",
      icon: CheckCircle,
      gradient: "from-indigo-600 to-purple-600",
    },
    {
      label: "Pending Processing",
      value: String(materials.filter(m => m.category !== "Studies").length),
      subtitle: "Queued for smart extraction",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
    },
  ];

  const aiActions = [
    { title: "Summarize Chapter", desc: "Extract key concepts and generate summaries", badge: "SUMMARY", color: "text-blue-400 border-blue-500/20 bg-blue-500/10", action: "summarize" },
    { title: "Simplify Topic", desc: "Break down complex topics into simple terms", badge: "EXPLAIN", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10", action: "simplify" },
  ];

  const recommendations = [
    { type: "CONTENT GENERATION", title: "Simplify Wave Optics", desc: "Automatically extract key topics and structure notes.", action: "simplify", docName: "Wave Optics Study Files.pdf" },
    { type: "CHAPTER SUMMARY", title: "Summarize Thermodynamics", desc: "Create a fast summary and key takeaways.", action: "summarize", docName: "Thermodynamics Guide.pdf" },
  ];

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Content Library</h1>
            <p className="text-[10px] text-slate-400">Manage and transform teaching materials with AI</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search across all files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 w-52"
              />
            </div>

            {/* Upload Material */}
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 hover:bg-white/10 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-300" />
              <span>Upload Material</span>
            </button>

            {/* Generate Material */}
            <button 
              onClick={() => setShowGenMaterialModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-xs font-bold transition shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Generate Study Material</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center flex-col gap-3 py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading classroom materials...</p>
            </div>
          ) : (
            <>
              {/* Overview Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {overviewCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl hover:border-white/10 transition duration-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-3xl font-extrabold text-white">{card.value}</span>
                          <p className="text-xs font-bold text-slate-300 mt-1">{card.label}</p>
                          <p className="text-[9px] text-slate-400/80 mt-0.5">{card.subtitle}</p>
                        </div>
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                          <Icon className="w-4.5 h-4.5 text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Content Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Content Actions</h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Powered by Academic Engine
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiActions.map((act, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        if (materials.length > 0) {
                          triggerAIAction(act.action as any, materials[0].name);
                        } else {
                          alert("Please upload a document to run AI actions.");
                        }
                      }}
                      className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 flex flex-col justify-between hover:border-blue-500/20 hover:bg-slate-900/35 transition cursor-pointer min-h-[110px]"
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="text-[12px] font-bold text-white">{act.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${act.color}`}>
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{act.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materials Library */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Materials Library</h2>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                      {filteredMaterials.length} Files
                    </span>
                  </div>
                </div>

                {filteredMaterials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-semibold">No materials match your filter settings</p>
                    <button 
                      onClick={() => { setActiveSubject("All"); setActiveClass("All"); setActiveType("All"); setActiveStatus("All"); setSearchQuery(""); }}
                      className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  /* Grid of Materials */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMaterials.map(mat => {
                      const classroom = classes.find(c => String(c.id) === String(mat.classroom_id));
                      return (
                        <div key={mat.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 flex flex-col justify-between min-h-[220px] backdrop-blur-sm group hover:border-blue-500/30 hover:bg-slate-900/60 transition duration-300 relative">
                          {/* Card Action Buttons (Hover State) */}
                          <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePreview(mat); }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition cursor-pointer"
                              title="View / Preview File"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDownload(mat); }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition cursor-pointer"
                              title="Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(mat.id, mat.name); }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 hover:border-rose-500/20 transition cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2.5 max-w-[85%]">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-4.5 h-4.5 text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">{mat.name}</h4>
                                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                    {mat.type} • {mat.pages} pages • {mat.sizeMB} MB
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300 text-[8px] font-bold">
                                {mat.subject}
                              </span>
                              {classroom && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold">
                                  Class: {classroom.name}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 text-[8px] font-bold">
                                Uploaded {mat.uploadedAt}
                              </span>
                            </div>

                            {/* Insight note */}
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[9px] flex items-center gap-2 text-slate-350 leading-snug">
                              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <p>Ready for AI synthesis. Tap buttons below to run explanations.</p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                            <button 
                              onClick={() => triggerAIAction("simplify", mat.name)}
                              className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white transition shadow shadow-blue-500/10 cursor-pointer"
                            >
                              Simplify
                            </button>
                            <button 
                              onClick={() => triggerAIAction("summarize", mat.name)}
                              className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                            >
                              Summarize
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Recommendations</h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> Based on Content Activity
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/40 p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition hover:border-white/10">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-violet-400 bg-violet-500/10 border border-violet-500/20">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">{rec.type}</span>
                          <h4 className="text-[11px] font-bold text-white mt-1 leading-snug">{rec.title}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{rec.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => triggerAIAction(rec.action as any, rec.docName)}
                        className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider transition self-end md:self-center shrink-0 cursor-pointer"
                      >
                        Generate Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter & Organize Section */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Filter & Organize Library</h3>
                <div className="space-y-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-16 block">Subject</span>
                    {["All", ...Array.from(new Set(materials.map(m => m.subject)))].map(sub => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubject(sub)}
                        className={`px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                          activeSubject === sub ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-16 block">Class</span>
                    <button
                      onClick={() => setActiveClass("All")}
                      className={`px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                        activeClass === "All" ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      All Classes
                    </button>
                    {classes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setActiveClass(String(c.id))}
                        className={`px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                          activeClass === String(c.id) ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-16 block">Type</span>
                    {["All", "PDF", "TXT", "DOC"].map(tp => (
                      <button
                        key={tp}
                        onClick={() => setActiveType(tp)}
                        className={`px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                          activeType === tp ? "bg-blue-500 border-blue-500 text-white" : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ─── UPLOAD DOCUMENT MODAL ────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white mb-4">Upload Course Material</h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Document Title</label>
                <input 
                  type="text" 
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Thermodynamics Lecture Slides"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                <input 
                  type="text" 
                  value={uploadSubject}
                  onChange={e => setUploadSubject(e.target.value)}
                  placeholder="e.g. Physics"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assign to Class (Optional)</label>
                <select
                  value={uploadClassId}
                  onChange={e => setUploadClassId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40"
                >
                  <option value="">Generic (No Classroom assignment)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select File</label>
                <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-white/20 transition relative">
                  <input 
                    type="file" 
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    required
                    accept=".pdf,.txt,.docx,.doc"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-300 font-semibold truncate">
                    {uploadFile ? uploadFile.name : "Drag & Drop or Click to browse"}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">PDF, TXT, DOCX up to 15MB</p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 border border-white/10 hover:bg-white/5 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-600/50 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Process</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AI ACTION STREAMING MODAL ────────────────────────── */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button 
              onClick={closeAIModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">{aiModalTitle}</h3>
              {isStreaming && (
                <span className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full animate-pulse">
                  Streaming...
                </span>
              )}
            </div>

            {/* Scrollable streaming contents */}
            <div className="flex-1 overflow-y-auto purple-scrollbar pr-1 bg-[#050914]/80 rounded-2xl p-6 border border-white/15 shadow-inner">
              {aiStreamText ? (
                <div className="text-xs leading-relaxed text-slate-250 max-w-none space-y-5 select-text selection:bg-blue-500/30">
                  {parseAndRenderMarkdown(aiStreamText)}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center py-20 flex-col gap-2">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <p className="text-[10px] text-slate-400">Initiating stream connection...</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button 
                onClick={closeAIModal}
                className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── GENERATE CUSTOM STUDY MATERIAL MODAL ─────────────── */}
      {showGenMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowGenMaterialModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white mb-4">Generate Study Material</h3>

            <form onSubmit={handleGenerateMaterialSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Topic Name</label>
                <input 
                  type="text" 
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="e.g. Memory Segmentation or Process Scheduling"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                <input 
                  type="text" 
                  value={genSubject}
                  onChange={e => setGenSubject(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assign to Class (Optional)</label>
                <select
                  value={genClassId}
                  onChange={e => setGenClassId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40"
                >
                  <option value="">Generic (No Classroom assignment)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowGenMaterialModal(false)}
                  className="flex-1 py-2 border border-white/10 hover:bg-white/5 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isGeneratingMaterial}
                  className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Generate Study Notes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DOCUMENT PREVIEW MODAL ─────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-[#090d16] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white max-w-[500px] truncate">
                    {previewDoc.name}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {previewDoc.pages} pages • {previewDoc.sizeMB} MB • uploaded {previewDoc.uploadedAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-white/10 hover:border-white/20 text-[10px] font-bold text-slate-300 rounded-xl transition cursor-pointer"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-slate-950/20 p-6 flex items-center justify-center">
              {(() => {
                if (textLoading) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      <span className="text-[10px] text-white/40">Reading file...</span>
                    </div>
                  );
                }
                if (textError) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-2 text-red-400">
                      <AlertCircle className="h-8 w-8" />
                      <span className="text-[10px]">{textError}</span>
                    </div>
                  );
                }

                if (isPreviewPdf) {
                  const cleanIdVal = previewDoc.id.replace("db-", "");
                  return (
                    <iframe
                      src={`/api/documents/view?document_id=${cleanIdVal}#toolbar=0`}
                      className="w-full h-full rounded-lg border border-white/5 bg-slate-900"
                    />
                  );
                }

                if (textContent !== null) {
                  return (
                    <div className="w-full h-full text-xs leading-relaxed text-slate-200 bg-slate-950 p-6 rounded-xl border border-white/5 overflow-auto select-text purple-scrollbar text-left max-w-none space-y-5">
                      {parseAndRenderMarkdown(textContent)}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <FileText className="h-16 w-16 text-slate-650 stroke-[1.2]" />
                    <div>
                      <p className="text-xs font-semibold">Preview not supported directly</p>
                      <p className="text-[10px] text-white/40 mt-1">
                        Please download this file to view its contents locally.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="px-6 py-4 border-t border-white/5 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
