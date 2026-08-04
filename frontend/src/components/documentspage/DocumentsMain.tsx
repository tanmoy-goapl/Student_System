'use client';

import { useState } from 'react';
import { 
  ArrowUpDown, CheckCircle, Clock, FileText, Trash2, 
  Eye, Download, Sparkles, X, AlertCircle, FileCode, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export type DocumentStatus = 'ready' | 'processing';

export type DocumentItem = {
    id: string;
    name: string;
    type: 'PDF' | 'DOC' | 'TXT' | 'MD';
    subject: string;
    subjectColor: string;
    pages: number;
    sizeMB: number;
    uploadedAt: string;
    status: DocumentStatus;
    documentType?: string;
    visibility?: string;
    filename?: string;
};

export type DocumentKPI = {
    id: string;
    value: string;
    label: string;
    color: string;
    iconType: string;
};

type Props = {
    documents: DocumentItem[];
    totalCount: number;
    kpis: DocumentKPI[];
    onDelete?: (id: string) => void;
};

// ── KPI icons ──────────────────────────────────────────────────────────────────

function KPIIcon({ type, color }: { type: string; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };

    return (
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorMap[color] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {type === 'docs' && <FileText className="h-4 w-4" />}
            {type === 'subjects' && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 7h10M7 12h10M7 17h6" />
                </svg>
            )}
            {type === 'processing' && <Clock className="h-4 w-4" />}
            {type === 'ai-ready' && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
            )}
        </div>
    );
}

// ── Document type badge ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DocumentItem['type'] }) {
    const styles: Record<string, string> = {
        PDF: 'bg-red-500/20 text-red-400 border-red-500/30',
        DOC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        TXT: 'bg-white/10 text-white/60 border-white/15',
    };
    return (
        <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded border ${styles[type]}`}>
            {type}
        </span>
    );
}

// ── Subject tag ────────────────────────────────────────────────────────────────

function SubjectTag({ subject, color }: { subject: string; color: string }) {
    const styles: Record<string, string> = {
        blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        orange: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
        violet: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    };
    return (
        <span className={`text-xs px-2.5 py-1 rounded-lg border ${styles[color] ?? 'bg-white/10 text-white/60 border-white/15'}`}>
            {subject}
        </span>
    );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentStatus }) {
    if (status === 'ready') {
        return (
            <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Ready</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs font-medium">Processing</span>
        </div>
    );
}

// ── File icon ──────────────────────────────────────────────────────────────────

function FileIcon({ type }: { type: DocumentItem['type'] }) {
    const bg: Record<string, string> = {
        PDF: 'bg-red-500/25',
        DOC: 'bg-blue-500/25',
        TXT: 'bg-white/10',
    };
    return (
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${bg[type]}`}>
            <FileText className="h-5 w-5 text-white/60" />
        </div>
    );
}

// ── Document Card ──────────────────────────────────────────────────────────────

