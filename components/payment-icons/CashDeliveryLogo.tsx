import type { SVGProps } from "react";

export default function CashDeliveryLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft glow background */}
      <circle cx="32" cy="32" r="28" fill="url(#cashGlow-cod)" opacity="0.3" />
      
      {/* Money stack with gold accents */}
      <rect x="16" y="24" width="32" height="20" rx="3" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x="18" y="20" width="28" height="18" rx="2.5" fill="#FFF9E6" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x="20" y="16" width="24" height="16" rx="2" fill="url(#cashGradient-cod)" stroke="#D4AF37" strokeWidth="2" />
      
      {/* Dollar symbol */}
      <text x="32" y="30" fontSize="14" fontWeight="bold" fill="#D4AF37" textAnchor="middle">$</text>
      
      {/* Decorative coins */}
      <circle cx="24" cy="42" r="4" fill="url(#coinGradient-cod)" stroke="#D4AF37" strokeWidth="1" />
      <circle cx="40" cy="42" r="4" fill="url(#coinGradient-cod)" stroke="#D4AF37" strokeWidth="1" />
      
      <defs>
        <radialGradient id="cashGlow-cod">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cashGradient-cod" x1="20" y1="16" x2="44" y2="32">
          <stop offset="0%" stopColor="#FFFEF7" />
          <stop offset="50%" stopColor="#FFF9E6" />
          <stop offset="100%" stopColor="#FFFEF7" />
        </linearGradient>
        <radialGradient id="coinGradient-cod">
          <stop offset="0%" stopColor="#F4E4B0" />
          <stop offset="100%" stopColor="#D4AF37" />
        </radialGradient>
      </defs>
    </svg>
  );
}
