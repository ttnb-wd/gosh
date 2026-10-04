"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Flower2, Gem, Sparkles } from "lucide-react";

const brandPhrases = ["Find your signature", "Wear your mood", "Leave a memory", "Scent, reimagined", "GOSH Perfume Studio"];

/** Homepage-only presentation. No data, navigation, or commerce behavior lives here. */
export function HomepageAtmosphere() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".homepage-luxury");
    if (!root) return;
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "true");
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    const motion = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.setAttribute("data-visible", String(entry.isIntersecting)));
    }, { rootMargin: "80px" });
    const discover = () => {
      root.querySelectorAll(".home-reveal").forEach(element => {
        element.setAttribute("data-reveal-ready", "true");
        reveals.observe(element);
      });
    };
    discover();
    root.querySelectorAll("[data-home-motion]").forEach(element => motion.observe(element));
    const visibility = () => root.setAttribute("data-paused", String(document.hidden));
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      reveals.disconnect(); motion.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return <div className="home-brand-strip" aria-label="GOSH: Find your signature. Wear your mood. Leave a memory.">
    <div className="home-brand-track" aria-hidden="true">
      {[0, 1].map(copy => <div className="home-brand-copy" key={copy}>{brandPhrases.map(phrase => <span key={phrase}>{phrase}<span className="home-brand-star">✦</span></span>)}</div>)}
    </div>
  </div>;
}

function HomeLink({ children, href, secondary = false }: { children: ReactNode; href: string; secondary?: boolean }) {
  return <Link href={href} className={`home-cta${secondary ? " home-cta-secondary" : ""}`}><span>{children}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>;
}

// Fixed, varied coordinates and phases keep server/client output identical.
// Scent vocabulary needs no catalog request or commerce state.
const floatingNotes = [
  { word: "FRESH", detail: "bergamot / citrus", x: 9, y: 12, duration: 20, phase: -6, motion: "dissolve", tone: "gold", style: "plain" },
  { word: "AMBER", detail: "warm / luminous", x: 12, y: 36, duration: 17, phase: -4, motion: "fall", tone: "gold", style: "stamp" },
  { word: "AURA", detail: "floral / elegant", x: 85, y: 17, duration: 14, phase: -3, motion: "side", tone: "rose", style: "plain" },
  { word: "velvet", detail: "", x: 88, y: 51, duration: 19, phase: -7, motion: "rise", tone: "plum", style: "italic" },
  { word: "bloom", detail: "", x: 11, y: 73, duration: 21, phase: -10, motion: "rise", tone: "rose", style: "italic" },
  { word: "WOODY", detail: "soft / grounded", x: 84, y: 80, duration: 18, phase: -5, motion: "fall", tone: "bronze", style: "stamp" },
  { word: "MEMORY", detail: "", x: 91, y: 66, duration: 16, phase: -9, motion: "dissolve", tone: "plum", style: "plain" },
  { word: "MUSK", detail: "", x: 70, y: 94, duration: 22, phase: -12, motion: "rise", tone: "rose", style: "plain" },
];

function HeroTypographyAtmosphere() {
  return <div className="home-hero-scene" aria-hidden="true">
    <div className="home-scene-entrance home-hero-enter" style={{ "--enter-delay": "100ms" } as CSSProperties}>
      <div className="home-scene-wash" />
      <div className="home-scene-grain" />
      <svg className="home-scene-flow" viewBox="0 0 1440 680" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="home-canvas-silk" x1="0" y1="560" x2="1440" y2="190" gradientUnits="userSpaceOnUse"><stop className="home-stop-gold" stopOpacity=".05" /><stop offset=".32" className="home-stop-gold" stopOpacity=".25" /><stop offset=".57" className="home-stop-rose" stopOpacity=".66" /><stop offset=".8" className="home-stop-plum" stopOpacity=".47" /><stop offset="1" className="home-stop-bronze" stopOpacity=".12" /></linearGradient>
          <linearGradient id="home-canvas-light" x1="170" y1="620" x2="1410" y2="160" gradientUnits="userSpaceOnUse"><stop className="home-stop-gold" stopOpacity="0" /><stop offset=".38" className="home-stop-light" stopOpacity=".9" /><stop offset=".68" className="home-stop-light" stopOpacity=".62" /><stop offset="1" className="home-stop-rose" stopOpacity="0" /></linearGradient>
          <linearGradient id="home-canvas-line" x1="0" y1="470" x2="1440" y2="200" gradientUnits="userSpaceOnUse"><stop className="home-stop-bronze" stopOpacity="0" /><stop offset=".36" className="home-stop-gold" stopOpacity=".38" /><stop offset=".62" className="home-stop-bronze" stopOpacity=".7" /><stop offset="1" className="home-stop-light" stopOpacity=".7" /></linearGradient>
        </defs>
        <path d="M-180 580C160 382 420 710 800 490S1240 465 1600 80" stroke="url(#home-canvas-silk)" strokeWidth="160" />
        <path d="M-130 550C195 369 425 665 812 447S1300 355 1550 115" stroke="url(#home-canvas-light)" strokeWidth="40" />
        <path className="home-scene-line" d="M-80 479C256 303 491 586 853 340S1244 346 1550 50" stroke="url(#home-canvas-line)" />
        <path className="home-scene-line" d="M-40 628C267 429 600 663 941 426S1340 320 1520 172" stroke="url(#home-canvas-light)" />
      </svg>
      <div className="home-scene-glass home-scene-glass-one" /><div className="home-scene-glass home-scene-glass-two" />
    </div>
    <div className="home-scene-particles home-hero-enter" style={{ "--enter-delay": "900ms" } as CSSProperties}><div>{[0, 1, 2, 3, 4].map(i => <span key={i} style={{ "--particle": i } as CSSProperties} />)}</div></div>
  </div>;
}

