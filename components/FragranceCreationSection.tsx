"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Leaf } from "lucide-react";

const creationRows = [
  {
    title: "Trusted Selection",
    description:
      "We carefully select fragrances from trusted suppliers and reliable sources, with a focus on authentic products and confident shopping.",
    image: "/images/fragrance-creation/waterfall.png.png",
    imageAlt: "Waterfall surrounded by lush green forest",
    imageFirst: true,
  },
  {
    title: "Clear Product Details",
    description:
      "Every listing is reviewed for product condition, scent profile, presentation, and useful details to help you choose with care.",
    image: "/images/fragrance-creation/forest-stream.png.png",
    imageAlt: "Forest stream with golden lights",
    imageFirst: false,
  },
];

function TextPanel({
  title,
  description,
  slideFrom,
  delay = 0.22,
}: {
  title: string;
  description: string;
  slideFrom: "left" | "right";
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: slideFrom === "left" ? -42 : 42 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col justify-center"
    >
      <Leaf className="mb-2 h-5 w-5 fill-[#d4af37]/30 text-[#b88705]" aria-hidden="true" />
      <h3 className="font-serif text-xl font-black leading-tight text-[#1f1a14] sm:text-2xl">
        {title}
      </h3>
      <div className="mt-2.5 h-px w-12 bg-[#b88705]" />
      <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-[#7a6a55]">
        {description}
      </p>
    </motion.div>
  );
}

function ImagePanel({
  src,
  alt,
  delay = 0,
}: {
  src: string;
  alt: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto h-[140px] w-[92%] max-w-[300px] overflow-hidden rounded-[24px] bg-transparent shadow-[0_12px_40px_rgba(31,26,20,0.06)] dark:bg-[#0f0b07] sm:h-[168px] sm:max-w-[320px] lg:h-[195px]"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 320px, 100vw"
        className="block h-full w-full scale-[1.08] object-cover object-center"
      />
    </motion.div>
  );
}

export default function FragranceCreationSection() {
  return (
    <section
      role="region"
      aria-label="The art of fragrance creation"
      className="relative -mt-px overflow-hidden bg-[var(--site-bg)] pb-8 pt-6 md:pb-10 md:pt-8"
    >
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6f1d1b] sm:text-xs">
            The Art of Fragrance Selection
          </p>
          <h2 className="mt-2 font-serif text-[2rem] font-black leading-tight text-[#1f1a14] sm:text-3xl lg:text-[2.5rem]">
            Carefully sourced,
            <span className="block">
              thoughtfully <span className="text-[#b88705]">presented.</span>
            </span>
          </h2>
        </motion.div>

        <div className="mt-4 space-y-5 sm:mt-5 lg:mt-6 lg:space-y-6">
          {creationRows.map((row, index) => (
            <motion.div
              key={row.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.72, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="grid items-center gap-8 md:gap-10 lg:grid-cols-2 lg:gap-12"
            >
              {row.imageFirst ? (
                <>
                  <div className="flex justify-center lg:justify-end">
                    <ImagePanel src={row.image} alt={row.imageAlt} />
                  </div>
                  <TextPanel title={row.title} description={row.description} slideFrom="right" />
                </>
              ) : (
                <>
                  <div className="lg:order-1">
                    <TextPanel title={row.title} description={row.description} slideFrom="left" />
                  </div>
                  <div className="lg:order-2">
                    <div className="flex justify-center lg:justify-start">
                      <ImagePanel src={row.image} alt={row.imageAlt} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
