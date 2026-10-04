"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef } from "react";

type StudioModalProps = HTMLMotionProps<"div"> & { label: string; onDismiss: () => void; lockScroll?: boolean };
const focusable = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]';

/** Focus containment for existing custom overlays, without changing their actions. */
export default function StudioModal({ label, onDismiss, children, lockScroll = true, ...props }: StudioModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    if (!element) return;
    const overflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(focusable)).filter(control => control.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (controls()[0] ?? element).focus({ preventScroll: true }));
    const keyboard = (event: KeyboardEvent) => {
      // Portal listboxes and a nested native confirmation own their keyboard events.
      if (document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('[role="combobox"][aria-expanded="true"]'))) return;
      if (event.key === "Escape") { event.preventDefault(); dismiss.current(); }
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) { event.preventDefault(); element.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keyboard); if (lockScroll) document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, [lockScroll]);
  return <motion.div {...props} className={`studio-overlay-panel ${props.className ?? ""}`} ref={panel} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
    initial={props.initial ?? { opacity: 0, scale: .98, y: 8 }} animate={props.animate ?? { opacity: 1, scale: 1, y: 0 }}
    exit={props.exit ?? { opacity: 0, scale: .98, y: 8 }} transition={{ duration: .18, ease: "easeOut" }}>
    {children}
  </motion.div>;
}
