import Image from "next/image";
import { CashDeliveryLogo as CashIcon, KBZPayLogo as KBZIcon, WavePayLogo as WaveIcon, AYAPayLogo as AYAIcon, BankTransferLogo as BankIcon } from "./payment-icons";
import type { ComponentType, SVGProps } from "react";
interface LogoProps { className?: string; src?: string; alt?: string; useSvg?: boolean }
function logo(Icon: ComponentType<SVGProps<SVGSVGElement>>, label: string) {
  return function PaymentLogo({ className = "h-12 w-12", src, alt = label, useSvg = true }: LogoProps) {
    return !useSvg && src ? <div className={className}><Image src={src} alt={alt} width={48} height={48} className="object-contain" /></div> : <Icon className={className} aria-label={alt} role="img" />;
  };
}
export const CashDeliveryLogo = logo(CashIcon, "Cash on Delivery");
export const KBZPayLogo = logo(KBZIcon, "KBZPay");
export const WavePayLogo = logo(WaveIcon, "WavePay");
export const AYAPayLogo = logo(AYAIcon, "AYA Pay");
export const BankTransferLogo = logo(BankIcon, "Bank Transfer");
