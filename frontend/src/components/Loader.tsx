"use client";

import { Loader2 } from "lucide-react";

type LoaderProps = {
  size?: number;
  text?: string;
  fullScreen?: boolean;
};

export default function Loader({ size = 28, text, fullScreen }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-3">
      {/* Animated icon */}
      <Loader2
        size={size}
        className="animate-spin text-blue-400"
        strokeWidth={2.2}
      />

      {/* Optional text */}
      {text && (
        <p className="text-xs text-blue-200/70 tracking-wide">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080d19]/80 backdrop-blur-xl">
        {content}
      </div>
    );
  }

  return content;
}