"use client";

import { NOTES_RESPONSE } from "@/constants/learningpage-data";
import Image from "next/image";



export default function NotesCard() {
    return (
        <div className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-[#0c0c16] via-[#101126] to-[#111827] p-6 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
                <Image
                    src="/mentor-logo.png"
                    alt="Mentor AI"
                    width={28}
                    height={28}
                    className="rounded-xl"
                />

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-white">
                            {NOTES_RESPONSE.generatedBy}
                        </h2>

                        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    </div>

                    <p className="text-[0.6rem] text-zinc-400">{NOTES_RESPONSE.status}</p>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {NOTES_RESPONSE.content.map((block, index) => {
                    switch (block.type) {
                        case "heading":
                            return (
                                <h3
                                    key={index}
                                    className="text-white"
                                >
                                    <span className="font-bold">
                                        {block.text}
                                    </span>
                                </h3>
                            );

                        case "paragraph":
                            return (
                                <p
                                    key={index}
                                    className="text-sm font-extralight"
                                >
                                    {block.text}
                                </p>
                            );

                        case "highlight":
                            return (
                                <div key={index} className="ml-4">
                                    <h4 className="text-sm">{block.title}</h4>

                                    <p className="text-xs leading-6 text-zinc-200">
                                        {block.text}
                                    </p>
                                </div>
                            );

                        case "code_block":
                            return (
                                <div
                                    key={index}
                                    className="overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-500/10"
                                >
                                    <div className="border-b border-white/10 px-4 py-3">
                                        <p className="text-xs text-white">
                                            {block.title}
                                        </p>
                                    </div>

                                    <div className="p-4">
                                        <code className="text-xs font-bold text-white">
                                            {block.code}
                                        </code>
                                    </div>
                                </div>
                            );

                        case "note":
                            return (
                                <p
                                    key={index}
                                    className="text-sm italic leading-6 text-zinc-400"
                                >
                                    {block.text}
                                </p>
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
}