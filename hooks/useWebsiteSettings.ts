"use client";

import { useEffect, useState } from "react";
import {
  defaultWebsiteSettings,
  getWebsiteSettings,
  type WebsiteSettings,
} from "@/lib/websiteSettings";

export function useWebsiteSettings() {
  const [settings, setSettings] = useState<WebsiteSettings>(
    defaultWebsiteSettings
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWebsiteSettings();
      setSettings(data);
    } catch (err) {
      console.error("useWebsiteSettings error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load website settings"
      );
      setSettings(defaultWebsiteSettings);
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
