"use client";

import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface NotesCardProps {
    notesResponse: any;
    showSummary?: boolean;
    setShowSummary?: (val: boolean) => void;
}

export default function NotesCard({ 
    notesResponse, 
    showSummary: propShowSummary, 
    setShowSummary: propSetShowSummary 
}: NotesCardProps) {
    const isLoading = !notesResponse.content || notesResponse.content.length === 0;
    const [localShowSummary, setLocalShowSummary] = useState(false);

    const showSummary = propShowSummary !== undefined ? propShowSummary : localShowSummary;
    const setShowSummary = propSetShowSummary !== undefined ? propSetShowSummary : setLocalShowSummary;

    return (
        <div className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-[#0c0c16] via-[#101126] to-[#111827] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-semibold tracking-tight flex items-center gap-2">
                    AI Summary
                </h3>
                <button 
                    onClick={() => setShowSummary(!showSummary)}
                    className="flex items-center gap-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-all text-indigo-400 hover:text-indigo-300"
                >
                    {showSummary ? "Hide Summary" : "View AI Summary"}
                </button>
            </div>
            
            {!showSummary ? (
                <div 
                    onClick={() => !isLoading && setShowSummary(true)}
                    className={`flex flex-col items-center justify-center py-8 px-4 text-center border border-white/10 bg-white/[0.02] rounded-xl transition-all ${!isLoading ? "cursor-pointer hover:bg-white/[0.04] hover:border-indigo-500/30" : "opacity-70"}`}
                >
                    <p className="text-slate-200 font-medium text-sm mb-1">
                        {isLoading ? "Generating AI Summary..." : "AI Summary Ready"}
                    </p>
                    <p className="text-slate-400 text-xs font-light">
                        {isLoading ? "Analyzing curriculum and study materials..." : "Click to view the high-yield study guide"}
                    </p>
                </div>
            ) : isLoading ? (
                <div className="space-y-3 py-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-white/5 rounded w-full"></div>
                    <div className="h-3 bg-white/5 rounded w-5/6"></div>
                    <div className="h-3 bg-white/5 rounded w-4/5"></div>
                    <p className="text-xs text-zinc-500 pt-3 italic font-light">Compiling study guide material...</p>
                </div>
            ) : typeof notesResponse.content === "string" ? (
                <div className="prose prose-invert prose-sm max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{notesResponse.content}</ReactMarkdown>
                </div>
            ) : (
                <div className="space-y-4">
                    {notesResponse.content.map((block: any, index: number) => {
                        switch (block.type) {
                            case "heading":
                                return (
                                    <h3
                                        key={index}
                                        className="text-white text-lg font-bold tracking-tight mt-6 first:mt-0"
                                    >
                                        {block.text}
                                    </h3>
                                );

                            case "paragraph":
                                return (
                                    <p
                                        key={index}
                                        className="text-sm font-normal text-zinc-300 leading-relaxed"
                                    >
                                        {block.text}
                                    </p>
                                );

                            case "highlight":
                                return (
                                    <div 
                                        key={index} 
                                        className="my-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"
                                    >
                                        {block.title && (
                                            <h4 className="text-sm font-semibold text-indigo-300 mb-1">
                                                {block.title}
                                            </h4>
                                        )}
                                        <p className="text-sm text-zinc-300 leading-relaxed">
                                            {block.text}
                                        </p>
                                    </div>
                                );

                            case "code_block":
                                return (
                                    <div
                                        key={index}
                                        className="my-4 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-500/10 font-mono"
                                    >
                                        {block.title && (
                                            <div className="border-b border-white/10 px-4 py-2 bg-white/5">
                                                <p className="text-xs text-zinc-300">
                                                    {block.title}
                                                </p>
                                            </div>
                                        )}

                                        <div className="p-4 overflow-x-auto">
                                            <pre>
                                                <code className="text-xs font-semibold text-white">
                                                    {block.code}
                                                </code>
                                            </pre>
                                        </div>
                                    </div>
                                );

                            case "note":
                                return (
                                    <div 
                                        key={index}
                                        className="my-4 border-l-2 border-zinc-500 pl-4"
                                    >
                                        <p className="text-sm italic leading-relaxed text-zinc-400">
                                            {block.text}
                                        </p>
                                    </div>
                                );

                            default:
                                return null;
                        }
                    })}
                </div>
            )}
        </div>
    );
}