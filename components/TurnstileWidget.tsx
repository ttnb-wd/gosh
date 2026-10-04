"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": (errorCode?: string) => boolean | void;
          theme?: "light" | "dark" | "auto";
          action?: string;
          "response-field"?: boolean;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  action: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError?: (errorCode?: string) => void;
  resetKey?: number;
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const localBypassToken = "__LOCAL_TURNSTILE_BYPASS__";

export default function TurnstileWidget({
  action,
  onVerify,
  onExpire,
  onError,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const isLocalBypass =
    mounted &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLocalBypass) return;
    if (!siteKey) return;

    if (window.turnstile) {
      setScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [isLocalBypass]);

  useEffect(() => {
    if (!isLocalBypass) return;
    onVerify(localBypassToken);
  }, [action, isLocalBypass, onVerify, resetKey]);

  useEffect(() => {
    if (isLocalBypass) return;
    if (!siteKey || !scriptReady || !window.turnstile || !containerRef.current) return;

    setErrorCode(null);

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      containerRef.current.innerHTML = "";
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme,
      "response-field": false,
      callback: onVerify,
      "expired-callback": onExpire,
      "error-callback": (code?: string) => {
        setErrorCode(code || "unknown");
        onError?.(code);
        if (code !== "110200") {
          onExpire();
        }
        return true;
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, isLocalBypass, onError, onExpire, onVerify, resetKey, scriptReady, theme]);

  if (isLocalBypass) {
    return (
      <div
        aria-hidden="true"
        className="hidden"
      />
    );
  }

  if (!siteKey) {
    return (
      <div role="alert" className="rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-semibold text-destructive">
        Security check is not configured.
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-xl border border-line bg-surface/70 px-3 py-3">
      <div ref={containerRef} />
      {errorCode && (
        <span className="sr-only">
          Security check error: {errorCode}
        </span>
      )}
    </div>
  );
}
