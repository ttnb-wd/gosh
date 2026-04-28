"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type PremiumSelectOption = {
  label: string;
  value: string;
  icon?: ReactNode;
};

interface PremiumSelectProps {
  value: string;
  placeholder: string;
  options: PremiumSelectOption[];
  onChange: (value: string) => void;
  label?: string;
}

export default function PremiumSelect({
  value,
  placeholder,
  options,
  onChange,
  label,
}: PremiumSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-bold text-neutral-800">
          {label}
        </label>
      )}
      <div ref={wrapperRef} className="relative z-50 w-full">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="group flex w-full items-center justify-between rounded-[22px] border border-yellow-300 bg-white px-5 py-4 text-left shadow-[0_10px_28px_rgba(234,179,8,0.10)] transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50/50 focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200/60"
        >
          <span className="truncate text-sm font-black text-neutral-900 sm:text-base">
            {displayLabel}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-yellow-700 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[999] overflow-hidden rounded-[24px] border border-yellow-200 bg-[#fffdf6]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.16),0_0_32px_rgba(234,179,8,0.18)] backdrop-blur">
            <div className="grid max-h-[280px] gap-1 overflow-y-auto">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={`${option.label}-${option.value}`}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all duration-300 ${
                      active
                        ? "bg-yellow-400 text-black shadow-[0_10px_25px_rgba(234,179,8,0.25)]"
                        : "bg-white text-neutral-700 hover:bg-yellow-50 hover:text-yellow-700"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {option.icon && (
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            active
                              ? "bg-white/80 text-yellow-700"
                              : "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100"
                          }`}
                        >
                          {option.icon}
                        </span>
                      )}
                      <span className="truncate text-sm font-black">
                        {option.label}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
