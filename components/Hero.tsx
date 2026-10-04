"use client";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GradientText } from "./ui/StudioMotion";
import { StudioLink } from "./ui/StudioButton";

export default function Hero() {
  const reduced = useReducedMotion();
  const entrance = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
  return <section id="home" aria-label="GOSH fragrance studio" className="studio-hero">
    <div className="studio-hero-halo" aria-hidden="true" /><div className="studio-hero-grid" aria-hidden="true" />
    <motion.div className="studio-hero-content" initial={reduced ? false : "hidden"} animate="visible" transition={{ staggerChildren: 0.13, delayChildren: 0.1 }}>
      <motion.p variants={entrance} className="studio-eyebrow"><span className="studio-dot" /> GOSH PERFUME STUDIO <span className="studio-hero-edition">THE FRAGRANCE EDIT</span></motion.p>
      <motion.h1 variants={entrance} className="studio-hero-title">A scent.<br /><span className="studio-hero-title-second">A <GradientText>feeling.</GradientText></span><br /><span className="studio-hero-title-third">Only yours.</span></motion.h1>
      <motion.div variants={entrance} className="studio-hero-bottom"><p>Fragrance is personal. Discover a considered collection of authentic perfumes, chosen to become a part of your story.</p><div className="studio-hero-actions"><StudioLink href="/products">Discover the collection <ArrowUpRight size={18} /></StudioLink><StudioLink href="/products" variant="secondary">Explore your scent <ArrowUpRight size={18} /></StudioLink></div></motion.div>
    </motion.div>
    <div className="studio-fragrance-art" aria-hidden="true">
      <span className="studio-art-caption">AN EXPRESSION OF YOU</span>
      <div className="studio-orbit studio-orbit-one" /><div className="studio-orbit studio-orbit-two" />
      <div className="studio-sphere studio-sphere-amber" /><div className="studio-sphere studio-sphere-rose" /><div className="studio-sphere studio-sphere-pearl" />
      <div className="studio-glass-sculpture"><span className="studio-sculpture-rim" /><span className="studio-sculpture-core" /><span className="studio-sculpture-label">GOSH<small>ESSENCE OF INDIVIDUALITY</small></span></div>
      <span className="studio-fragment studio-fragment-one" /><span className="studio-fragment studio-fragment-two" /><span className="studio-fragment studio-fragment-three" />
      <span className="studio-art-note studio-art-note-one">01 / A little mystery</span><span className="studio-art-note studio-art-note-two">02 / An unforgettable impression</span>
    </div>
    <div className="studio-hero-foot"><a href="#studio-introduction">SCROLL TO DISCOVER <ArrowDown size={14} /></a><span>CAREFULLY SOURCED. BEAUTIFULLY PERSONAL.</span><span className="studio-hero-index">01 — GOSH</span></div>
  </section>;
}
