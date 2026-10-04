"use client";
import type { LucideIcon } from "lucide-react";
interface StatCardProps { title: string; value: string | number; icon: LucideIcon; trend?: string; trendUp?: boolean }
export default function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return <article className="studio-admin-stat">
    <div className="flex items-start justify-between gap-3"><p className="studio-admin-stat-label">{title}</p><span className="studio-admin-stat-icon"><Icon size={16} aria-hidden="true" /></span></div>
    <p className="studio-admin-stat-number">{value}</p>
    {trend && <p className={`studio-admin-stat-trend ${trendUp ? "text-success" : "text-muted"}`}>{trend}</p>}
  </article>;
}
