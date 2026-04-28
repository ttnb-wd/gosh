import type { SVGProps } from "react";

export default function AYAPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft glow background */}
      <circle cx="32" cy="32" r="28" fill="url(#ayaGlow-aya)" opacity="0.3" />
      
      {/* Premium phone outline */}
      <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#ayaPhoneGradient-aya)" stroke="#D4AF37" strokeWidth="2" />
      
      {/* Screen area */}
      <rect x="24" y="14" width="16" height="32" rx="2" fill="#FFFEF7" />
      
      {/* AYA letters with elegant styling */}
      <text x="32" y="28" fontSize="9" fontWeight="bold" fill="#D4AF37" textAnchor="middle">AYA</text>
      
      {/* Decorative diamond */}
      <path 
        d="M 32 34 L 35 37 L 32 40 L 29 37 Z" 
        fill="url(#diamondGradient-aya)" 
        stroke="#D4AF37" 
        strokeWidth="1"
      />
      
      {/* Accent lines */}
      <line x1="28" y1="42" x2="36" y2="42" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Home button */}
      <circle cx="32" cy="50" r="2" fill="#D4AF37" />
      
      <defs>
        <radialGradient id="ayaGlow-aya">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ayaPhoneGradient-aya" x1="22" y1="10" x2="42" y2="54">
          <stop offset="0%" stopColor="#FFFEF7" />
          <stop offset="50%" stopColor="#FFF9E6" />
          <stop offset="100%" stopColor="#FFFEF7" />
        </linearGradient>
        <linearGradient id="diamondGradient-aya" x1="29" y1="34" x2="35" y2="40">
          <stop offset="0%" stopColor="#F4E4B0" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>
    </svg>
  );
}
