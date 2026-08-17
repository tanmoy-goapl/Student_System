"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import AdminSidebar from "@/admin/components/AdminSidebar";
import { DashboardLoadingShell } from "@/components/DashboardLoading";
import { 
  FileText, Plus, Trash2, Shield, Eye, Tags, Calendar, 
  Search, Upload, X, CheckCircle2, AlertCircle, Info, FolderOpen,
  Download, Sparkles, Loader2, FileCode
} from "lucide-react";
import { getDocumentsData, deleteDocument } from "@/lib/api";
import { getDocumentPreviewKind, getDocumentTextPreviewUrl, getDocumentViewUrl } from "@/lib/documentPreview";

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  subject: string;
  subjectColor: string;
  pages: number;
  sizeMB: number;
  uploadedAt: string;
  status: string;
  category: string;
  documentType: string;
  visibility: string;
  filename?: string;
};

export default function AdminDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"universal" | "admin_shared" | "private">("universal");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload modal state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"universal" | "admin_shared" | "private">("universal");
  const [documentType, setDocumentType] = useState("policy");
  const [tags, setTags] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanId = (id: string) => id.replace("db-", "");

  const fetchDocs = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const uid = userId ? parseInt(userId, 10) : 1;
      const res = await getDocumentsData(uid);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document and all its indexed chunks?")) return;
    try {
      const cleanIdVal = cleanId(docId);
      await deleteDocument(cleanIdVal);
      await fetchDocs();
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
      setTitle(nameWithoutExt);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!title.trim()) {
      setUploadError("Please enter a document title.");
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", "Studies");
    formData.append("subject", "Policy & Guidelines");
    
    const userId = localStorage.getItem("user_id") || "1";
    formData.append("student_id", userId);
    formData.append("user_id", userId);
    formData.append("owner_role", "admin");
    formData.append("visibility", visibility);
    formData.append("document_type", documentType);
    formData.append("tags", tags);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setFile(null);
        setTitle("");
        setTags("");
        setIsUploadOpen(false);
        fetchDocs();
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during upload.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePreview = (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setTextContent(null);
    setTextError(null);
    setTextLoading(false);

    if (getDocumentPreviewKind(doc) !== "text") return;

    setTextLoading(true);
    fetch(getDocumentTextPreviewUrl(doc.id))
            .then(res => {
                if (!res.ok) throw new Error("Failed to load text contents");
                return res.text();
            })
            .then(text => {
                setTextContent(text);
            })
            .catch(err => {
                setTextError(err.message || "Could not read text contents.");
            })
            .finally(() => {
                setTextLoading(false);
            });
  };

  const handleDownload = (doc: DocumentItem) => {
    const url = getDocumentViewUrl(doc.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAskAI = (doc: DocumentItem) => {
    localStorage.setItem("chat_input", `Summarize this document: "${doc.name}"`);
    window.location.href = "/admin/chatbot";
  };

  // Filter documents based on active tab and search
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesTab = doc.visibility === activeTab;
      const matchesSearch = 
        searchQuery === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.documentType || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [documents, activeTab, searchQuery]);

  if (loading) {
    return <DashboardLoadingShell role="admin" text="Loading document manager..." />;
  }

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto purple-scrollbar p-8 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Platform Document Center
              </h1>
              <p className="text-sm text-slate-400 mt-1">Configure systemic policies, handbooks, and administrative tools</p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-755 px-5 py-3 text-sm font-semibold transition shadow-lg shadow-violet-500/10 cursor-pointer self-start"
            >
              <Plus size={16} />
              <span>Upload Document</span>
            </button>
          </div>



          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex gap-2 bg-slate-900/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab("universal")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "universal" ? "bg-violet-600 text-white" : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <Eye size={14} />
                <span>Universal Documents</span>
              </button>
              <button
                onClick={() => setActiveTab("admin_shared")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "admin_shared" ? "bg-violet-600 text-white" : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <FileText size={14} />
                <span>Admin Shared</span>
              </button>
              <button
                onClick={() => setActiveTab("private")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "private" ? "bg-violet-600 text-white" : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <Shield size={14} />
                <span>Private</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

          {/* Documents Grid / Table */}
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
              <FolderOpen size={48} className="text-slate-600 stroke-[1.5]" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-350">No documents found</p>
                <p className="text-xs text-slate-500 mt-1">Upload a document to index it with MentorAI</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Visibility</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/[0.01] transition-colors">
                      <td 
                        onClick={() => handlePreview(doc)}
                        className="p-4 font-medium text-white max-w-xs truncate cursor-pointer hover:text-violet-300 transition"
                      >
                        {doc.name}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          doc.type === "PDF" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          doc.type === "DOC" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-white/5 text-slate-300 border-white/10"
                        }`}>
                          {doc.type}
                        </span>
                      </td>
                      <td className="p-4 capitalize">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Tags size={12} className="text-violet-400" />
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${
                          doc.visibility === "universal" ? "text-emerald-400" :
                          doc.visibility === "admin_shared" ? "text-blue-400" : "text-amber-400"
                        }`}>
                          {doc.visibility === "universal" ? <Eye size={12} /> :
                           doc.visibility === "admin_shared" ? <FileText size={12} /> : <Shield size={12} />}
                          <span className="capitalize">{doc.visibility.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {doc.uploadedAt}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAskAI(doc)}
                            className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition cursor-pointer"
                            title="Ask AI"
                          >
                            <Sparkles size={14} />
                          </button>
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition cursor-pointer"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Custom Admin Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0F1D] p-6 shadow-2xl text-white">
            <button
              onClick={() => setIsUploadOpen(false)}
              disabled={uploadLoading}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold">Admin Upload Portal</h2>
              <p className="text-xs text-white/45 mt-1">Configure systemic resources and custom administration materials</p>
            </div>

            {uploadSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                <p className="text-sm font-semibold">Metadata registered successfully!</p>
                <p className="text-xs text-white/45">Extracting and embedding document chunks...</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {uploadError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${
                    file ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.docx,.doc"
                    className="hidden"
                  />
                  <Upload className={`h-8 w-8 mb-2 ${file ? 'text-violet-400' : 'text-white/30'}`} />
                  {file ? (
                    <div className="text-center">
                      <p className="text-xs font-semibold max-w-[260px] truncate">{file.name}</p>
                      <p className="text-[10px] text-white/40 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-medium">Click to choose administrative document</p>
                      <p className="text-[10px] text-white/40 mt-1">PDF, DOCX, TXT up to 10MB</p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Document Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter custom title"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500/50 transition"
                  >
                    <option value="universal">Universal (Globally Visible to All)</option>
                    <option value="admin_shared">Admin Shared (Visible to All Admins Only)</option>
                    <option value="private">Private (Only You Can Access)</option>
                  </select>
                </div>

                {/* Document Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500/50 transition"
                  >
                    <option value="policy">Policy / Guideline</option>
                    <option value="handbook">Student Handbook</option>
                    <option value="curriculum">Institution Syllabus</option>
                    <option value="general">General Admin Info</option>
                  </select>
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. curfew, backlogs, rules"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition"
                  />
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    disabled={uploadLoading}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !file || !title.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-755 px-5 py-2.5 text-xs font-semibold transition shadow-lg shadow-violet-500/20 disabled:opacity-40"
                  >
                    {uploadLoading ? "Uploading..." : "Upload File"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-4xl h-[85vh] rounded-2xl border border-white/10 bg-[#0A0F1D] flex flex-col overflow-hidden text-white shadow-2xl animate-fade-in">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                      <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold truncate pr-4">{previewDoc.name}</h3>
                          <p className="text-xs text-white/40 mt-0.5">
                              {previewDoc.pages} pages · {previewDoc.sizeMB} MB · {previewDoc.uploadedAt}
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                          <button
                              onClick={() => handleAskAI(previewDoc)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-750 text-xs font-semibold transition cursor-pointer"
                          >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Ask AI</span>
                          </button>
                          <button
                              onClick={() => handleDownload(previewDoc)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                          >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                          </button>
                          <button
                              onClick={() => setPreviewDoc(null)}
                              className="p-1.5 rounded-lg text-white/45 hover:bg-white/5 hover:text-white transition cursor-pointer"
                          >
                              <X className="h-4 w-4" />
                          </button>
                      </div>
                  </div>

                  {/* Content Container */}
                  <div className="flex-1 overflow-auto bg-slate-950/20 p-6 flex items-center justify-center">
                      {(() => {
                          const previewKind = getDocumentPreviewKind(previewDoc);
                          
                          // 1. PDF Preview
                          if (previewKind === "pdf") {
                              return (
                                  <iframe
                                      src={getDocumentViewUrl(previewDoc.id) + "#toolbar=0"}
                                      className="w-full h-full rounded-lg border border-white/5 bg-slate-900"
                                  />
                              );
                          }
                          
                          // 2. Image Preview
                          if (previewKind === "image") {
                              return (
                                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                          src={getDocumentViewUrl(previewDoc.id)}
                                          alt={previewDoc.name}
                                          className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-lg border border-white/5"
                                      />
                                  </div>
                              );
                          }

                          // 3. Text/CSV/MD Preview
                          if (previewKind === "text") {
                              if (textLoading) {
                                  return (
                                      <div className="flex flex-col items-center justify-center gap-3">
                                          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                                          <span className="text-xs text-white/40">Reading text file...</span>
                                      </div>
                                  );
                              }
                              if (textError) {
                                  return (
                                      <div className="flex flex-col items-center justify-center gap-2 text-red-400">
                                          <AlertCircle className="h-8 w-8" />
                                          <span className="text-xs">{textError}</span>
                                      </div>
                                  );
                              }
                              return (
                                  <pre className="w-full h-full text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-950 p-6 rounded-xl border border-white/5 overflow-auto select-text purple-scrollbar">
                                      {textContent}
                                  </pre>
                              );
                          }

                          // 4. Fallback for Office Docs
                          return (
                              <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
                                  <FileCode className="h-16 w-16 text-slate-650 stroke-[1.2]" />
                                  <div>
                                      <p className="text-sm font-semibold">Preview not supported directly</p>
                                      <p className="text-xs text-white/40 mt-1">
                                          Word, PowerPoint, and Excel documents cannot be previewed in-browser. Please download the file to view its contents.
                                      </p>
                                  </div>
                                  <button
                                      onClick={() => handleDownload(previewDoc)}
                                      className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-755 px-5 py-2.5 text-xs font-semibold transition shadow-lg shadow-violet-500/10 cursor-pointer"
                                  >
                                      <Download className="h-4 w-4" />
                                      <span>Download File</span>
                                  </button>
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
