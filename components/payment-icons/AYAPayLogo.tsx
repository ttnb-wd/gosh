import type { SVGProps } from "react";
export default function AYAPayLogo(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="6" width="28" height="50" rx="6" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" /><path d="M27 12h10M29 50h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" /><text x="32" y="34" fontSize="8" fontFamily="sans-serif" fontWeight="500" fill="var(--accent)" textAnchor="middle">AYA</text></svg>;
}
