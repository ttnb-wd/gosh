"use client";
import devLog from "@/lib/dev-log";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  comment: string;
  rating: number;
  avatar_url: string | null;
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const loadTestimonials = async () => {
      const q = query(
        collection(db, "testimonials"),
        where("is_active", "==", true),
        orderBy("created_at", "desc")
      );

      const snapshot = await getDocs(q);

      const loaded: Testimonial[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;

        return {
          id: doc.id,
          name: typeof data.name === "string" ? data.name : "",
          role: typeof data.role === "string" ? data.role : null,
          comment: typeof data.comment === "string" ? data.comment : "",
          rating: Number(data.rating ?? 0) || 0,
          avatar_url:
            typeof data.avatar_url === "string" ? data.avatar_url : null,
        };
      });

      setTestimonials(loaded);
    };

    loadTestimonials().catch((error) => {
      devLog.error("Testimonials fetch error:", error);
    });
  }, []);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section 
      role="region" 
      aria-label="Customer testimonials" 
      className="bg-[var(--site-bg)] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10 text-center sm:mb-12 lg:mb-14"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b88700] dark:text-[#d4af37] sm:text-sm">
            Customer Reviews
          </p>
          <h2 className="text-[clamp(1.75rem,4.5vw,2.5rem)] font-black leading-[1.1] text-[#1f1a14] dark:text-[#fff7e6]">
            Trusted by Customers
          </h2>
        </motion.div>

        {/* Testimonials - clean list layout */}
        <div className="space-y-6 sm:space-y-7 lg:space-y-8">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              className="border-b border-[#d4af37]/10 pb-6 last:border-b-0 sm:pb-7 lg:pb-8"
            >
              {/* Rating */}
              <div className="mb-3 flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#d4af37] text-[#d4af37] sm:h-5 sm:w-5" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mb-4 text-base leading-relaxed text-[#4f4234] dark:text-[#c9b8a0] sm:text-lg lg:text-xl lg:leading-[1.65]">
                &ldquo;{testimonial.comment}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#d4af37]/20" />
                <cite className="not-italic text-sm font-bold text-[#1f1a14] dark:text-[#fff7e6] sm:text-base">
                  {testimonial.name}
                  {testimonial.role && (
                    <span className="ml-2 font-normal text-[#7a6a55] dark:text-[#b8a892]">
                      · {testimonial.role}
                    </span>
                  )}
                </cite>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
