"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Gift, Sparkles } from "lucide-react";

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: "iframe";
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

const AD_KEY = "c475ce5636ae64717c8980ca7ebf4172";
const AD_SCRIPT_SRC = `https://www.highperformanceformat.com/${AD_KEY}/invoke.js`;
const SMARTLINK_URL =
  "https://www.profitablecpmratenetwork.com/nf36g9fvx?key=87fc9d618ccf3ad30ae781edcfaf51de";

export default function AdsBanner() {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [adFailed, setAdFailed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = adContainerRef.current;

    if (!container || loadedRef.current) {
      return;
    }

    loadedRef.current = true;
    setAdFailed(false);
    container.innerHTML = "";

    window.atOptions = {
      key: AD_KEY,
      format: "iframe",
      height: 50,
      width: 320,
      params: {},
    };

    const script = document.createElement("script");
    script.src = AD_SCRIPT_SRC;
    script.async = true;
    script.dataset.goshAd = AD_KEY;
    script.onerror = () => {
      setAdFailed(true);
    };

    container.appendChild(script);

    return () => {
      loadedRef.current = false;
      container.innerHTML = "";

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handlePreference = (message: string) => {
    window.open(SMARTLINK_URL, "_blank", "noopener,noreferrer");
    setFeedback(message);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 2000);
  };

  return (
    <section role="region" aria-label="Sponsored picks" className="bg-[var(--site-bg)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-white p-4 shadow-[0_18px_45px_rgba(212,175,55,0.12),0_6px_18px_rgba(111,29,27,0.06)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,231,179,0.45),transparent_42%)]" />

          <div className="relative grid items-center gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#fff7e6] text-[#d4af37]">
                <Sparkles className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#6f1d1b]/20 bg-[#f8eeee] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#6f1d1b]">
                    <BadgeCheck className="h-3 w-3" />
                    Ad
                  </span>
                  {feedback && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e6] px-2.5 py-1 text-xs font-bold text-[#6f1d1b]">
                      <Check className="h-3.5 w-3.5" />
                      {feedback}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-[#1f1a14]">Sponsored Picks</h2>
                <p className="text-sm font-medium text-[#7a6a55]">
                  Personalized offers may appear here.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex h-[58px] w-full max-w-[340px] items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#fffaf0] px-2 shadow-inner">
                {adFailed ? (
                  <p className="text-center text-xs font-semibold text-[#7a6a55]">
                    Sponsored content unavailable
                  </p>
                ) : (
                  <div
                    ref={adContainerRef}
                    className="flex h-[50px] w-[320px] max-w-full items-center justify-center overflow-hidden"
                    aria-label="Sponsored advertisement"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <a
                href={SMARTLINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/45 bg-white px-4 py-2 text-sm font-black text-[#6f1d1b] transition hover:-translate-y-0.5 hover:bg-[#fff7e6] hover:text-[#1f1a14]"
              >
                <Sparkles className="h-4 w-4 text-[#d4af37]" />
                Explore Offer
              </a>
              <button
                type="button"
                onClick={() => handlePreference("Saved")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-4 py-2 text-sm font-black text-[#1f1a14] shadow-[0_10px_24px_rgba(212,175,55,0.18)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)]"
              >
                <Check className="h-4 w-4" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => handlePreference("Preference saved")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/25 bg-white px-4 py-2 text-sm font-black text-[#1f1a14] transition hover:-translate-y-0.5 hover:border-[#6f1d1b]/25 hover:bg-[#fff7e6]"
              >
                <Gift className="h-4 w-4 text-[#d4af37]" />
                Hide Ads
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
