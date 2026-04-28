// Premium Payment Logo Icons - Luxury White/Ivory + Gold Style
import Image from 'next/image';

interface LogoProps {
  className?: string;
  src?: string; // Optional image source path
  alt?: string; // Alt text for image
  useSvg?: boolean; // Toggle between SVG and image
}

export const CashDeliveryLogo = ({ className = "h-12 w-12", src, alt = "Cash on Delivery", useSvg = true }: LogoProps) => {
  if (!useSvg && src) {
    return (
      <div className={className}>
        <Image src={src} alt={alt} width={48} height={48} className="object-contain" />
      </div>
    );
  }
  
  return (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft glow background */}
    <circle cx="32" cy="32" r="28" fill="url(#cashGlow)" opacity="0.3" />
    
    {/* Money stack with gold accents */}
    <rect x="16" y="24" width="32" height="20" rx="3" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1.5" />
    <rect x="18" y="20" width="28" height="18" rx="2.5" fill="#FFF9E6" stroke="#D4AF37" strokeWidth="1.5" />
    <rect x="20" y="16" width="24" height="16" rx="2" fill="url(#cashGradient)" stroke="#D4AF37" strokeWidth="2" />
    
    {/* Dollar symbol */}
    <text x="32" y="30" fontSize="14" fontWeight="bold" fill="#D4AF37" textAnchor="middle">$</text>
    
    {/* Decorative coins */}
    <circle cx="24" cy="42" r="4" fill="url(#coinGradient)" stroke="#D4AF37" strokeWidth="1" />
    <circle cx="40" cy="42" r="4" fill="url(#coinGradient)" stroke="#D4AF37" strokeWidth="1" />
    
    <defs>
      <radialGradient id="cashGlow">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="cashGradient" x1="20" y1="16" x2="44" y2="32">
        <stop offset="0%" stopColor="#FFFEF7" />
        <stop offset="50%" stopColor="#FFF9E6" />
        <stop offset="100%" stopColor="#FFFEF7" />
      </linearGradient>
      <radialGradient id="coinGradient">
        <stop offset="0%" stopColor="#F4E4B0" />
        <stop offset="100%" stopColor="#D4AF37" />
      </radialGradient>
    </defs>
  </svg>
  );
};

export const KBZPayLogo = ({ className = "h-12 w-12", src, alt = "KBZ Pay", useSvg = true }: LogoProps) => {
  if (!useSvg && src) {
    return (
      <div className={className}>
        <Image src={src} alt={alt} width={48} height={48} className="object-contain" />
      </div>
    );
  }
  
  return (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft glow background */}
    <circle cx="32" cy="32" r="28" fill="url(#kbzGlow)" opacity="0.3" />
    
    {/* Premium phone outline */}
    <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#phoneGradient)" stroke="#D4AF37" strokeWidth="2" />
    
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
      <radialGradient id="kbzGlow">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="phoneGradient" x1="22" y1="10" x2="42" y2="54">
        <stop offset="0%" stopColor="#FFFEF7" />
        <stop offset="50%" stopColor="#FFF9E6" />
        <stop offset="100%" stopColor="#FFFEF7" />
      </linearGradient>
    </defs>
  </svg>
  );
};

export const WavePayLogo = ({ className = "h-12 w-12", src, alt = "Wave Pay", useSvg = true }: LogoProps) => {
  if (!useSvg && src) {
    return (
      <div className={className}>
        <Image src={src} alt={alt} width={48} height={48} className="object-contain" />
      </div>
    );
  }
  
  return (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft glow background */}
    <circle cx="32" cy="32" r="28" fill="url(#waveGlow)" opacity="0.3" />
    
    {/* Premium phone outline */}
    <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#wavePhoneGradient)" stroke="#D4AF37" strokeWidth="2" />
    
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
      <radialGradient id="waveGlow">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="wavePhoneGradient" x1="22" y1="10" x2="42" y2="54">
        <stop offset="0%" stopColor="#FFFEF7" />
        <stop offset="50%" stopColor="#FFF9E6" />
        <stop offset="100%" stopColor="#FFFEF7" />
      </linearGradient>
    </defs>
  </svg>
  );
};

