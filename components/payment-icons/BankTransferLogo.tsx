import type { SVGProps } from "react";

export default function BankTransferLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft glow background */}
      <circle cx="32" cy="32" r="28" fill="url(#bankGlow-bank)" opacity="0.3" />
      
      {/* Bank building */}
      <path d="M 32 12 L 52 22 L 50 24 L 14 24 L 12 22 Z" fill="url(#roofGradient-bank)" stroke="#D4AF37" strokeWidth="1.5" />
      
      {/* Columns */}
      <rect x="18" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
      <rect x="28" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
      <rect x="38" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
      
      {/* Base */}
      <rect x="12" y="44" width="40" height="4" rx="1" fill="url(#baseGradient-bank)" stroke="#D4AF37" strokeWidth="1.5" />
      
      {/* Door */}
      <rect x="26" y="36" width="8" height="8" rx="1" fill="#D4AF37" opacity="0.3" />
      
      {/* Decorative top element */}
      <circle cx="32" cy="18" r="2" fill="#D4AF37" />
      
      {/* Foundation line */}
      <line x1="10" y1="50" x2="54" y2="50" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      
      <defs>
        <radialGradient id="bankGlow-bank">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="roofGradient-bank" x1="12" y1="12" x2="52" y2="24">
          <stop offset="0%" stopColor="#F4E4B0" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#F4E4B0" />
        </linearGradient>
        <linearGradient id="baseGradient-bank" x1="12" y1="44" x2="52" y2="48">
          <stop offset="0%" stopColor="#FFFEF7" />
          <stop offset="50%" stopColor="#FFF9E6" />
          <stop offset="100%" stopColor="#FFFEF7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
