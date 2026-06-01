'use client';

import { useState, useMemo } from 'react';
import DocumentsHeader, { type FilterType } from '@/components/documentspage/DocumentsHeader';
import DocumentsSidebar from '@/components/documentspage/DocumentsSidebar';
import DocumentsMain from '@/components/documentspage/DocumentsMain';
import { WORKSPACES, DOCUMENTS } from '@/constants/documents-data';

export default function DocumentsPage() {
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);

    const filteredDocs = useMemo(() => {
        return DOCUMENTS.filter((doc) => {
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
    }, [activeFilter, searchQuery, activeWorkspace]);

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
                    workspaces={WORKSPACES}
                    activeWorkspace={activeWorkspace}
                    onSelect={(id) =>
                        setActiveWorkspace((prev) => (prev === id ? null : id))
                    }
                />

                <DocumentsMain
                    documents={filteredDocs}
                    totalCount={filteredDocs.length}
                />
            </div>
        </div>
    );
}