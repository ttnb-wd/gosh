import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" };
export function StudioButton({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`studio-button studio-button--${variant} ${className}`} {...props} />;
}
export function StudioLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  return <Link href={href} className={`studio-button studio-button--${variant} ${className}`}>{children}</Link>;
}
