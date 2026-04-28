import type { SVGProps } from "react";

export default function WavePayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft glow background */}
      <circle cx="32" cy="32" r="28" fill="url(#waveGlow-wave)" opacity="0.3" />
      
      {/* Premium phone outline */}
      <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#wavePhoneGradient-wave)" stroke="#D4AF37" strokeWidth="2" />
      
      {/* Screen area */}
      <rect x="24" y="14" width="16" height="32" rx="2" fill="#FFFEF7" />
      
      {/* Wave pattern */}
      <path 
        d="M 26 28 Q 28 24 30 28 T 34 28 Q 36 24 38 28" 
        stroke="#D4AF37" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M 26 34 Q 28 30 30 34 T 34 34 Q 36 30 38 34" 
        stroke="#D4AF37" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.7"
      />
      <path 
        d="M 26 40 Q 28 36 30 40 T 34 40 Q 36 36 38 40" 
        stroke="#D4AF37" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.4"
      />
      
      {/* Home button */}
      <circle cx="32" cy="50" r="2" fill="#D4AF37" />
      
      <defs>
        <radialGradient id="waveGlow-wave">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wavePhoneGradient-wave" x1="22" y1="10" x2="42" y2="54">
          <stop offset="0%" stopColor="#FFFEF7" />
          <stop offset="50%" stopColor="#FFF9E6" />
          <stop offset="100%" stopColor="#FFFEF7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
