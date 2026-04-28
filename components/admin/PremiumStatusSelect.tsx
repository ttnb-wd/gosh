"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

type StatusType = "order" | "payment";

const orderOptions = [
  { label: "Pending", value: "Pending", icon: Clock },
  { label: "Confirmed", value: "Confirmed", icon: PackageCheck },
  { label: "Processing", value: "Processing", icon: RotateCcw },
  { label: "Delivered", value: "Delivered", icon: Truck },
  { label: "Cancelled", value: "Cancelled", icon: XCircle },
];

const paymentOptions = [
  { label: "Unpaid", value: "Unpaid", icon: CreditCard },
  { label: "Verifying", value: "Verifying", icon: Clock },
  { label: "Paid", value: "Paid", icon: ShieldCheck },
  { label: "Failed", value: "Failed", icon: AlertTriangle },
  { label: "Refunded", value: "Refunded", icon: RotateCcw },
];

const statusStyles: Record<string, string> = {
  Pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Confirmed: "border-blue-200 bg-blue-50 text-blue-700",
  Processing: "border-purple-200 bg-purple-50 text-purple-700",
  Delivered: "border-green-200 bg-green-50 text-green-700",
  Cancelled: "border-red-200 bg-red-50 text-red-700",
  Unpaid: "border-zinc-200 bg-zinc-50 text-zinc-700",
  Verifying: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Paid: "border-green-200 bg-green-50 text-green-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Refunded: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default function PremiumStatusSelect({
  value,
  type,
  onChange,
  disabled = false,
}: {
  value: string;
  type: StatusType;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const options = type === "order" ? orderOptions : paymentOptions;
  const selected = options.find((option) => option.value === value) || options[0];
  const SelectedIcon = selected.icon;
  const selectedStyle = statusStyles[selected.value] || statusStyles.Pending;

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
    <div ref={wrapperRef} className="relative z-[9999] inline-block w-full overflow-visible sm:w-auto">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center justify-between gap-2 rounded-full border px-4 py-2 text-xs font-black shadow-sm transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${selectedStyle}`}
      >
        <span className="inline-flex items-center gap-2">
          <SelectedIcon className="h-3.5 w-3.5" />
          {selected.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[99999] w-[220px] overflow-hidden rounded-2xl border border-yellow-200 bg-[#fffdf6] p-2 shadow-[0_20px_55px_rgba(0,0,0,0.18),0_0_26px_rgba(234,179,8,0.14)] backdrop-blur">
          <div className="grid gap-1">
            {options.map((option) => {
              const active = option.value === selected.value;
              const OptionIcon = option.icon;
              const optionStyle = statusStyles[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-black transition-all duration-300 ${
                    active
                      ? optionStyle
                      : "bg-white text-neutral-700 hover:bg-yellow-50 hover:text-yellow-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <OptionIcon className="h-3.5 w-3.5" />
                    {option.label}
                  </span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