function HeroProductArtwork() {
  return <div className="home-hero-artwork">
    <div className="home-artwork-atmosphere" aria-hidden="true">
      <div className="home-artwork-glow" />
      <div className="home-artwork-shadow" />
      <svg className="home-artwork-scent-lines" viewBox="0 0 660 500" fill="none" preserveAspectRatio="none">
        <path d="M40 62C150 68 188 146 305 166M78 182C157 174 220 221 323 239M564 86C481 89 467 183 376 203M561 401C484 384 443 344 352 340" />
        <circle cx="40" cy="62" r="2" /><circle cx="78" cy="182" r="2" /><circle cx="564" cy="86" r="2" /><circle cx="561" cy="401" r="2" />
      </svg>
    </div>
    <div className="home-artwork-image-wrap home-hero-enter" style={{ "--enter-delay": "180ms" } as CSSProperties}>
      <div className="home-artwork-float"><Image src="/images/hero-perfume-artwork.png" alt="Amber perfume bottle surrounded by luminous rose and gold ribbons, blossom petals, and warm woods" width={1122} height={1402} sizes="(max-width: 767px) clamp(55vw, 242px, 62vw), (max-width: 1050px) 38vw, 432px" preload className="home-artwork-image" /></div>
    </div>
    <svg className="home-artwork-ribbon" viewBox="0 0 660 500" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="home-artwork-silk" x1="0" y1="410" x2="660" y2="260" gradientUnits="userSpaceOnUse"><stop className="home-stop-gold" stopOpacity="0" /><stop offset=".3" className="home-stop-light" stopOpacity=".25" /><stop offset=".65" className="home-stop-rose" stopOpacity=".18" /><stop offset="1" className="home-stop-gold" stopOpacity="0" /></linearGradient></defs>
      <path d="M-60 398C124 326 172 462 366 364S534 286 710 220" stroke="url(#home-artwork-silk)" strokeWidth="28" />
      <path d="M-60 384C124 312 172 448 366 350S534 272 710 206" stroke="url(#home-artwork-silk)" strokeWidth="1" />
    </svg>
    <div className="home-floating-notes" aria-hidden="true">{floatingNotes.map((note, index) => <div key={note.word} className={`home-floating-note home-note-tone-${note.tone} home-note-style-${note.style} home-hero-enter`} style={{ "--note-x": `${note.x}%`, "--note-y": `${note.y}%`, "--note-duration": `${note.duration}s`, "--note-phase": `${note.phase}s`, "--enter-delay": `${700 + index * 70}ms` } as CSSProperties}>
      <span className={`home-note-motion home-note-motion-${note.motion}`}><span className="home-note-word">{note.word}</span>{note.detail && <small>{note.detail}</small>}</span>
    </div>)}</div>
  </div>;
}

