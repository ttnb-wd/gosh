"use client";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function StudioMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>{children}</MotionConfig>;
}
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ delay: reduced ? 0 : Math.min(delay, 0.2) }}>{children}</motion.div>;
}
export const FadeReveal = Reveal;
export const SlideReveal = Reveal;
export function StaggerGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : "hidden"} whileInView="show" viewport={{ once: true }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : .06 } } }}>{children}</motion.div>;
}
export function HoverLift({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`studio-hover-lift ${className}`}>{children}</div>;
}
export function AnimatedDivider() { return <div className="studio-animated-divider" aria-hidden="true" />; }
export function PageHeaderReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Reveal className={`studio-page-header ${className}`}>{children}</Reveal>;
}
export function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`studio-gradient ${className}`}>{children}</span>;
}
export const AnimatedGradientText = GradientText;
export function SectionHeading({ eyebrow, children, detail }: { eyebrow: string; children: ReactNode; detail?: string }) {
  return <Reveal className="studio-section-heading"><p className="studio-eyebrow">{eyebrow}</p><h2 className="studio-display">{children}</h2>{detail && <p className="studio-copy">{detail}</p>}</Reveal>;
}
