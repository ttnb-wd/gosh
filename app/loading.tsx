"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function Loading() {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Only show loading if it takes longer than 400ms
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (!showLoading) {
    return null;
  }

  return <LoadingScreen />;
}
