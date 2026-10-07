export default function LoginChatPreview() {
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 text-center font-mono text-[10px] text-slate-500 sm:text-xs">
          mentor-ai · live session
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-white/10 bg-slate-800/90 px-3 py-2 text-xs text-slate-200">
            Summarize Chapter 3…
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-[10px] font-bold text-white">
            AI
          </div>
          <div className="min-w-0 rounded-2xl rounded-tl-sm border border-blue-500/20 bg-blue-950/40 px-3 py-2 text-xs leading-relaxed text-slate-300">
            Chapter 3 covers Quantum entanglement links particles so measuring one instantly affects the other—your
            notes on page 12 cover the formal definition.
          </div>
        </div>
      </div>
    </div>
  );
}
