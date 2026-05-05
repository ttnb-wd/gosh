"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
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
  resetKey?: number;
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const localBypassToken = "__LOCAL_TURNSTILE_BYPASS__";

export default function TurnstileWidget({
  action,
  onVerify,
  onExpire,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
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
  }, [isLocalBypass, onVerify]);

  useEffect(() => {
    if (isLocalBypass) return;
    if (!siteKey || !scriptReady || !window.turnstile || !containerRef.current) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      containerRef.current.innerHTML = "";
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "light",
      "response-field": false,
      callback: onVerify,
      "expired-callback": onExpire,
      "error-callback": onExpire,
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, isLocalBypass, onExpire, onVerify, resetKey, scriptReady]);

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
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        Security check is not configured.
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-2xl border border-yellow-200 bg-white/70 px-3 py-3">
      <div ref={containerRef} />
    </div>
  );
}
