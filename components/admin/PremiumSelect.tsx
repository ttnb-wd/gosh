"use client";
import StudioSelect, { type StudioSelectProps } from "@/components/ui/StudioSelect";

export default function PremiumSelect(props: StudioSelectProps & { placeholder: string }) {
  return <StudioSelect {...props} />;
}
