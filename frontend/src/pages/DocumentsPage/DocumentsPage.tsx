'use client';

import { useState, useMemo, useEffect } from 'react';
import DocumentsHeader, { type FilterType } from '@/components/documentspage/DocumentsHeader';
import DocumentsSidebar from '@/components/documentspage/DocumentsSidebar';
import DocumentsMain from '@/components/documentspage/DocumentsMain';
import UploadModal from '@/components/documentspage/UploadModal';
import { getDocumentsData, DocumentsDataResponse, deleteDocument } from '@/lib/api';

export default function DocumentsPage() {
    const [data, setData] = useState<DocumentsDataResponse | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const fetchDocs = async () => {
        try {
            const userId = localStorage.getItem("user_id");
            const sid = userId ? parseInt(userId, 10) : NaN;
            if (!Number.isInteger(sid) || sid <= 0) {
                setData(null);
                return;
            }
            const res = await getDocumentsData(sid);
            setData(res);
        } catch (error) {
            console.error("Failed to load documents data:", error);
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            const rawUserId = localStorage.getItem("user_id");
            const userId = rawUserId ? parseInt(rawUserId, 10) : NaN;
            if (!Number.isInteger(userId) || userId <= 0) {
                throw new Error("Session expired. Please log in again.");
            }
            await deleteDocument(docId, userId);
            await fetchDocs();
        } catch (error) {
            console.error("Failed to delete document:", error);
            alert("Failed to delete document: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const filteredDocs = useMemo(() => {
        if (!data) return [];
        return data.documents.filter((doc: any) => {
            const matchesType =
                (activeFilter as string) === 'All' || (activeFilter as string) === 'Date'
                    ? true
                    : doc.type === activeFilter;

            const matchesSearch =
                searchQuery === '' ||
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.subject.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesWorkspace = (() => {
                if (!activeWorkspace) return true;
                if (activeWorkspace === '1') return doc.category === 'Studies';
                if (activeWorkspace === '2') return doc.category === 'Resume & Interview';
                if (activeWorkspace === '3') return doc.category === 'Personal Learning';
                
                if (activeWorkspace.includes('::')) {
                    const [catId, subjectName] = activeWorkspace.split('::');
                    return (doc.subject || '').toLowerCase() === subjectName.toLowerCase();
                }
                return true;
            })();

            return matchesType && matchesSearch && matchesWorkspace;
        });
    }, [data, activeFilter, searchQuery, activeWorkspace]);

    if (!data) {
        return (
            <div className="flex flex-col h-[88vh] bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden space-y-4 animate-pulse p-4">
                <div className="h-16 bg-white/5 rounded-xl"></div>
                <div className="flex flex-1 gap-4">
                    <div className="w-[20vw] bg-white/5 rounded-xl"></div>
                    <div className="flex-1 bg-white/5 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[88vh] bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
            <DocumentsHeader
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onUpload={() => setIsUploadOpen(true)}
            />

            <div className="flex flex-1 overflow-hidden">
                <DocumentsSidebar
                    workspaces={data.workspaces}
                    activeWorkspace={activeWorkspace}
                    onSelect={(id) =>
                        setActiveWorkspace((prev) => (prev === id ? null : id))
                    }
                />

                <DocumentsMain
                    documents={filteredDocs}
                    totalCount={filteredDocs.length}
                    kpis={data.kpis}
                    onDelete={handleDelete}
                />
            </div>

            <UploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUploadSuccess={fetchDocs}
            />
        </div>
    );
}