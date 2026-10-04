"use client";

import { Reveal, GradientText } from "./ui/StudioMotion";
import Link from "next/link";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export default function BrandStory() {
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";

  return (
    <section 
      role="region" 
      aria-label="Brand story" 
      className="studio-section studio-story"
    >
      <div className="studio-container studio-story-grid"><Reveal className="studio-story-art"><div className="studio-story-art-ring" aria-hidden="true" /><span className="studio-eyebrow">GOSH / A CONSIDERED COLLECTION</span><span className="studio-story-art-type" aria-hidden="true">The art<br />of <em>feeling.</em></span><span className="studio-story-art-bottom">PERSONAL. DISTINCTIVE. UNFORGETTABLE.</span></Reveal>
        <Reveal className="studio-story-content"
        >
          {/* Label */}
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-accent  sm:mb-5 sm:text-sm">
            The {websiteName} Experience
          </p>

          {/* Main statement */}
          <h2 className="studio-display mb-5 text-[clamp(1.9rem,5.5vw,3rem)] font-semibold leading-[1.08] tracking-tight text-ink  sm:mb-6 lg:mb-7">
            Curated with Confidence,
            <br />
            <GradientText>Chosen for You</GradientText>
          </h2>

          {/* Body text */}
          <div className="mx-auto mb-8 max-w-2xl space-y-4 text-[15px] leading-[1.7] text-muted  sm:mb-10 sm:text-base lg:mb-12 lg:text-[17px] lg:leading-[1.75]">
            <p>
              {websiteName} is an independent curated perfume shop focused on carefully sourced fragrances, clear product details, and a trustworthy shopping experience.
            </p>
            <p>
              Every perfume is selected with care from trusted suppliers and reviewed before listing. Brand names are shown only to identify products clearly for customers.
            </p>
            <p>
              Find your signature scent with confidence, elegance, and care.
            </p>
          </div>

          {/* Simple CTA link */}
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent transition hover:gap-3 hover:text-accent  "
          >
            Learn More About Us
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
