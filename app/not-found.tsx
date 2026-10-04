import Link from "next/link";
export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink"><section className="max-w-md text-center"><p className="studio-eyebrow justify-center">GOSH · 404</p><h1 className="studio-display mt-6">A little off course.</h1><p className="my-6 text-sm leading-6 text-muted">This page is no longer here. Your next signature scent is waiting in the collection.</p><Link href="/products" className="studio-button studio-button--primary">Explore the collection</Link></section></main>;
}
