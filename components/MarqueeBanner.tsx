"use client";
import { Sparkles } from "lucide-react";
export default function MarqueeBanner() {
  const messages = ["A scent. A feeling. Only yours.", "Carefully sourced fragrances", "Discover your signature", "GOSH Perfume Studio"];
  return <div className="studio-announcement" aria-label="Discover carefully sourced fragrances"><div className="studio-announcement-track" aria-hidden="true">{[0, 1].map(copy => <div className="studio-announcement-copy" key={copy}>{messages.map(text => <span key={text}><Sparkles size={11} />{text}</span>)}</div>)}</div></div>;
}
