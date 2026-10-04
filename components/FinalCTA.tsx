"use client";
import { ArrowUpRight } from "lucide-react";
import { GradientText, Reveal } from "./ui/StudioMotion";
import { StudioLink } from "./ui/StudioButton";
export default function FinalCTA() {
  return <section aria-label="Shop now call to action" className="studio-section studio-final"><div className="studio-container"><Reveal><p className="studio-eyebrow">YOUR NEXT CHAPTER</p><h2 className="studio-display">Leave a little<br /><GradientText>of yourself.</GradientText></h2><div className="studio-final-bottom"><p className="studio-copy">Find your perfect scent in our curated collection of authentic, carefully sourced fragrances.</p><StudioLink href="/products">Explore all fragrances <ArrowUpRight size={20} /></StudioLink></div></Reveal></div><div className="studio-final-orbit" aria-hidden="true" /></section>;
}
