"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface StudioSelectOption { value: string; label: string; icon?: ReactNode }
export interface StudioSelectProps {
  value: string;
  options: StudioSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Shared single-select presentation. Values and callbacks belong to the caller. */
export default function StudioSelect({ value, options, onChange, placeholder = "Select an option", label,
  ariaLabel, id: suppliedId, disabled = false, className = "", open: controlledOpen, onOpenChange }: StudioSelectProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = !disabled && (controlledOpen ?? internalOpen);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const selected = options.find(option => option.value === value);

  function setOpen(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);
  }
  function show(index = Math.max(0, options.findIndex(option => option.value === value))) {
    if (disabled || !options.length) return;
    setActive(index);
    setOpen(true);
  }
  function choose(index: number) {
    if (!options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const height = Math.min(300, options.length * 42 + 16);
      const upward = below < height && above > below;
      const maxHeight = Math.max(80, Math.min(height, upward ? above : below));
      setPosition({ top: upward ? rect.top - maxHeight - 6 : rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight });
    };
    updatePosition();
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; updatePosition(); }); };
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("pointerdown", outside);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("pointerdown", outside);
    };
    // The selected value never changes the positioning subscriptions.
  }, [open, options.length]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const key = event.key;
    if (key === "Tab") { setOpen(false); return; }
    if (key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(key)) {
      event.preventDefault();
      if (!open) { show(key === "End" ? options.length - 1 : undefined); return; }
      if (key === "Enter" || key === " ") { choose(active); return; }
      setActive(previous => key === "Home" ? 0 : key === "End" ? options.length - 1 :
        (previous + (key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      search.current = { text: (now - search.current.time < 650 ? search.current.text : "") + key.toLowerCase(), time: now };
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text));
      if (index >= 0) { event.preventDefault(); if (!open) show(index); else setActive(index); }
    }
  }
  return <div className={`studio-select ${className}`}>
    {label && <label id={`${id}-label`} htmlFor={id} className="studio-field-label">{label}</label>}
    <button ref={trigger} id={id} type="button" role="combobox" aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
      aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      aria-labelledby={label ? `${id}-label` : undefined} aria-label={label ? undefined : (ariaLabel ?? placeholder)}
      disabled={disabled} className="studio-select-trigger" onKeyDown={keyboard}
      onClick={event => { event.stopPropagation(); if (open) setOpen(false); else show(); }}>
      <span className="studio-select-value">{selected?.icon}<span>{selected?.label ?? placeholder}</span></span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && position && createPortal(<div ref={menu} className="studio-dropdown" style={{ position: "fixed", ...position }}>
      <div id={`${id}-list`} role="listbox" aria-label={label ?? ariaLabel ?? placeholder} className="studio-select-list"
        style={{ maxHeight: position.maxHeight - 12 }}>
        {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
          aria-selected={option.value === value} data-focused={active === index} className="studio-select-option"
          onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
          <span className="studio-select-value">{option.icon}<span>{option.label}</span></span>
          {option.value === value && <Check size={14} aria-hidden="true" />}
        </div>)}
      </div>
    </div>, document.body)}
  </div>;
}
