"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string;
  qty: number;
  selectedSize?: string;
}

type PolicySection = {
  title: string;
  body: string[];
};

export type PolicyPageData = {
  label: string;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export default function PolicyPage({ policy }: { policy: PolicyPageData }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const updateCartItemQuantity = (id: string | number, selectedSize: string | undefined, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems((items) => items.filter((item) => !(item.id === id && item.selectedSize === selectedSize)));
    } else {
      setCartItems((items) =>
        items.map((item) =>
          item.id === id && item.selectedSize === selectedSize ? { ...item, qty: newQuantity } : item
        )
      );
    }
  };

  return (
    <main role="main" className="studio-page studio-policy min-h-screen bg-[var(--site-bg)] text-ink">
      <Navbar cartCount={0} onCartOpen={() => setCartOpen(true)} />

      <section role="region" aria-label="Policy header" className="relative overflow-hidden bg-[var(--site-bg)] py-10 sm:py-14">
        <div className="absolute inset-0 bg-surface-muted" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink shadow-soft transition hover:border-line hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            Contact
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-accent">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                {policy.label}
              </p>
              <h1 className="studio-gradient mt-3 text-4xl font-semibold text-ink sm:text-5xl">
                {policy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">
                {policy.summary}
              </p>
              <p className="mt-4 text-sm font-bold text-muted">
                Last updated: {policy.lastUpdated}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section role="region" aria-label="Policy content" className="bg-[var(--site-bg)] py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-brand/20 bg-brand-soft p-5 text-sm leading-6 text-brand">
            These policies are written for normal Myanmar retail operations. They should be reviewed by a qualified
            local legal adviser before launch if you need formal legal compliance for a registered company.
          </div>

          {policy.sections.map((section) => (
            <article
              key={section.title}
              className="rounded-xl border border-line bg-surface p-6 shadow-panel sm:p-8"
            >
              <h2 className="text-2xl font-semibold text-ink">{section.title}</h2>
              <div className="mt-5 space-y-4">
                {section.body.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-7 text-muted sm:text-base">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
      />
    </main>
  );
}
