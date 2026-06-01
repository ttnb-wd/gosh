"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export default function BrandStory() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";
  const aboutText =
    settings.about_text ||
    `Since 2023, ${websiteName} has been crafting exceptional fragrances that capture the essence of luxury and sophistication. Each bottle tells a story, each scent evokes emotion.`;

  const slides = [
    {
      src: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop",
      alt: "Luxury perfume craftsmanship"
    },
    {
      src: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?q=80&w=1200&auto=format&fit=crop",
      alt: "Premium fragrance ingredients"
    },
    {
      src: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=1200&auto=format&fit=crop",
      alt: "Elegant unbranded perfume bottle"
    },
    {
      src: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1200&auto=format&fit=crop",
      alt: "Luxury perfume bottle with gold accents"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(desktopQuery.matches);

    handleChange();
    desktopQuery.addEventListener("change", handleChange);

    return () => desktopQuery.removeEventListener("change", handleChange);
  }, []);

  const textInitial = {
    opacity: 0,
    x: isDesktop ? 50 : 0,
    y: isDesktop ? 0 : 28,
  };

  const imageInitial = {
    opacity: 0,
    x: isDesktop ? -50 : 0,
    y: isDesktop ? 0 : 28,
  };

  return (
    <section role="region" aria-label="Brand story" className="bg-[var(--site-bg)] pb-8 pt-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={textInitial}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:order-2"
          >
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
              Our Story
            </p>
            <h2 className="mb-6 text-4xl font-black text-[#1f1a14] sm:text-5xl">
              The Art of
              <span className="block text-[#b88705]">Perfumery</span>
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-[#7a6a55]">
              <p>
                {aboutText}
              </p>
              {/* <p>
                Our master perfumers blend tradition with innovation, using only the finest ingredients sourced from the world&apos;s most prestigious suppliers. Every fragrance is a masterpiece, designed to become your signature.
              </p> */}
              <p>
                We believe that perfume is more than just a scent—it&apos;s an expression of who you are, a memory in the making, and a statement of elegance that lingers long after you&apos;ve left the room.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={imageInitial}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative lg:order-1"
          >
            <div className="absolute -inset-4 rounded-3xl bg-[#f7e7b3]/50 blur-3xl" />
            <div className="relative h-[500px] overflow-hidden rounded-3xl border border-[#d4af37]/25 shadow-2xl">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#d4af37]/10 to-transparent" />
                </div>
              ))}
              
              <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? "w-8 bg-[#d4af37]"
                        : "w-2 bg-white/60 hover:bg-white/80"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
