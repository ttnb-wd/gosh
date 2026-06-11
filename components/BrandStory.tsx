"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { createSupabaseClient } from "@/lib/supabase/client";

interface ProductImage {
  id: string;
  name: string;
  image: string;
}

const fallbackBrandStoryImage =
  "/images/showcase/perfume-showcase-1.jpg";

const getSafeBrandStoryImage = (image?: string | null) => {
  const value = image?.trim();
  if (!value) return fallbackBrandStoryImage;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabaseUrl && (value.startsWith("products/") || value.startsWith("product-images/"))) {
    const path = value.startsWith("product-images/") ? value.replace(/^product-images\//, "") : value;
    return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
  }

  return fallbackBrandStoryImage;
};

function BrandStorySlideImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(() => getSafeBrandStoryImage(src));

  useEffect(() => {
    setImageSrc(getSafeBrandStoryImage(src));
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      loading="eager"
      onError={() => {
        if (imageSrc !== fallbackBrandStoryImage) {
          setImageSrc(fallbackBrandStoryImage);
        }
      }}
    />
  );
}

export default function BrandStory() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";
  const aboutText = `${websiteName} is an independent curated perfume shop focused on carefully sourced fragrances, clear product details, and a trustworthy shopping experience.`;

  // Fallback static slides if no products
  const fallbackSlides = [
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

  // Fetch product images from Supabase
  useEffect(() => {
    async function fetchProductImages() {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select("id, name, image")
          .eq("is_active", true)
          .not("image", "is", null)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;

        if (data && data.length > 0) {
          setProductImages(data);
        }
      } catch (error) {
        console.error("Error fetching product images:", error);
      }
    }

    fetchProductImages();
  }, []);

  // Use product images if available, otherwise fallback
  const slides = productImages.length > 0
    ? productImages.map(product => ({
        src: getSafeBrandStoryImage(product.image),
        alt: product.name
      }))
    : fallbackSlides;

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
              Our Authenticity Note
            </p>
            <h2 className="mb-6 text-4xl font-black text-[#1f1a14] sm:text-5xl">
              Curated with
              <span className="block text-[#b88705]">Confidence</span>
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-[#7a6a55]">
              <p>
                {aboutText}
              </p>
              {/* <p>
                We carefully source authentic perfumes from trusted suppliers and review product details before listing.
              </p> */}
              <p>
                Brand names are shown only to identify products clearly for customers. Find your signature scent with confidence, elegance, and care.
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
            <div className="relative h-[500px] overflow-hidden rounded-3xl">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <BrandStorySlideImage
                    src={slide.src}
                    alt={slide.alt}
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
