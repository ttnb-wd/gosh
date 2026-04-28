import type { SVGProps } from "react";

export default function KBZPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft glow background */}
      <circle cx="32" cy="32" r="28" fill="url(#kbzGlow-kbz)" opacity="0.3" />
      
      {/* Premium phone outline */}
      <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#phoneGradient-kbz)" stroke="#D4AF37" strokeWidth="2" />
      
      {/* Screen area */}
      <rect x="24" y="14" width="16" height="32" rx="2" fill="#FFFEF7" />
      
      {/* KBZ letter styling */}
      <text x="32" y="32" fontSize="10" fontWeight="bold" fill="#D4AF37" textAnchor="middle">KBZ</text>
      
      {/* Signal waves */}
      <path d="M 28 20 Q 32 18 36 20" stroke="#D4AF37" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 26 23 Q 32 20 38 23" stroke="#D4AF37" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      
      {/* Home button */}
      <circle cx="32" cy="50" r="2" fill="#D4AF37" />
      
      <defs>
        <radialGradient id="kbzGlow-kbz">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="phoneGradient-kbz" x1="22" y1="10" x2="42" y2="54">
          <stop offset="0%" stopColor="#FFFEF7" />
          <stop offset="50%" stopColor="#FFF9E6" />
          <stop offset="100%" stopColor="#FFFEF7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
