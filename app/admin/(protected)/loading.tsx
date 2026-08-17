export default function AdminLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-pulse">
      
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-800 rounded-lg mb-2"></div>
          <div className="h-4 w-64 bg-slate-800/50 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-lg"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-center gap-3">
            <div className="h-4 w-24 bg-slate-800 rounded"></div>
            <div className="h-8 w-16 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden h-[400px]">
        <div className="bg-slate-800/50 h-14 border-b border-slate-800"></div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-full bg-slate-800/50 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
