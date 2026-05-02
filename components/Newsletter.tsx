"use client";

import { motion } from "framer-motion";
import { Mail, Gift } from "lucide-react";
import { useCallback, useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      if (!turnstileToken) {
        setStatus({ type: "error", text: "Please complete the security check." });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          token: turnstileToken,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not subscribe right now.");

      setEmail("");
      setStatus({ type: "success", text: "You are subscribed to the VIP club." });
      resetTurnstile();
    } catch (error) {
      console.error("Newsletter signup error:", error);
      setStatus({ type: "error", text: "Could not subscribe right now. Please try again." });
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-yellow-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-400 p-12 shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_50%)]" />
          
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-black/10 text-black">
              <Gift className="h-8 w-8" />
            </div>
            
            <h2 className="text-4xl font-black text-black sm:text-5xl mb-4">
              Join Our VIP Club
            </h2>
            <p className="text-lg text-black/80 mb-8">
              Get exclusive access to new releases, special offers, and perfume tips. Plus, enjoy 15% off your first order!
            </p>

            <form onSubmit={handleSubmit} className="mx-auto max-w-md">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="vip-email"
                    name="vip_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    aria-label="Email address for VIP club signup"
                    className="w-full rounded-full border-2 border-white/50 bg-white/90 py-4 pl-12 pr-4 text-black placeholder-zinc-400 backdrop-blur-sm transition focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-black px-8 py-4 font-semibold text-white transition hover:bg-black/90 hover:scale-105"
                >
                  {submitting ? "Subscribing..." : "Subscribe"}
                </button>
              </div>
              <div className="mt-4">
                <TurnstileWidget
                  action="newsletter"
                  resetKey={turnstileResetKey}
                  onVerify={setTurnstileToken}
                  onExpire={resetTurnstile}
                />
              </div>
            </form>

            {status && (
              <p
                className={`mt-4 text-sm font-semibold ${
                  status.type === "success" ? "text-black" : "text-red-800"
                }`}
              >
                {status.text}
              </p>
            )}

            <p className="mt-4 text-sm text-black/70">
              No spam, unsubscribe anytime. Your privacy is protected.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
