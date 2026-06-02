"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingScreen from "./LoadingScreen";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const showLoading = useDelayedLoading(isLoading, 400);
  const pathname = usePathname();

  // Show loading on route change only if it takes time
  useEffect(() => {
    setIsLoading(true);
    
    // If page loads quickly, hide loading before delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {showLoading && <LoadingScreen />}
      {children}
    </>
  );
}
