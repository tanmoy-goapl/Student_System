'use client';

import { useState, useMemo, useEffect } from 'react';
import DocumentsHeader, { type FilterType } from '@/components/documentspage/DocumentsHeader';
import DocumentsSidebar from '@/components/documentspage/DocumentsSidebar';
import DocumentsMain from '@/components/documentspage/DocumentsMain';
import { getDocumentsData, DocumentsDataResponse } from '@/lib/api';

export default function DocumentsPage() {
    const [data, setData] = useState<DocumentsDataResponse | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getDocumentsData();
                setData(res);
            } catch (error) {
                console.error("Failed to load documents data:", error);
            }
        }
        fetchData();
    }, []);

    const filteredDocs = useMemo(() => {
        if (!data) return [];
        return data.documents.filter((doc: any) => {
            const matchesType =
                activeFilter === 'All' || activeFilter === 'Date'
                    ? true
                    : doc.type === activeFilter;

            const matchesSearch =
                searchQuery === '' ||
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.subject.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesWorkspace = (() => {
                if (!activeWorkspace) return true;
                const subjectMap: Record<string, string[]> = {
                    '1-1': ['Physics'],
                    '1-2': ['Chemistry'],
                    '1-3': ['Maths'],
                    '2': ['Resume', 'Interview'],
                    '3': ['Personal'],
                };
                const allowed = subjectMap[activeWorkspace];
                if (!allowed) return true;
                return allowed.some((s) => doc.subject.includes(s));
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
                onUpload={() => console.log('Upload clicked')}
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
                />
            </div>
        </div>
    );
}