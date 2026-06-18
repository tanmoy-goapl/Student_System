"use client";

export default function NotesCard({ notesResponse }: { notesResponse: any }) {
    const isLoading = !notesResponse.content || notesResponse.content.length === 0;

    return (
        <div className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-[#0c0c16] via-[#101126] to-[#111827] p-6 shadow-2xl backdrop-blur-xl">
            {isLoading ? (
                <div className="space-y-3 py-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-white/5 rounded w-full"></div>
                    <div className="h-3 bg-white/5 rounded w-5/6"></div>
                    <div className="h-3 bg-white/5 rounded w-4/5"></div>
                    <p className="text-xs text-zinc-500 pt-3 italic font-light">Compiling study guide material...</p>
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