export const AYAPayLogo = ({ className = "h-12 w-12", src, alt = "AYA Pay", useSvg = true }: LogoProps) => {
  if (!useSvg && src) {
    return (
      <div className={className}>
        <Image src={src} alt={alt} width={48} height={48} className="object-contain" />
      </div>
    );
  }
  
  return (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft glow background */}
    <circle cx="32" cy="32" r="28" fill="url(#ayaGlow)" opacity="0.3" />
    
    {/* Premium phone outline */}
    <rect x="22" y="10" width="20" height="44" rx="4" fill="url(#ayaPhoneGradient)" stroke="#D4AF37" strokeWidth="2" />
    
    {/* Screen area */}
    <rect x="24" y="14" width="16" height="32" rx="2" fill="#FFFEF7" />
    
    {/* AYA letters with elegant styling */}
    <text x="32" y="28" fontSize="9" fontWeight="bold" fill="#D4AF37" textAnchor="middle">AYA</text>
    
    {/* Decorative diamond */}
    <path 
      d="M 32 34 L 35 37 L 32 40 L 29 37 Z" 
      fill="url(#diamondGradient)" 
      stroke="#D4AF37" 
      strokeWidth="1"
    />
    
    {/* Accent lines */}
    <line x1="28" y1="42" x2="36" y2="42" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
    
    {/* Home button */}
    <circle cx="32" cy="50" r="2" fill="#D4AF37" />
    
    <defs>
      <radialGradient id="ayaGlow">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ayaPhoneGradient" x1="22" y1="10" x2="42" y2="54">
        <stop offset="0%" stopColor="#FFFEF7" />
        <stop offset="50%" stopColor="#FFF9E6" />
        <stop offset="100%" stopColor="#FFFEF7" />
      </linearGradient>
      <linearGradient id="diamondGradient" x1="29" y1="34" x2="35" y2="40">
        <stop offset="0%" stopColor="#F4E4B0" />
        <stop offset="100%" stopColor="#D4AF37" />
      </linearGradient>
    </defs>
  </svg>
  );
};

export const BankTransferLogo = ({ className = "h-12 w-12", src, alt = "Bank Transfer", useSvg = true }: LogoProps) => {
  if (!useSvg && src) {
    return (
      <div className={className}>
        <Image src={src} alt={alt} width={48} height={48} className="object-contain" />
      </div>
    );
  }
  
  return (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft glow background */}
    <circle cx="32" cy="32" r="28" fill="url(#bankGlow)" opacity="0.3" />
    
    {/* Bank building */}
    <path d="M 32 12 L 52 22 L 50 24 L 14 24 L 12 22 Z" fill="url(#roofGradient)" stroke="#D4AF37" strokeWidth="1.5" />
    
    {/* Columns */}
    <rect x="18" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
    <rect x="28" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
    <rect x="38" y="26" width="4" height="18" rx="1" fill="#FFFEF7" stroke="#D4AF37" strokeWidth="1" />
    
    {/* Base */}
    <rect x="12" y="44" width="40" height="4" rx="1" fill="url(#baseGradient)" stroke="#D4AF37" strokeWidth="1.5" />
    
    {/* Door */}
    <rect x="26" y="36" width="8" height="8" rx="1" fill="#D4AF37" opacity="0.3" />
    
    {/* Decorative top element */}
    <circle cx="32" cy="18" r="2" fill="#D4AF37" />
    
    {/* Foundation line */}
    <line x1="10" y1="50" x2="54" y2="50" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
    
    <defs>
      <radialGradient id="bankGlow">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="roofGradient" x1="12" y1="12" x2="52" y2="24">
        <stop offset="0%" stopColor="#F4E4B0" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#F4E4B0" />
      </linearGradient>
      <linearGradient id="baseGradient" x1="12" y1="44" x2="52" y2="48">
        <stop offset="0%" stopColor="#FFFEF7" />
        <stop offset="50%" stopColor="#FFF9E6" />
        <stop offset="100%" stopColor="#FFFEF7" />
      </linearGradient>
    </defs>
  </svg>
  );
};
