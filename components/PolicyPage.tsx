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
    <main className="min-h-screen bg-white text-black">
      <Navbar cartCount={0} onCartOpen={() => setCartOpen(true)} />

      <section className="relative overflow-hidden border-b border-yellow-100 bg-[#fffdf6] py-10 sm:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.10),transparent_45%)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Contact
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-300 bg-yellow-100 text-yellow-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-600">
                {policy.label}
              </p>
              <h1 className="mt-3 text-4xl font-black text-neutral-950 sm:text-5xl">
                {policy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
                {policy.summary}
              </p>
              <p className="mt-4 text-sm font-bold text-zinc-500">
                Last updated: {policy.lastUpdated}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-yellow-200 bg-yellow-50/70 p-5 text-sm leading-6 text-zinc-700">
            These policies are written for normal Myanmar retail operations. They should be reviewed by a qualified
            local legal adviser before launch if you need formal legal compliance for a registered company.
          </div>

          {policy.sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] sm:p-8"
            >
              <h2 className="text-2xl font-black text-neutral-950">{section.title}</h2>
              <div className="mt-5 space-y-4">
                {section.body.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-7 text-zinc-600 sm:text-base">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-yellow-600" />
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
