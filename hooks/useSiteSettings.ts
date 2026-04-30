"use client";

import { useEffect, useState } from "react";
import {
  getDefaultSettings,
  getSiteSettings,
  SiteSettings,
} from "@/lib/siteSettings";

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSiteSettings();
      setSettings(data);
    } catch (err: unknown) {
      console.error("useSiteSettings error:", err);
      setError(err instanceof Error ? err.message : "Failed to load site settings");
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    refreshSettings,
  };
}