export function HomepageHero() {
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let entranceFrame = 0;
    // Start after hydration and a painted initial frame; never replay on scroll.
    entranceFrame = requestAnimationFrame(() => {
      entranceFrame = requestAnimationFrame(() => hero.setAttribute("data-entered", "true"));
    });
    return () => cancelAnimationFrame(entranceFrame);
  }, []);

  return <section ref={heroRef} id="home" className="home-hero" aria-labelledby="home-headline" data-entered="false" data-home-motion data-visible="true">
    <div className="home-hero-haze" aria-hidden="true"><div className="home-hero-enter" style={{ "--enter-delay": "0ms" } as CSSProperties}><div className="home-hero-light" /></div></div>
    <HeroTypographyAtmosphere />
    <div className="home-hero-layout">
      <div className="home-hero-copy">
        <p className="home-kicker home-hero-enter" style={{ "--enter-delay": "260ms" } as CSSProperties}><span />THE ART OF SCENT. THE EXPRESSION OF YOU.</p>
        <h1 id="home-headline" className="home-headline">
          <span className="home-headline-top home-hero-enter" style={{ "--enter-delay": "360ms" } as CSSProperties}>FIND YOUR</span>
          <span className="home-headline-signature home-hero-enter" style={{ "--enter-delay": "480ms" } as CSSProperties}><span className="home-gradient">signature</span></span>
          <span className="home-headline-bottom home-hero-enter" style={{ "--enter-delay": "600ms" } as CSSProperties}>SCENT<span className="home-headline-star" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" focusable="false">
              <defs>
                <linearGradient id="home-headline-sparkle" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                  <stop className="home-headline-sparkle-light" />
                  <stop offset=".48" className="home-headline-sparkle-gold" />
                  <stop offset="1" className="home-headline-sparkle-bronze" />
                </linearGradient>
              </defs>
              <path d="M16 3C17.2 12.5 19.5 14.8 29 16C19.5 17.2 17.2 19.5 16 29C14.8 19.5 12.5 17.2 3 16C12.5 14.8 14.8 12.5 16 3Z" fill="url(#home-headline-sparkle)" />
              <path d="M7 7L10 10M22 22L25 25M25 7L22 10M10 22L7 25" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
            </svg>
          </span></span>
        </h1>
        <p className="home-hero-description home-hero-enter" style={{ "--enter-delay": "720ms" } as CSSProperties}>Some scents are worn.<br /> Others become a part of you.</p>
        <div className="home-hero-actions home-hero-enter" style={{ "--enter-delay": "820ms" } as CSSProperties}><HomeLink href="/products">Discover the collection</HomeLink><HomeLink href="#scent-story" secondary>Find your mood</HomeLink></div>
      </div>
      <HeroProductArtwork />
      <div className="home-hero-detail home-hero-enter" style={{ "--enter-delay": "960ms" } as CSSProperties}><span className="home-detail-icon"><Sparkles size={17} /></span><p>Carefully sourced. Beautifully personal.<small>AUTHENTIC FRAGRANCES / GOSH PERFUME STUDIO</small></p></div>
    </div>
    <div className="home-hero-bottom"><div className="home-hero-bottom-inner home-hero-enter" style={{ "--enter-delay": "1100ms" } as CSSProperties}><a href="#studio-introduction"><ArrowDown size={14} />SCROLL TO FEEL SOMETHING</a><span>FRAGRANCE IS A FEELING.</span><span>MAKE IT YOURS. <i>✦</i></span></div></div>
  </section>;
}

export function HomepageIntroduction() {
  return <section id="studio-introduction" className="home-introduction" aria-labelledby="home-intro-title">
    <div className="home-intro-heading home-reveal"><p className="home-kicker">01 / A WORLD OF POSSIBILITY</p><h2 id="home-intro-title">One fragrance.<br /><em className="home-gradient-static">A thousand feelings.</em></h2></div>
    <div className="home-intro-notes">{[
      { number: "01", icon: Flower2, title: "Wear your mood", text: "Soft florals. Warm woods. A little unexpected.", tone: "rose" },
      { number: "02", icon: Gem, title: "Make it personal", text: "Discover the fragrance that feels like you.", tone: "amber" },
      { number: "03", icon: Sparkles, title: "Leave a memory", text: "A quiet presence. An unforgettable impression.", tone: "plum" },
    ].map(({ number, icon: Icon, title, text, tone }, index) => <div key={number} className={`home-note home-note-${tone} home-reveal`} style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}><div className="home-note-top"><Icon size={24} strokeWidth={1.2} /><span>{number}</span></div><h3>{title}</h3><p>{text}</p></div>)}</div>
  </section>;
}

const scentRows = [["FLORAL", "WOODY", "AMBER"], ["FRESH", "MUSK", "FLORAL"]];
export function HomepageScentStory() {
  return <section id="scent-story" className="home-scent-story" aria-labelledby="home-scent-title" data-home-motion>
    <div className="home-scent-header home-reveal"><p className="home-kicker">02 / FOLLOW THE FEELING</p><h2 id="home-scent-title">Find your signature.</h2><p>A world of notes. An expression of you.</p></div>
    <div className="home-scent-rows" aria-hidden="true">{scentRows.map((words, row) => <div className={`home-scent-track home-scent-track-${row}`} key={row}>{[0, 1].map(copy => <div className="home-scent-copy" key={copy}>{words.map((word, index) => <span key={word} className={index % 2 ? "home-scent-outline" : "home-scent-fill"}>{word}<small>✧</small></span>)}</div>)}</div>)}</div>
    <p className="sr-only">Explore floral, woody, amber, fresh, and musk fragrances.</p>
    <div className="home-scent-bottom"><span>SOFT & ROMANTIC</span><span>WARM & MYSTERIOUS</span><Link href="/products">Explore every note <ArrowUpRight size={16} /></Link></div>
    <span className="home-scent-speck home-scent-speck-one" aria-hidden="true" /><span className="home-scent-speck home-scent-speck-two" aria-hidden="true" />
  </section>;
}

export function HomepageFinale() {
  return <section className="home-finale" aria-labelledby="home-finale-title"><div className="home-finale-ring" aria-hidden="true" /><div className="home-reveal"><p className="home-kicker">THE NEXT CHAPTER IS YOURS</p><h2 id="home-finale-title">Be remembered.<br /><em>Beautifully.</em></h2></div><div className="home-finale-action home-reveal"><span aria-hidden="true">✧</span><p>Your signature is waiting.<br />Find it in our curated collection.</p><HomeLink href="/products">Explore all fragrances</HomeLink></div></section>;
}
