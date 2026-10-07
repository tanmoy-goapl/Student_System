export default function PersonalizationCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-violet-950/40 p-6 backdrop-blur-sm">
      
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_40%)]" />

      <div className="relative flex items-center justify-between">
        
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            AI Personalization Active
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Mentor AI adapts over time based on your usage patterns and preferences.
          </p>
        </div>

        <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
          Learning
        </div>
      </div>
    </div>
  );
}