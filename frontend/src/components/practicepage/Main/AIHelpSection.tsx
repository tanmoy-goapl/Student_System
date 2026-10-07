interface AIHelpSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmitQuery: (query: string) => void;
}

export default function AIHelpSection({
  query,
  onQueryChange,
  onSubmitQuery,
}: AIHelpSectionProps) {
  const handleSubmit = () => {
    if (query.trim()) {
      onSubmitQuery(query);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* AI Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <span className="text-lg">⚡</span>
        </div>

        {/* Input Group */}
        <div className="flex-1 flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
          <input
            type="text"
            value={query}
            onChange={(e) =>
              onQueryChange(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about this question... e.g. Why is path difference key here?"
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 outline-none text-sm"
          />
        </div>

        {/* Ask Button */}
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          className={`
            px-6 py-3 rounded-xl font-semibold transition-all duration-200
            flex items-center gap-2
            ${
              query.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          <span>✨</span>
          Ask
        </button>
      </div>
    </div>
  );
}