function DocumentCard({ 
  doc, 
  onDelete,
  onPreview,
  onDownload,
  onAskAI
}: { 
  doc: DocumentItem; 
  onDelete?: (id: string) => void;
  onPreview: (doc: DocumentItem) => void;
  onDownload: (doc: DocumentItem) => void;
  onAskAI: (doc: DocumentItem) => void;
}) {
    return (
        <div 
          onClick={() => onPreview(doc)}
          className="group flex items-center justify-between gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 hover:border-white/15 hover:bg-white/[0.04] transition cursor-pointer"
        >
            <div className="flex items-center gap-5 min-w-0 flex-1">
                <FileIcon type={doc.type} />

                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate max-w-md">{doc.name}</span>
                        <TypeBadge type={doc.type} />
                        {doc.documentType && (
                            <span className="text-[0.6rem] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border bg-violet-500/10 text-violet-400 border-violet-500/20">
                                {doc.documentType}
                            </span>
                        )}
                        {doc.visibility && (
                            <span className={`text-[0.6rem] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                                doc.visibility === 'universal'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : doc.visibility === 'admin_shared'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                                {doc.visibility.replace('_', ' ')}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <SubjectTag subject={doc.subject} color={doc.subjectColor} />
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-xs text-white/40">{doc.pages} pages</span>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-xs text-white/40">{doc.sizeMB} MB</span>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-xs text-white/40">{doc.uploadedAt}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <StatusBadge status={doc.status} />

                {/* Ask AI button */}
                <button
                    onClick={() => onAskAI(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 hover:text-violet-200 border border-violet-500/20 text-xs font-semibold transition"
                    title="Ask AI about this document"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Ask AI</span>
                </button>

                {/* Download button */}
                <button
                    onClick={() => onDownload(doc)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition"
                    title="Download document"
                >
                    <Download className="h-4 w-4" />
                </button>

                {/* Delete button */}
                {onDelete && (
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this document?')) {
                                onDelete(doc.id);
                            }
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition border border-red-500/10"
                        title="Delete Document"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
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

export default function DocumentsMain({ documents, totalCount, kpis, onDelete }: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState(false);
    const [textError, setTextError] = useState<string | null>(null);
    const [isPreviewPdf, setIsPreviewPdf] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'universal' | 'private'>('universal');

    const cleanId = (id: string) => id.replace("db-", "");

    const handlePreview = (doc: any) => {
        setPreviewDoc(doc);
        setTextContent(null);
        setTextError(null);
        setIsPreviewPdf(false);
        setTextLoading(true);

        const cleanIdVal = cleanId(doc.id);
        fetch(`/api/documents/view?document_id=${cleanIdVal}`)
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

    const handleDownload = (doc: DocumentItem) => {
        const url = `/api/documents/view?document_id=${cleanId(doc.id)}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleAskAI = (doc: DocumentItem) => {
        localStorage.setItem("chat_input", `Summarize this document: "${doc.name}"`);
        const role = localStorage.getItem("role") || "student";
        if (role === "admin") {
            window.location.href = "/admin/chatbot";
        } else if (role === "professor") {
            window.location.href = "/professor/chatbot";
        } else {
            window.location.href = "/chat";
        }
    };

    const tabFilteredDocs = documents.filter((doc) => {
        if (activeTab === 'universal') {
            return doc.visibility === 'universal' || doc.visibility === 'course_shared' || doc.visibility === 'admin_shared';
        } else {
            return doc.visibility === 'private';
        }
    });

    return (
        <main className="flex-1 min-w-0 flex flex-col gap-5 px-6 py-5 overflow-y-auto">
            {/* KPI Row */}
            <div className="flex items-center gap-3">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.id}
                        className="flex flex-1 items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                    >
                        <KPIIcon type={kpi.iconType} color={kpi.color} />
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{kpi.value}</p>
                            <p className="text-[0.65rem] text-white/45 mt-0.5">{kpi.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 gap-2">
                <button
                    onClick={() => setActiveTab('universal')}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                        activeTab === 'universal'
                            ? 'border-blue-500 text-blue-400 font-bold bg-white/[0.02]'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Universal / Shared
                </button>
                <button
                    onClick={() => setActiveTab('private')}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                        activeTab === 'private'
                            ? 'border-blue-500 text-blue-400 font-bold bg-white/[0.02]'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    My Private Documents
                </button>
            </div>

            {/* Doc count + Sort */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">
                    <span className="text-white font-medium">{tabFilteredDocs.length}</span> documents found
                </p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/55 hover:text-white/80 hover:bg-white/5 transition">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort
                </button>
            </div>

            {/* Document list */}
            {tabFilteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <FileText className="h-12 w-12 text-white/20 mb-3" />
                    <p className="text-sm font-semibold text-white/60">No documents found</p>
                    <p className="text-xs text-white/30 mt-1 text-center">Upload files or sync with your classrooms to get started.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {tabFilteredDocs.map((doc) => (
                        <DocumentCard 
                          key={doc.id} 
                          doc={doc} 
                          onDelete={onDelete}
                          onPreview={handlePreview}
                          onDownload={handleDownload}
                          onAskAI={handleAskAI}
                        />
                      ))}
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-4xl h-[85vh] rounded-2xl border border-white/10 bg-[#0A0F1D] flex flex-col overflow-hidden text-white shadow-2xl">
                        
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-750 text-xs font-semibold transition"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Ask AI</span>
                                </button>
                                <button
                                    onClick={() => handleDownload(previewDoc)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 hover:text-white transition"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download</span>
                                </button>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-1.5 rounded-lg text-white/45 hover:bg-white/5 hover:text-white transition"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 overflow-auto bg-slate-950/20 p-6 flex items-center justify-center">
                            {(() => {
                                 if (textLoading) {
                                     return (
                                         <div className="flex flex-col items-center justify-center gap-3">
                                             <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                                             <span className="text-xs text-white/40">Reading file...</span>
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

                                 if (isPreviewPdf) {
                                     return (
                                         <iframe
                                             src={`/api/documents/view?document_id=${cleanId(previewDoc.id)}#toolbar=0`}
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
                                            className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-750 px-5 py-2.5 text-xs font-semibold transition shadow-lg shadow-violet-500/10"
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
        </main>
    );
}