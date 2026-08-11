'use client';

import { useState } from 'react';
import { Search, Upload, Calendar } from 'lucide-react';

export type FilterType = 'All' | 'PDF' | 'DOC' | 'TXT';

type Props = {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onUpload: () => void;
};

const FILTERS: FilterType[] = ['All', 'PDF', 'DOC', 'TXT'];

export default function DocumentsHeader({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    onUpload,
}: Props) {
    return (
        <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-white/5 bg-[#090B1A]/80 backdrop-blur-xl sticky top-0 z-10">
            {/* Title */}
            <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white tracking-tight">Documents</h1>
                <p className="text-xs text-white/45 mt-0.5">Manage and interact with your learning materials</p>
            </div>

            {/* Search + Filters + Upload */}
            <div className="flex items-center gap-3 flex-1 justify-end">
                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition"
                    />
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-xl p-1">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => onFilterChange(filter)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                activeFilter === filter
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-white/55 hover:text-white/80 hover:bg-white/5'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Upload */}
                <button
                    onClick={onUpload}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
                >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                </button>
            </div>
        </header>
    );
}