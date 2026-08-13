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
  isGenerating?: boolean;
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

function formatLatexToUnicode(text: string): string {
  if (!text) return text;
  
  let formatted = text;
  
  // 1. Replace block formulas \[ ... \] or [ \hat{y} ... ]
  formatted = formatted.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, formula) => `\n\n\`\`\`math\n${formula}\n\`\`\`\n\n`);
  formatted = formatted.replace(/\[\s*(\\hat[\s\S]*?)\s*\]/g, (_, formula) => `\n\n\`\`\`math\n${formula}\n\`\`\`\n\n`);
  
  // Clean up inline latex parens \( ... \)
  formatted = formatted.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, "$1");
  formatted = formatted.replace(/\\\(|\\\)/g, "");

  // 2. Replace common symbols
  const replacements: Record<string, string> = {
    "\\hat{y}": "ŷ",
    "\\hat{x}": "x̂",
    "\\beta_0": "β₀",
    "\\beta_1": "β₁",
    "\\beta_2": "β₂",
    "\\beta_p": "βₚ",
    "\\beta_i": "βᵢ",
    "\\beta": "β",
    "\\alpha": "α",
    "\\lambda": "λ",
    "\\sigma": "σ",
    "\\mu": "μ",
    "\\dots": "…",
    "\\cdots": "…",
    "\\times": "×",
    "\\cdot": "·",
    "\\le": "≤",
    "\\ge": "≥",
    "\\neq": "≠",
    "\\approx": "≈"
  };

  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    formatted = formatted.replace(new RegExp(escapedKey, 'g'), value);
  }

  // Replace remaining subscripts like _j, _k, _n etc
  formatted = formatted.replace(/_([0-9a-zₚᵢₙₖₓ])/g, (_, sub) => {
    const subMap: Record<string, string> = {
      "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
      "p": "ₚ", "i": "ᵢ", "n": "ₙ", "k": "ₖ", "x": "ₓ", "j": "ⱼ"
    };
    return subMap[sub] || `_${sub}`;
  });

  return formatted;
}

