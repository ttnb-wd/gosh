export default function StudioLoading({ label = "Loading…", grid = false }: { label?: string; grid?: boolean }) {
  return <div role="status" aria-live="polite" className="py-8">
    <div className="mb-6 flex items-center justify-center gap-3 text-xs text-muted"><span className="studio-spinner" aria-hidden="true" />{label}</div>
    {grid && <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(index => <div key={index} className="rounded-xl border border-line bg-surface p-3"><div className="studio-skeleton aspect-[3/4]" /><div className="studio-skeleton mt-4 h-3 w-3/4" /><div className="studio-skeleton mt-3 h-2 w-1/2" /></div>)}</div>}
  </div>;
}
