"use client";
import { GradientText, Reveal } from "./ui/StudioMotion";
export default function BrandIntroduction() {
  return <section id="studio-introduction" aria-label="Brand introduction" className="studio-section studio-introduction"><div className="studio-container studio-intro-grid"><Reveal><p className="studio-eyebrow">01 / THE ART OF DISCOVERY</p><p className="studio-intro-aside">More than a fragrance.<br />A way to remember.</p></Reveal><Reveal delay={0.12}><h2 className="studio-display">For every mood.<br />For every <GradientText>version of you.</GradientText></h2><p className="studio-copy">Discover carefully sourced perfumes selected for elegance, quality, and authenticity. Every fragrance is reviewed before listing, so you can shop with confidence.</p><div className="studio-trust-row">{["Authentic products", "Trusted sources", "Quality checked"].map((text, i) => <span key={text}><small>0{i + 1}</small>{text}</span>)}</div></Reveal></div></section>;
}
