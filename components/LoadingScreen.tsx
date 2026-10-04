"use client";
export default function LoadingScreen() {
  return <div role="status" aria-live="polite" className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-canvas text-ink"><div className="flex flex-col items-center gap-5"><p className="studio-wordmark">GOSH<span>PERFUME STUDIO</span></p><span className="studio-spinner" aria-hidden="true" /><p className="text-xs text-muted">Preparing your studio…</p></div></div>;
}
