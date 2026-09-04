"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import devLog from "@/lib/dev-log";

interface Product {
  id: string;
  name: string;
  image: string;
  badge: string | null;
  category: string;
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const productsQuery = query(
          collection(db, "products"),
          where("is_active", "==", true),
          orderBy("createdAt", "desc"),
          limit(20) // Fetch more to ensure we get enough fragrances after filtering
        );

        const snapshot = await getDocs(productsQuery);

        // Filter to only include perfume/fragrance products (exclude accessories)
        const allProducts = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const category = typeof data.category === "string" 
              ? data.category.trim().toLowerCase() 
              : "";

            return {
              id: doc.id,
              name: data.name || "",
              image: data.image || data.image_url || "",
              badge: (typeof data.badge === "string" && data.badge.trim()) ? data.badge : null,
              category,
            };
          })
          .filter((product) => {
            // Only include fragrance/perfume products, exclude accessories
            return product.category !== "accessories" && product.image;
          });

        // Take first 8 fragrance products for the showcase
        setProducts(allProducts.slice(0, 8));
      } catch (error) {
        devLog.error("Error fetching featured fragrances:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading || products.length === 0) {
    return null;
  }

  // Determine primary badge to display (priority: NEW > BEST SELLER > FRESH)
  const getPrimaryBadge = (badge: string | null): string | null => {
    if (!badge) return null;

    const badgeUpper = badge.trim().toUpperCase();
    
    // Priority 1: NEW
    if (badgeUpper.includes("NEW")) return "NEW";
    
    // Priority 2: BEST SELLER
    if (badgeUpper.includes("BEST") || badgeUpper.includes("SELLER")) return "BEST SELLER";
    
    // Priority 3: FRESH
    if (badgeUpper.includes("FRESH")) return "FRESH";
    
    // If badge exists but doesn't match priority keywords, show first word only
    return badge.split(" ")[0].toUpperCase();
  };

  return (
    <section 
      role="region" 
      aria-label="Featured fragrances" 
      className="bg-[var(--site-bg)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex items-end justify-between sm:mb-10 lg:mb-12"
        >
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b88700] sm:text-sm">
              Curated Selection
            </p>
            <h2 className="text-[clamp(1.75rem,4.5vw,2.5rem)] font-black leading-[1.1] text-[#1f1a14] dark:text-[#fff7e6]">
              Featured Fragrances
            </h2>
          </div>
          <Link
            href="/products"
            className="group hidden items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#b88700] transition hover:gap-3 hover:text-[#8d5f00] dark:text-[#d4af37] dark:hover:text-[#f0c847] sm:flex"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Image-only gallery - pure visual showcase */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {products.map((product, index) => {
            const primaryBadge = getPrimaryBadge(product.badge);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
              >
                <Link
                  href={`/products?search=${encodeURIComponent(product.name)}`}
                  className="group relative block overflow-hidden rounded-2xl bg-[#f7f3ea] dark:bg-[#1a1410]"
                  aria-label={product.name}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ aspectRatio: '3/4', display: 'block' }}
                  />
                  
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1f1a14]/12 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {primaryBadge && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[#d4af37]/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#1f1a14] backdrop-blur-sm sm:right-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-[10px]">
                      {primaryBadge}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile "View All" link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-center sm:hidden"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#b88700] transition hover:gap-3 hover:text-[#8d5f00]"
          >
            View All Fragrances
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
