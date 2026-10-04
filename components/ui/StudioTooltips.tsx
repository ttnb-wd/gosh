"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** One delegated tooltip layer for mouse and keyboard hints, including modal actions. */
export default function StudioTooltips() {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<{ target: HTMLElement; text: string } | null>(null);
  useEffect(() => {
    const find = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>("[data-studio-tooltip]") : null;
    const open = (target: HTMLElement | null) => {
      const text = target?.dataset.studioTooltip;
      if (target && text && !target.matches(":disabled")) setHint(current => current?.target === target ? current : { target, text });
    };
    const pointerOver = (event: PointerEvent) => { if (event.pointerType !== "touch") open(find(event.target)); };
    const pointerOut = (event: PointerEvent) => {
      const target = find(event.target);
      if (target && !target.contains(event.relatedTarget as Node | null) && !target.contains(document.activeElement)) setHint(null);
    };
    const focusIn = (event: FocusEvent) => open(find(event.target));
    const focusOut = (event: FocusEvent) => { if (find(event.target)) setHint(null); };
    const dismiss = () => setHint(null);
    const keyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("pointerover", pointerOver);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("pointerover", pointerOver);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
      document.removeEventListener("keydown", keyDown);
    };
  }, []);
  useLayoutEffect(() => {
    if (!hint || !panel.current) return;
    const tooltip = panel.current;
    const previous = hint.target.getAttribute("aria-describedby");
    hint.target.setAttribute("aria-describedby", [previous, id].filter(Boolean).join(" "));
    tooltip.showPopover?.();
    const anchor = hint.target.getBoundingClientRect();
    const bounds = tooltip.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - bounds.width - 12, anchor.left + anchor.width / 2 - bounds.width / 2));
    const top = anchor.top >= bounds.height + 20 ? anchor.top - bounds.height - 8 : Math.min(window.innerHeight - bounds.height - 12, anchor.bottom + 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = "visible";
    const dismiss = () => setHint(null);
    document.addEventListener("scroll", dismiss, { capture: true, passive: true });
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      tooltip.hidePopover?.();
      if (previous === null) hint.target.removeAttribute("aria-describedby");
      else hint.target.setAttribute("aria-describedby", previous);
    };
  }, [hint, id]);
  return hint ? createPortal(<div ref={panel} id={id} role="tooltip" popover="manual" className="studio-tooltip" style={{ visibility: "hidden" }}>{hint.text}</div>, document.body) : null;
}
