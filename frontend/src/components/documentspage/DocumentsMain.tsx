'use client';

import { ArrowUpDown, CheckCircle, Clock, FileText } from 'lucide-react';

export type DocumentStatus = 'ready' | 'processing';

export type DocumentItem = {
    id: string;
    name: string;
    type: 'PDF' | 'DOC' | 'TXT';
    subject: string;
    subjectColor: string;
    pages: number;
    sizeMB: number;
    uploadedAt: string;
    status: DocumentStatus;
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

function DocumentCard({ doc }: { doc: DocumentItem }) {
    return (
        <div className="group flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 hover:border-white/15 hover:bg-white/[0.04] transition cursor-pointer">
            <FileIcon type={doc.type} />

            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{doc.name}</span>
                    <TypeBadge type={doc.type} />
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

            <StatusBadge status={doc.status} />
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DocumentsMain({ documents, totalCount, kpis }: Props) {
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

                {/* AI Indexing Active pill */}
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex-shrink-0">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">AI Indexing Active</span>
                </div>
            </div>

            {/* Doc count + Sort */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">
                    <span className="text-white font-medium">{totalCount}</span> documents found
                </p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/55 hover:text-white/80 hover:bg-white/5 transition">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort
                </button>
            </div>

            {/* Document list */}
            <div className="space-y-2.5">
                {documents.map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                ))}
            </div>
        </main>
    );
}