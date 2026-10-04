"use client";

import StudioErrorText from "@/components/ui/StudioErrorText";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { signInWithEmail, syncUserProfile, createServerSession } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
import {
  validateEmail,
} from "@/lib/validation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] =
    useState(false);
  const [turnstileResetKey, setTurnstileResetKey] =
    useState(0);

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  /*
   * Reset Cloudflare Turnstile
   */
  const resetTurnstile = useCallback(() => {
    

    setTurnstileToken("");
    setTurnstileUnavailable(false);

    setTurnstileResetKey((key) => key + 1);
  }, []);

  /*
   * Handle Turnstile errors
   */
  const handleTurnstileError = useCallback(
    (errorCode?: string) => {
      

      /*
       * 110200 = Turnstile unavailable
       *
       * We allow login to continue if Turnstile
       * itself is unavailable.
       */
      if (errorCode === "110200") {
        setTurnstileUnavailable(true);
        return;
      }

      setTurnstileUnavailable(false);
    },
    []
  );

  /*
   * Validate login form
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailValidation = validateEmail(email);

    if (!emailValidation.isValid) {
      newErrors.email =
        emailValidation.error || "Invalid email";
    }

    const passwordValidation = { isValid: !!password, error: "Password is required" };

    if (!passwordValidation.isValid) {
      newErrors.password =
        passwordValidation.error ||
        "Invalid password";
    }

    setFieldErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
   * ADMIN LOGIN
   */
  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    
    
    

    if (loading) {
      
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      /*
       * ========================================
       * STEP 1
       * Validate form
       * ========================================
       */
      

      if (!validateForm()) {
        

        setLoading(false);
        return;
      }

      

      /*
       * ========================================
       * STEP 2
       * Check Turnstile
       * ========================================
       */
      

      if (
        !turnstileToken &&
        !turnstileUnavailable
      ) {
        

        setError(
          "Please complete the security check."
        );

        setLoading(false);
        return;
      }

      /*
       * ========================================
       * STEP 3
       * Verify Turnstile
       * ========================================
       */
      if (turnstileToken) {
        

        const turnstileResponse =
          await fetch(
            "/api/verify-turnstile",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                token: turnstileToken,
              }),
            }
          );

        

        const turnstileResult =
          (await turnstileResponse.json()) as {
            error?: string;
          };

        

        if (!turnstileResponse.ok) {
          

          setError(
            turnstileResult.error ||
              "Security check failed. Please try again."
          );

          resetTurnstile();
          setLoading(false);
          return;
        }

        
      } else {
        
      }

      /*
       * ========================================
       * STEP 4
       * Firebase Authentication
       * ========================================
       */
      

      const credential =
        await signInWithEmail(
          email.trim(),
          password
        );

      const firebaseUser = credential.user;

      

      /*
       * ========================================
       * STEP 5
       * Load Firestore profile
       * ========================================
       */
      

      const profile = await syncUserProfile(firebaseUser);

      /*
       * Profile does not exist
       */
      if (!profile) {
        

        await signOut(auth);

        setError("Profile not found. Please contact the administrator.");
        return;
      }

      /*
       * ========================================
       * STEP 6
       * Check admin role
       * ========================================
       */
      

      if (profile.role !== "admin") {
        

        await signOut(auth);

        setError("You do not have admin access.");
        return;
      }

      

      /*
       * ========================================
       * STEP 7
       * Create Firebase server session cookie
       * ========================================
       *
       * This is REQUIRED.
       *
       * Client-side Firebase login alone is NOT
       * enough for Next.js server-side requireAdmin().
       *
       * The server needs:
       *
       * firebase-session
       *
       * HTTP-only cookie.
       */
      

      /*
       * Get Firebase ID token
       */
      await createServerSession(firebaseUser);
      router.replace("/admin");

      /*
       * Refresh Server Components so that
       * adminAuth.ts reads the new cookie.
       */
      router.refresh();

      
    } catch (err: unknown) {
      

      

      

      

      setError(getAuthErrorMessage(err, "Could not sign in to the admin dashboard. Please try again."));
      resetTurnstile();
    } finally {
      

      setLoading(false);
    }
  };

  return (
    <main
      role="main"
      className="studio-admin-login flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-accent-soft/40 hidden" />

        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-brand-soft/70 hidden" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block"
          >
            <h1 className="text-4xl font-semibold text-ink">
              GOSH{" "}
              <span className="text-accent">
                ADMIN
              </span>
            </h1>

            <p className="mt-2 text-sm text-muted">
              Perfume Dashboard
            </p>
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <div className="border-b border-line bg-surface-muted p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-brand shadow-soft shadow-panel/30">
              <Lock className="h-8 w-8 text-ink" />
            </div>

            <h2 className="text-2xl font-bold text-ink">
              Admin Login
            </h2>

            <p className="mt-2 text-sm text-muted">
              Sign in to access the dashboard
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="p-8"
          >
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive bg-destructive-soft p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />

                <p className="text-sm text-destructive">
                  <StudioErrorText message={error} />
                </p>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-muted"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted/70" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(
                      e.target.value
                    );

                    if (
                      fieldErrors.email
                    ) {
                      setFieldErrors(
                        (prev) => {
                          const next = {
                            ...prev,
                          };

                          delete next.email;

                          return next;
                        }
                      );
                    }
                  }}
                  required
                  autoComplete="email"
                  placeholder="admin@goshperfume.com"
                  className={`w-full rounded-xl border ${
                    fieldErrors.email
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-line focus:border-focus focus:ring-accent-soft/70"
                  } bg-surface py-3 pl-12 pr-4 text-sm font-medium text-ink transition focus:outline-none focus:ring-4`}
                />
              </div>

              {fieldErrors.email && (
                <p className="mt-1 text-sm text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-muted"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted/70" />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(
                      e.target.value
                    );

                    if (
                      fieldErrors.password
                    ) {
                      setFieldErrors(
                        (prev) => {
                          const next = {
                            ...prev,
                          };

                          delete next.password;

                          return next;
                        }
                      );
                    }
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full rounded-xl border ${
                    fieldErrors.password
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-line focus:border-focus focus:ring-accent-soft/70"
                  } bg-surface py-3 pl-12 pr-12 text-sm font-medium text-ink transition focus:outline-none focus:ring-4`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/70 transition hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p className="mt-1 text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Cloudflare Turnstile */}
            <div className="mb-6">
              <TurnstileWidget
                action="admin_login"
                resetKey={
                  turnstileResetKey
                }
                onVerify={
                  setTurnstileToken
                }
                onExpire={
                  resetTurnstile
                }
                onError={
                  handleTurnstileError
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-on-brand shadow-soft shadow-panel/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          <div className="border-t border-line bg-surface px-8 py-4 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-muted transition hover:text-brand"
            >
              Back to GOSH
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}