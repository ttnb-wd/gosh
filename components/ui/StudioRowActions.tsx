"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
export default function StudioRowActions({ children, label = "Row actions" }: { children: ReactNode; label?: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!details.current?.contains(event.target as Node) && details.current) details.current.open = false; };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <details ref={details} className="studio-row-actions" onToggle={event => setOpen(event.currentTarget.open)}
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
      if (open && ["ArrowDown","ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        if (buttons.length) buttons[(buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
    }} onClick={event => { if ((event.target as HTMLElement).closest('button,a')) event.currentTarget.open = false; }}>
    <summary aria-label={label}><MoreHorizontal size={18} aria-hidden="true" /></summary><div>{children}</div>
  </details>;
}
