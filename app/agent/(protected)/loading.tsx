export default function AgentLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-pulse">
      
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-slate-800 rounded-lg mb-2"></div>
        <div className="h-4 w-64 bg-slate-800/50 rounded-lg"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-center gap-3">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            <div className="h-8 w-24 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-[400px] bg-slate-900 rounded-2xl border border-slate-800"></div>
        <div className="lg:col-span-2 h-[400px] bg-slate-900 rounded-2xl border border-slate-800"></div>
      </div>
    </div>
  );
}
