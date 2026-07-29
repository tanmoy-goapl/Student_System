"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Sparkles, 
  Lightbulb, 
  AlertTriangle, 
  Target, 
  Pin, 
  ChevronRight, 
  BookOpen,
  RotateCw
} from "lucide-react";

interface NotesCardProps {
  notesResponse: any;
  onRegenerate?: () => void;
}

// Custom Collapsible Section Component
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-white/10 rounded-xl bg-slate-950/40 overflow-hidden mb-5 transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border-b border-white/5 text-left"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-90" : ""
          }`}
        />
      </button>
      {isOpen && <div className="p-5 text-sm text-zinc-300 leading-relaxed space-y-4">{children}</div>}
    </div>
  );
}

export default function NotesCard({ notesResponse, onRegenerate }: NotesCardProps) {
  const isLoading = !notesResponse.content || notesResponse.content.length === 0;

  // Custom renderer for markdown paragraphs to detect callouts (💡, ⚠️, 🎯, 📌)
  const renderParagraph = ({ children }: any) => {
    const textContent = React.Children.toArray(children).join("");

    if (textContent.startsWith("💡 Example:")) {
      return (
        <div className="my-4 flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sky-200 shadow-sm">
          <Lightbulb className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-sky-300 block mb-0.5">Example</strong>
            <span className="text-zinc-300 text-sm">{textContent.replace("💡 Example:", "").trim()}</span>
          </div>
        </div>
      );
    }

    if (textContent.startsWith("⚠️ Important:")) {
      return (
        <div className="my-4 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 block mb-0.5">Important</strong>
            <span className="text-zinc-300 text-sm">{textContent.replace("⚠️ Important:", "").trim()}</span>
          </div>
        </div>
      );
    }

    if (textContent.startsWith("🎯 Interview Tip:")) {
      return (
        <div className="my-4 flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-200 shadow-sm">
          <Target className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-rose-300 block mb-0.5">Interview Tip</strong>
            <span className="text-zinc-300 text-sm">{textContent.replace("🎯 Interview Tip:", "").trim()}</span>
          </div>
        </div>
      );
    }

    if (textContent.startsWith("📌 Remember:")) {
      return (
        <div className="my-4 flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-200 shadow-sm">
          <Pin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <strong className="text-emerald-300 block mb-0.5">Remember</strong>
            <span className="text-zinc-300 text-sm">{textContent.replace("📌 Remember:", "").trim()}</span>
          </div>
        </div>
      );
    }

    return <p className="text-zinc-300 text-sm leading-relaxed mb-4">{children}</p>;
  };

  // Group markdown text dynamically into Collapsible sections based on H2s (##)
  const renderMarkdownContent = (markdown: string) => {
    // If not matching our expected H2 structure, render normally
    if (!markdown.includes("## ")) {
      return (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
          <ReactMarkdown
            components={{
              p: renderParagraph,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      );
    }

    const sections: { title: string; markdown: string }[] = [];
    let currentTitle = "Introduction";
    let currentLines: string[] = [];

    const lines = markdown.split("\n");
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentLines.length > 0 || currentTitle !== "Introduction") {
          sections.push({ title: currentTitle, markdown: currentLines.join("\n").trim() });
        }
        currentTitle = line.replace("## ", "").replace("---", "").trim();
        currentLines = [];
      } else {
        // Skip horizontal line divider inside sections to keep layout clean
        if (line.trim() !== "---") {
          currentLines.push(line);
        }
      }
    }
    if (currentLines.length > 0 || currentTitle !== "Introduction") {
      sections.push({ title: currentTitle, markdown: currentLines.join("\n").trim() });
    }

    return (
      <div className="space-y-4">
        {/* Render Intro section if any */}
        {sections[0]?.title === "Introduction" && sections[0].markdown && (
          <div className="prose prose-invert prose-sm max-w-none mb-6">
            <ReactMarkdown components={{ p: renderParagraph }}>
              {sections[0].markdown}
            </ReactMarkdown>
          </div>
        )}

        {/* Render Collapsible Sections for H2s */}
        {sections.map((sec, idx) => {
          if (sec.title === "Introduction") return null;
          return (
            <CollapsibleSection key={idx} title={sec.title}>
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                <ReactMarkdown components={{ p: renderParagraph }}>
                  {sec.markdown}
                </ReactMarkdown>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <h2 className="text-white text-md font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Interactive Study Guide</span>
        </h2>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition-all flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" />
              Regenerate
            </button>
          )}
          <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-medium">
            Premium Notes
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-4 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-white/5 rounded w-full"></div>
          <div className="h-3 bg-white/5 rounded w-5/6"></div>
          <div className="h-3 bg-white/5 rounded w-4/5"></div>
          <p className="text-xs text-zinc-500 pt-3 italic font-light">Synthesizing topic explanations...</p>
        </div>
      ) : typeof notesResponse.content === "string" ? (
        renderMarkdownContent(notesResponse.content)
      ) : (
        <div className="text-zinc-400 text-sm italic">Failed to format premium guide content.</div>
      )}
    </div>
  );
}