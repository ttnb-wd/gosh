import { useState, useEffect } from 'react';

/**
 * Hook that delays showing loading state
 * Only shows loading if it takes longer than the specified delay
 * @param isLoading - Current loading state
 * @param delay - Delay in milliseconds before showing loading (default: 400ms)
 * @returns Whether to show loading indicator
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 400): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showLoading;
}