export default function NotesCard({ notesResponse, onRegenerate, isGenerating = false }: NotesCardProps) {
  const isLoading = !notesResponse.content || notesResponse.content.length === 0;

  // Custom renderer for markdown paragraphs to detect callouts (💡, ⚠️, 🎯, 📌)
  const renderParagraph = ({ children }: any) => {
    const childrenArray = React.Children.toArray(children);
    const firstChild = childrenArray[0];

    if (typeof firstChild === "string") {
      if (firstChild.startsWith("💡 Example:")) {
        return (
          <div className="my-4 flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sky-200 shadow-sm">
            <Lightbulb className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sky-300 block mb-0.5">Example</strong>
              <span className="text-zinc-300 text-sm">
                {firstChild.replace("💡 Example:", "").trim()}
                {childrenArray.slice(1)}
              </span>
            </div>
          </div>
        );
      }

      if (firstChild.startsWith("⚠️ Important:")) {
        return (
          <div className="my-4 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block mb-0.5">Important</strong>
              <span className="text-zinc-300 text-sm">
                {firstChild.replace("⚠️ Important:", "").trim()}
                {childrenArray.slice(1)}
              </span>
            </div>
          </div>
        );
      }

      if (firstChild.startsWith("🎯 Interview Tip:")) {
        return (
          <div className="my-4 flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-200 shadow-sm">
            <Target className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-300 block mb-0.5">Interview Tip</strong>
              <span className="text-zinc-300 text-sm">
                {firstChild.replace("🎯 Interview Tip:", "").trim()}
                {childrenArray.slice(1)}
              </span>
            </div>
          </div>
        );
      }

      if (firstChild.startsWith("📌 Remember:")) {
        return (
          <div className="my-4 flex gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-violet-200 shadow-sm">
            <Pin className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-violet-300 block mb-0.5">Remember</strong>
              <span className="text-zinc-300 text-sm">
                {firstChild.replace("📌 Remember:", "").trim()}
                {childrenArray.slice(1)}
              </span>
            </div>
          </div>
        );
      }
    }

    return <p className="text-zinc-300 text-sm leading-relaxed mb-4">{children}</p>;
  };

  // Custom Markdown Table parser/renderer
  const parseMarkdownTable = (tableLines: any[], key: any) => {
    const parseRow = (line: string) => {
      const parts = line.split("|").map(x => x.trim());
      if (parts[0] === "") parts.shift();
      if (parts[parts.length - 1] === "") parts.pop();
      return parts;
    };

    if (tableLines.length < 2) return null;

    // Header row
    const headers = parseRow(tableLines[0]);
    
    // Data rows (skip index 1 since it is the separator row like |---|---|)
    const rows = tableLines.slice(2).map((line: string) => parseRow(line));

    return (
      <div key={key} className="overflow-x-auto my-5 rounded-xl border border-white/10 bg-slate-950/20">
        <table className="min-w-full divide-y divide-white/10 text-xs text-zinc-300">
          <thead className="bg-white/[0.03]">
            <tr>
              {headers.map((h: string, i: number) => (
                <th key={i} className="px-4 py-3 text-left font-bold text-zinc-100 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row: string[], ri: number) => (
              <tr key={ri} className="hover:bg-white/[0.01] transition-colors">
                {row.map((cell: string, ci: number) => {
                  const cleanedCell = cell.replace(/<br\s*\/?>/gi, "\n");
                  return (
                    <td key={ci} className="px-4 py-3 whitespace-pre-wrap leading-relaxed">
                      {cleanedCell.split(/(\*\*.*?\*\*)/g).map((part: string, idx: number) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Renders text block or table block appropriately
  const renderMixedContent = (markdownText: string) => {
    const lines = markdownText.split("\n");
    const blocks: ({ type: "text"; content: string } | { type: "table"; lines: string[] })[] = [];
    let currentTextBlock: string[] = [];
    let currentTableBlock: string[] = [];

    const flushText = () => {
      if (currentTextBlock.length > 0) {
        blocks.push({ type: "text", content: currentTextBlock.join("\n") });
        currentTextBlock = [];
      }
    };

    const flushTable = () => {
      if (currentTableBlock.length > 0) {
        blocks.push({ type: "table", lines: [...currentTableBlock] });
        currentTableBlock = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const isTableLine = trimmed.startsWith("|");

      if (isTableLine) {
        flushText();
        currentTableBlock.push(line);
      } else {
        flushTable();
        currentTextBlock.push(line);
      }
    }
    flushText();
    flushTable();

    return (
      <>
        {blocks.map((block, idx) => {
          if (block.type === "table") {
            return parseMarkdownTable(block.lines, idx) || (
              <ReactMarkdown key={idx} components={{ p: renderParagraph }}>
                {block.lines.join("\n")}
              </ReactMarkdown>
            );
          } else {
            return (
              <ReactMarkdown key={idx} components={{ p: renderParagraph }}>
                {block.content}
              </ReactMarkdown>
            );
          }
        })}
      </>
    );
  };

  // Group markdown text dynamically into Collapsible sections based on H2s (##)
  const renderMarkdownContent = (markdown: string) => {
    // If not matching our expected H2 structure, render normally
    if (!markdown.includes("## ")) {
      return (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
          {renderMixedContent(markdown)}
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
            {renderMixedContent(sections[0].markdown)}
          </div>
        )}

        {/* Render Collapsible Sections for H2s */}
        {sections.map((sec, idx) => {
          if (sec.title === "Introduction") return null;
          return (
            <CollapsibleSection key={idx} title={sec.title}>
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-hr:border-white/5">
                {renderMixedContent(sec.markdown)}
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
        <div className="flex items-center gap-3">
          <h2 className="text-white text-md font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Interactive Study Guide</span>
          </h2>
          {!isLoading && isGenerating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold uppercase tracking-wider animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
              Generating
            </div>
          )}
        </div>
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
        renderMarkdownContent(
          formatLatexToUnicode(notesResponse.content + (isGenerating ? " ▋" : ""))
            .replace(/💡 Example:\s*\n+/g, "💡 Example: ")
            .replace(/⚠️ Important:\s*\n+/g, "⚠️ Important: ")
            .replace(/🎯 Interview Tip:\s*\n+/g, "🎯 Interview Tip: ")
            .replace(/📌 Remember:\s*\n+/g, "📌 Remember: ")
        )
      ) : (
        <div className="text-zinc-400 text-sm italic">Failed to format premium guide content.</div>
      )}
    </div>
  );
}