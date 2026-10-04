"use client";
import { Clock, CreditCard, PackageCheck, RotateCcw, ShieldCheck, Truck, XCircle, AlertTriangle } from "lucide-react";
import StudioSelect from "@/components/ui/StudioSelect";
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
export default function PremiumStatusSelect({ value, type, onChange, disabled = false }: {
  value: string; type: "order" | "payment"; onChange: (value: string) => void; disabled?: boolean;
}) {
  const options = type === "order" ? orderOptions : paymentOptions;
  const selected = options.find(option => option.value === value) || options[0];
  return <StudioSelect className="studio-status-select" value={selected.value} disabled={disabled}
    ariaLabel={type === "order" ? "Order status" : "Payment status"} onChange={onChange}
    options={options.map(({ icon: Icon, ...option }) => ({ ...option, icon: <Icon size={14} aria-hidden="true" /> }))} />;
}
