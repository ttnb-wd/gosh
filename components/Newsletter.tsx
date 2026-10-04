"use client";
import devLog from "@/lib/dev-log";

import { motion } from "framer-motion";
import { Mail, Gift } from "lucide-react";
import { useCallback, useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { FormErrorBoundary } from "./ErrorBoundaries";

function NewsletterContent() {
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
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setStatus({ type: "error", text: emailValidation.error || "Invalid email" });
        setSubmitting(false);
        return;
      }

      if (!turnstileToken) {
        setStatus({ type: "error", text: "Please complete the security check." });
        setSubmitting(false);
        return;
      }

      const normalizedEmail = sanitizeInput(email.trim().toLowerCase());
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
      devLog.error("Newsletter signup error:", error);
      setStatus({ type: "error", text: "Could not subscribe right now. Please try again." });
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section role="region" aria-label="Newsletter signup" className="studio-newsletter bg-[var(--site-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-xl border border-line bg-brand p-12 shadow-panel"
        >
          <div className="absolute inset-0 bg-surface-muted" />
          
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-brand-soft text-ink">
              <Gift className="h-8 w-8" />
            </div>
            
            <h2 className="studio-display studio-gradient mb-4 text-4xl font-semibold text-ink sm:text-5xl">
              Join Our VIP Club
            </h2>
            <p className="mb-8 text-lg text-ink/80">
              Get exclusive access to new releases, special offers, and perfume tips. Plus, enjoy 15% off your first order!
            </p>

            <form onSubmit={handleSubmit} className="mx-auto max-w-md">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
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
                    className="w-full rounded-lg border border-line bg-surface py-4 pl-12 pr-4 text-ink placeholder-muted transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-brand px-8 py-4 font-semibold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand"
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
                role="alert"
                className={`mt-4 text-sm font-semibold ${
                  status.type === "success" ? "text-ink" : "text-destructive"
                }`}
              >
                {status.text}
              </p>
            )}

            <p className="mt-4 text-sm text-ink/70">
              No spam, unsubscribe anytime. Your privacy is protected.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Newsletter() {
  return (
    <FormErrorBoundary context="newsletter-form">
      <NewsletterContent />
    </FormErrorBoundary>
  );
}
