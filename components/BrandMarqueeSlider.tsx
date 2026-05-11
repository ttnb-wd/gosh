"use client";

import Image from "next/image";

const brandSlides = [
  {
    name: "Luxury Fragrance",
    image: "/images/showcase/perfume-showcase-1.jpg",
  },
  {
    name: "Golden Essence",
    image: "/images/showcase/perfume-showcase-2.jpg",
  },
  {
    name: "Soft Bloom",
    image: "/images/showcase/perfume-showcase-3.jpg",
  },
  {
    name: "Modern Scent",
    image: "/images/showcase/perfume-showcase-4.jpg",
  },
  {
    name: "Elegant Perfume",
    image: "/images/showcase/perfume-showcase-5.jpg",
  },
  {
    name: "Luxury Bottle",
    image: "/images/showcase/perfume-showcase-6.jpg",
  },
  {
    name: "Crystal Notes",
    image: "/images/showcase/perfume-showcase-7.jpg",
  },
  {
    name: "Royal Aroma",
    image: "/images/showcase/perfume-showcase-8.jpg",
  },
  {
    name: "Velvet Aura",
    image: "/images/showcase/perfume-showcase-9.jpg",
  },
  {
    name: "Pure Luxe",
    image: "/images/showcase/perfume-showcase-10.jpg",
  },
  {
    name: "Amber Light",
    image: "/images/showcase/perfume-showcase-11.jpg",
  },
  {
    name: "Petal Mist",
    image: "/images/showcase/perfume-showcase-12.jpg",
  },
  {
    name: "Silk Ritual",
    image: "/images/showcase/perfume-showcase-13.jpg",
  },
  {
    name: "Radiant Notes",
    image: "/images/showcase/perfume-showcase-14.jpg",
  },
];

const marqueeSlides = [...brandSlides, ...brandSlides];

export default function BrandMarqueeSlider() {
  return (
    <div className="brand-marquee-wrapper w-full overflow-hidden rounded-[1.75rem] border border-[#d4af37]/20 bg-white/70 p-3 shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)] backdrop-blur-md">
      <div className="brand-marquee-track flex w-max gap-4">
        {marqueeSlides.map((slide, index) => (
          <div
            key={`${slide.name}-${index}`}
            className="w-44 shrink-0 sm:w-56"
          >
            <div className="relative h-36 overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(122,106,85,0.1)] sm:h-44">
              <Image
                src={slide.image}
                alt={`${slide.name} perfume`}
                fill
                sizes="224px"
                className="object-cover transition duration-500 hover:scale-105"
              />
            </div>
            <p className="mt-3 truncate text-center text-base font-black text-[#1f1a14]">{slide.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
