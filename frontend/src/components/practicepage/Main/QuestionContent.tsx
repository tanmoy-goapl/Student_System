import React from "react";
import { Question } from "@/constants/practicepage-data";
import { HelpCircle } from "lucide-react";

interface QuestionContentProps {
  question: Question;
}

function renderFormattedText(text: string): React.ReactNode {
  if (!text) return "";
  const regex = /(\*\*.*?\*\*|\*.*?\*|\`.*?\`)/g;
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 font-mono text-sm text-pink-400">{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </>
  );
}

export default function QuestionContent({
  question,
  }: QuestionContentProps) {
  return (
    <div className="bg-[#0e1330]/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Subtle top glowing line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <div className="flex items-start gap-4">
        {/* Question Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#5B5FFF]/15 border border-[#5B5FFF]/35 text-[#8F93FF] flex items-center justify-center shadow-lg shadow-[#5B5FFF]/10">
          <HelpCircle className="w-6 h-6 animate-pulse" />
        </div>

        {/* Question Text */}
        <div className="min-w-0 flex-1">
          <p className="text-base text-white leading-relaxed break-words whitespace-pre-wrap font-medium">
            {renderFormattedText(question.questionText)}
          </p>
        </div>
      </div>
    </div>
  );
}