"use client";

import { motion } from "framer-motion";
import { Star, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  comment: string;
  rating: number;
  avatar_url: string | null;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    const loadTestimonials = async () => {
      const { data, error: fetchError } = await supabase
        .from("testimonials")
        .select("id, name, role, comment, rating, avatar_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Testimonials fetch error:", fetchError);
        return;
      }

      setTestimonials((data || []) as Testimonial[]);
    };

    loadTestimonials();
  }, [supabase]);

  return (
    <section role="region" aria-label="Customer testimonials" className="bg-[var(--site-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
            Testimonials
          </p>
          <h2 className="text-4xl font-black text-[#1f1a14] sm:text-5xl">
            What Our Customers Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#7a6a55]">
            Join thousands of satisfied customers who trust GOSH
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative"
            >
              <div className="rounded-3xl border border-[#d4af37]/20 bg-white p-8 shadow-lg transition-all duration-500 hover:border-[#6f1d1b]/25 hover:shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)]">
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-[#d4af37] text-[#d4af37]" />
                  ))}
                </div>
                
                <p className="mb-6 leading-relaxed text-[#7a6a55]">&quot;{testimonial.comment}&quot;</p>
                
                <div className="flex items-center gap-4">
                  {testimonial.avatar_url ? (
                    <img
                      src={testimonial.avatar_url}
                      alt={testimonial.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#fff7e6] to-[#f8eeee] text-sm font-black text-[#6f1d1b]">
                      {getInitials(testimonial.name) || <UserCircle className="h-7 w-7" />}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-[#1f1a14]">{testimonial.name}</h4>
                    {testimonial.role && <p className="text-sm text-[#7a6a55]">{testimonial.role}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
