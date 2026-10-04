import Link from "next/link";
export const authInputClass = "studio-input w-full";
export const authButtonClass = "studio-button studio-button--primary w-full disabled:cursor-not-allowed disabled:opacity-60";
export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="studio-auth"><aside className="studio-auth-art" aria-hidden="true"><span className="studio-eyebrow">GOSH / PERFUME STUDIO</span><p>A scent.<br />A feeling.<br /><span className="studio-gradient">Only yours.</span></p><div className="studio-auth-orbit" /><span className="studio-auth-art-footer">THE ART OF FINDING YOURSELF</span></aside><div className="studio-auth-panel"><Link href="/" className="studio-wordmark">GOSH<span>PERFUME STUDIO</span></Link><p className="studio-eyebrow">YOUR PERSONAL GOSH EXPERIENCE</p><h1 className="studio-display">{title}</h1><div className="studio-auth-fields space-y-6">{children}</div><Link href="/" className="studio-auth-back">← Back to the studio</Link></div></main>;
}
