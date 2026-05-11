"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#6f1d1b]/25 hover:shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)]">
      {/* Gold glow effect on hover */}
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#d4af37]/0 via-[#d4af37]/0 to-[#f7e7b3]/35 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#7a6a55]">{title}</p>
          <p className="mt-2 text-3xl font-black text-[#1f1a14]">{value}</p>
          {trend && (
            <p className={`mt-2 text-xs font-semibold ${trendUp ? "text-green-600" : "text-red-600"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-[#fff7e6] p-3 text-[#d4af37] transition group-hover:bg-[#f7e7b3]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
