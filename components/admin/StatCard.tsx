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
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-yellow-400/50 hover:shadow-lg">
      {/* Gold glow effect on hover */}
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-yellow-400/0 via-yellow-400/0 to-yellow-400/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-600">{title}</p>
          <p className="mt-2 text-3xl font-black text-black">{value}</p>
          {trend && (
            <p className={`mt-2 text-xs font-semibold ${trendUp ? "text-green-600" : "text-red-600"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-yellow-50 p-3 text-yellow-600 transition group-hover:bg-yellow-100">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
