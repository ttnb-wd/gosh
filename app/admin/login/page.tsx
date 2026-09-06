"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserProfile } from "@/lib/firebase/users";
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
  validatePassword,
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

    const passwordValidation =
      validatePassword(password);

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
        await signInWithEmailAndPassword(
          auth,
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
      

      const profile =
        await getUserProfile(
          firebaseUser.uid
        );

      

      /*
       * Profile does not exist
       */
      if (!profile) {
        

        await signOut(auth);

        throw new Error(
          "Profile not found. Please contact admin."
        );
      }

      /*
       * ========================================
       * STEP 6
       * Check admin role
       * ========================================
       */
      

      if (profile.role !== "admin") {
        

        await signOut(auth);

        throw new Error(
          `You do not have admin access. Current role: ${profile.role}`
        );
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
      const idToken =
        await firebaseUser.getIdToken(true);

      if (!idToken) {
        

        await signOut(auth);

        throw new Error(
          "Could not get Firebase authentication token."
        );
      }

      

      /*
       * Send ID token to Next.js API
       */
      const sessionResponse =
        await fetch(
          "/api/auth/session",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            credentials: "include",
            cache: "no-store",
          }
        );

      

      const sessionResult =
        (await sessionResponse.json()) as {
          success?: boolean;
          error?: string;
        };

      

      /*
       * Session creation failed
       */
      if (!sessionResponse.ok) {
        

        await signOut(auth);

        throw new Error(
          sessionResult.error ||
            "Could not create secure admin session."
        );
      }

      /*
       * Make sure API explicitly reported success
       */
      if (sessionResult.success !== true) {
        

        await signOut(auth);

        throw new Error(
          "Could not confirm secure admin session."
        );
      }

      

      /*
       * ========================================
       * STEP 8
       * Redirect to Admin Dashboard
       * ========================================
       */
      

      /*
       * router.replace() prevents returning to
       * login page with browser back button.
       */
      router.replace("/admin");

      /*
       * Refresh Server Components so that
       * adminAuth.ts reads the new cookie.
       */
      router.refresh();

      
    } catch (err: unknown) {
      

      

      

      

      const firebaseError =
        err as {
          code?: string;
          message?: string;
        };

      let message =
        "Invalid email or password.";

      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          message =
            "Invalid email or password.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many login attempts. Please try again later.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        case "auth/user-disabled":
          message =
            "This account has been disabled.";
          break;

        default:
          if (
            firebaseError.message?.includes(
              "offline"
            )
          ) {
            message =
              "Could not connect to Firebase. Please check your internet connection.";
          } else if (
            firebaseError.message
          ) {
            message =
              firebaseError.message;
          } else if (
            err instanceof Error
          ) {
            message = err.message;
          }
      }

      setError(message);

      resetTurnstile();
    } finally {
      

      setLoading(false);
    }
  };

  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_34%),linear-gradient(135deg,#fffaf0_0%,#ffffff_52%,#fff7e6_100%)] px-4 py-12"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#f7e7b3]/40 blur-3xl" />

        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#f8eeee]/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block"
          >
            <h1 className="text-4xl font-black text-[#1f1a14]">
              GOSH{" "}
              <span className="text-[#b88705]">
                ADMIN
              </span>
            </h1>

            <p className="mt-2 text-sm text-[#7a6a55]">
              Perfume Dashboard
            </p>
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-white shadow-2xl">
          <div className="border-b border-[#d4af37]/15 bg-gradient-to-br from-[#fff7e6] to-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d4af37,#f7d774)] shadow-lg shadow-[#d4af37]/30">
              <Lock className="h-8 w-8 text-[#1f1a14]" />
            </div>

            <h2 className="text-2xl font-bold text-[#1f1a14]">
              Admin Login
            </h2>

            <p className="mt-2 text-sm text-[#7a6a55]">
              Sign in to access the dashboard
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="p-8"
          >
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />

                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#7a6a55]"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a6a55]/70" />

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
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                      : "border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-[#f7e7b3]/70"
                  } bg-white py-3 pl-12 pr-4 text-sm font-medium text-[#1f1a14] transition focus:outline-none focus:ring-4`}
                />
              </div>

              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-[#7a6a55]"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a6a55]/70" />

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
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                      : "border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-[#f7e7b3]/70"
                  } bg-white py-3 pl-12 pr-12 text-sm font-medium text-[#1f1a14] transition focus:outline-none focus:ring-4`}
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6a55]/70 transition hover:text-[#1f1a14]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">
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
              className="w-full rounded-xl bg-[linear-gradient(135deg,#d4af37,#f7d774)] py-3 text-sm font-bold text-[#1f1a14] shadow-lg shadow-[#d4af37]/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          <div className="border-t border-[#d4af37]/15 bg-[#fffaf0] px-8 py-4 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#7a6a55] transition hover:text-[#6f1d1b]"
            >
              Back to GOSH
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}