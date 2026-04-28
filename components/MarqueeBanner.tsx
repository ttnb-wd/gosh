"use client";

import { Sparkles } from "lucide-react";

export default function MarqueeBanner() {
  const text = "Premium Luxury Perfumes • Free Shipping Over $100 • 30-Day Returns • Exclusive Collections";
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 py-3">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-8">
            <Sparkles className="h-4 w-4 text-black" />
            <span className="text-sm font-semibold text-black">{text}</span>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
