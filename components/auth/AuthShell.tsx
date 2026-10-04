import Link from "next/link";

export const authInputClass = "w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-neutral-950 outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 dark:border-[#d4af37]/30 dark:bg-[#1c160f] dark:text-[#fff7e6]";
export const authButtonClass = "w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-3 text-sm font-black text-black transition hover:from-yellow-300 disabled:cursor-not-allowed disabled:opacity-60";

export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4 py-10 dark:bg-[#0f0b07]">
    <div className="w-full max-w-lg space-y-6 rounded-3xl border border-yellow-300/70 bg-white p-8 shadow-[0_24px_80px_rgba(234,179,8,0.18)] dark:border-[#d4af37]/30 dark:bg-[#15100b] dark:text-[#fff7e6]">
      <Link href="/" className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-600">GOSH PERFUME</Link>
      <h1 className="text-3xl font-black">{title}</h1>
      {children}
    </div>
  </main>;
}
