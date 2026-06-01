'use client';

import { useState } from 'react';
import { Folder, FolderOpen, ChevronDown, Atom, FlaskConical, Calculator, Briefcase, BookOpen } from 'lucide-react';

export type WorkspaceChild = {
    id: string;
    name: string;
    count: number;
};

export type Workspace = {
    id: string;
    name: string;
    count: number;
    children: WorkspaceChild[];
};

type Props = {
    workspaces: Workspace[];
    activeWorkspace: string | null;
    onSelect: (id: string) => void;
};

const subjectIcons: Record<string, React.ElementType> = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Maths: Calculator,
};

const subjectColors: Record<string, string> = {
    Physics: 'text-blue-400',
    Chemistry: 'text-amber-400',
    Maths: 'text-emerald-400',
};

const workspaceColors: Record<string, string> = {
    'Studies': 'text-violet-400',
    'Resume & Interview': 'text-orange-400',
    'Personal Learning': 'text-cyan-400',
};

export default function DocumentsSidebar({ workspaces, activeWorkspace, onSelect }: Props) {
    const [expanded, setExpanded] = useState<string[]>(['1']);

    const toggleExpand = (id: string) => {
        setExpanded((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    return (
        <aside className="w-52 flex-shrink-0 border-r border-white/5 py-4 px-3 space-y-1">
            <p className="text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-white/35 px-2 mb-3">
                Workspaces
            </p>

            {workspaces.map((ws) => {
                const isExpanded = expanded.includes(ws.id);
                const FolderIcon = isExpanded ? FolderOpen : Folder;
                const color = workspaceColors[ws.name] ?? 'text-white/60';

                return (
                    <div key={ws.id}>
                        {/* Workspace row */}
                        <button
                            onClick={() => {
                                onSelect(ws.id);
                                if (ws.children.length > 0) toggleExpand(ws.id);
                            }}
                            className={`group w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm transition ${
                                activeWorkspace === ws.id
                                    ? 'bg-white/[0.07] text-white'
                                    : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <FolderIcon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                                <span className="text-xs font-medium truncate">{ws.name}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[0.6rem] text-white/35 bg-white/5 rounded px-1.5 py-0.5">
                                    {ws.count}
                                </span>
                                {ws.children.length > 0 && (
                                    <ChevronDown
                                        className={`h-3 w-3 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </div>
                        </button>

                        {/* Children */}
                        {isExpanded && ws.children.length > 0 && (
                            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
                                {ws.children.map((child) => {
                                    const SubIcon = subjectIcons[child.name];
                                    const subColor = subjectColors[child.name] ?? 'text-white/40';
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => onSelect(child.id)}
                                            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition ${
                                                activeWorkspace === child.id
                                                    ? 'bg-white/[0.07] text-white'
                                                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {SubIcon && <SubIcon className={`h-3.5 w-3.5 ${subColor}`} />}
                                                <span>{child.name}</span>
                                            </div>
                                            <span className="text-[0.6rem] text-white/30">{child.count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </aside>
    );
}