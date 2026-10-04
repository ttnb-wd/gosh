"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
signInWithEmail,
createServerSession,
syncUserProfile,
signUpWithEmail,
} from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { verificationPath } from "@/lib/auth/config";
import { getAuthErrorMessage, safeAuthRedirect } from "@/lib/auth/errors";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
import {
validateEmail,
validatePassword,
} from "@/lib/validation";
import {
Sparkles,
Diamond,
Gem,
} from "lucide-react";

function LoginForm() {
const router = useRouter();
const searchParams = useSearchParams();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [fullName, setFullName] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [mode, setMode] =
useState<"login" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "login");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const [redirectTo, setRedirectTo] =
useState<string>(safeAuthRedirect(searchParams.get("redirect")));

const [turnstileToken, setTurnstileToken] =
useState("");

const [turnstileUnavailable, setTurnstileUnavailable] =
useState(false);

const [turnstileResetKey, setTurnstileResetKey] =
useState(0);

const [fieldErrors, setFieldErrors] =
useState<Record<string, string>>({});

const accountCreated =
searchParams.get("created") === "1";

const authMode =
searchParams.get("mode");

const resetTurnstile = useCallback(() => {
setTurnstileToken("");
setTurnstileUnavailable(false);
setTurnstileResetKey(
(key) => key + 1
);
}, []);

const handleTurnstileError =
useCallback((errorCode?: string) => {
if (errorCode === "110200") {
setTurnstileUnavailable(true);
return;
}

  setTurnstileUnavailable(false);
}, []);

useEffect(() => {
const redirect =
searchParams.get("redirect");

if (
  redirect &&
  redirect.startsWith("/") && !redirect.startsWith("//")
) {
  setRedirectTo(redirect);
}

if (
  authMode === "signup" &&
  !accountCreated
) {
  setMode("signup");
}

if (accountCreated) {
  setMode("login");
}

}, [
searchParams,
accountCreated,
authMode,
]);

const validateForm = (): boolean => {
const newErrors: Record<
string,
string
> = {};

const emailValidation =
  validateEmail(email);

if (!emailValidation.isValid) {
  newErrors.email =
    emailValidation.error ||
    "Invalid email";
}

const passwordValidation = mode === "signup" ? validatePassword(password) : { isValid: !!password, error: "Password is required" };

if (!passwordValidation.isValid) {
  newErrors.password =
    passwordValidation.error ||
    "Invalid password";
}

if (mode === "signup") {
  if (fullName.trim().length < 2 || fullName.trim().length > 100) newErrors.fullName = "Enter your full name (2–100 characters).";
  if (password !== confirmPassword) newErrors.confirmPassword = "Passwords must match.";
}
setFieldErrors(newErrors);

return (
  Object.keys(newErrors).length === 0
);

};

const handleAuth = async (
e: React.FormEvent<HTMLFormElement>
) => {
e.preventDefault();

if (loading) {
  return;
}

setError("");
setFieldErrors({});
setLoading(true);

try {
  /*
   * STEP 1
   * Validate form
   */
  

  if (!validateForm()) {
    setLoading(false);
    return;
  }

  /*
   * STEP 2
   * Turnstile check
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
   * STEP 3
   * Verify Turnstile
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

    await turnstileResponse.json();

    if (
      !turnstileResponse.ok
    ) {
      setError(
        "Please try the security check again."
      );

      resetTurnstile();
      setLoading(false);
      return;
    }

    
  } else {
    
  }

  /*
   * SIGNUP
   */
  if (mode === "signup") {
    await signUpWithEmail(email.trim(), password, fullName, safeAuthRedirect(redirectTo, "/account"));
    router.replace(verificationPath(redirectTo, "sent"));
    return;
  }
  const credential = await signInWithEmail(email.trim(), password);
  await syncUserProfile(credential.user);
  try {
    await createServerSession(credential.user);
  } catch (sessionError) {
    if ((sessionError as { code?: string }).code === "email-unverified") {
      router.replace(verificationPath(redirectTo));
      return;
    }
    throw sessionError;
  }
  router.replace(safeAuthRedirect(redirectTo));
  router.refresh();
} catch (error) {
  

  

  

  

  setError(
    getAuthErrorMessage(
      error,
      "Something went wrong. Please try again."
    )
  );

  if (mode === "signup" && auth.currentUser && !auth.currentUser.emailVerified) {
    router.replace(verificationPath(redirectTo, "failed"));
  }
  resetTurnstile();
} finally {
  setLoading(false);
}

};

return ( <main
   role="main"
   className="min-h-screen flex items-center justify-center bg-[#fffaf0] px-4 py-10 dark:bg-[#0f0b07] lg:py-16"
 > <div className="w-full max-w-5xl"> <div className="relative overflow-hidden rounded-3xl border border-yellow-300/70 bg-white shadow-[0_24px_80px_rgba(234,179,8,0.18)] dark:border-[#d4af37]/30 dark:bg-[#15100b] dark:shadow-[0_24px_80px_rgba(0,0,0,0.38)]">

      <div className="relative grid grid-cols-1 lg:grid-cols-2">

        <div
          className={`relative z-10 order-1 p-8 sm:p-10 lg:p-12 transition-all duration-700 ${
            mode === "signup"
              ? "lg:order-2"
              : "lg:order-1"
          }`}
        >

          <div className="mb-8">
            <Link
              href="/"
              className="inline-block"
            >
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-600">
                GOSH PERFUME
              </p>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-neutral-950 dark:!text-[#fff7e6] lg:text-4xl">
              {mode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h1>

            <p className="mt-2 text-sm text-neutral-500 dark:!text-[#fff7e6]/70">
              {mode === "login"
                ? "Sign in to continue your journey"
                : "Join us and discover luxury fragrances"}
            </p>
          </div>

          {searchParams.get("verified") === "1" && <p role="status" className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">Your email is verified. Sign in to continue.</p>}
          {accountCreated && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700"
            >
              Account created successfully. Please log in.
            </div>
          )}

          <form
            onSubmit={handleAuth}
            noValidate
            aria-busy={loading}
            className="space-y-5"
          >

            {mode === "signup" && (
              <div>
                <label htmlFor="full-name" className="mb-2 block text-sm font-bold">Full Name</label>
                <input id="full-name" name="name" autoComplete="name" required minLength={2} maxLength={100} aria-invalid={!!fieldErrors.fullName} aria-describedby={fieldErrors.fullName ? "full-name-error" : undefined}
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-neutral-950 dark:bg-[#1c160f] dark:text-[#fff7e6]" />
                {fieldErrors.fullName && <p id="full-name-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>}
              </div>
            )}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-bold text-neutral-800 dark:!text-[#fff7e6]"
              >
                Email
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
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
                className={`w-full rounded-2xl border ${
                  fieldErrors.email
                    ? "border-red-300 focus:border-red-400 focus:ring-red-200/60"
                    : "border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200/60"
                } bg-white px-4 py-3 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:ring-4 dark:border-[#d4af37]/30 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:placeholder:text-[#fff7e6]/45`}
                placeholder="your@email.com"
                aria-invalid={
                  !!fieldErrors.email
                }
                aria-describedby={
                  fieldErrors.email
                    ? "email-error"
                    : undefined
                }
              />

              {fieldErrors.email && (
                <p
                  id="email-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {
                    fieldErrors.email
                  }
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-bold text-neutral-800 dark:!text-[#fff7e6]"
              >
                Password
              </label>

              <input
                id="login-password"
                name="password"
                type="password"
                required
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
                className={`w-full rounded-2xl border ${
                  fieldErrors.password
                    ? "border-red-300 focus:border-red-400 focus:ring-red-200/60"
                    : "border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200/60"
                } bg-white px-4 py-3 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:ring-4 dark:border-[#d4af37]/30 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:placeholder:text-[#fff7e6]/45`}
                placeholder="Enter your password"
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                aria-invalid={
                  !!fieldErrors.password
                }
                aria-describedby={
                  fieldErrors.password
                    ? "password-error"
                    : undefined
                }
              />

              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {
                    fieldErrors.password
                  }
                </p>
              )}

              {mode === "signup" &&
                !fieldErrors.password && (
                  <p className="mt-1 text-xs text-neutral-500 dark:!text-[#fff7e6]/60">
                    At least 8 characters with letters and numbers
                  </p>
                )}
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Confirm Password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" required aria-invalid={!!fieldErrors.confirmPassword} aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-neutral-950 dark:bg-[#1c160f] dark:text-[#fff7e6]" />
                {fieldErrors.confirmPassword && <p id="confirm-password-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
              </div>
            )}
            {mode === "login" && <Link href="/forgot-password" className="block text-sm text-yellow-700">Forgot Password?</Link>}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </div>
            )}

            <TurnstileWidget
              action={
                mode === "login"
                  ? "login"
                  : "signup"
              }
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:from-yellow-300 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>

          </form>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setError("");
              resetTurnstile();

              setMode(
                (prev) =>
                  prev === "login"
                    ? "signup"
                    : "login"
              );
            }}
            className="mt-6 w-full text-center text-sm font-semibold text-neutral-500 transition hover:text-yellow-700 dark:!text-[#fff7e6]/70 dark:hover:!text-[#d4af37]"
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          <div className="mt-6 text-center lg:hidden">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition hover:text-yellow-600 dark:!text-[#fff7e6]/70 dark:hover:!text-[#d4af37]"
            >
              ← Back to Website
            </Link>
          </div>

        </div>

        <div
          className={`relative order-2 hidden overflow-hidden lg:flex lg:items-center lg:justify-center lg:p-12 transition-all duration-700 ${
            mode === "signup"
              ? "lg:order-1"
              : "lg:order-2"
          }`}
        >

          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-[#fff4c2] to-yellow-200/80 dark:from-[#1c160f] dark:via-[#15100b] dark:to-[#231b12]" />

          <div className="relative z-10 max-w-md text-center">

            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 p-4 shadow-lg">
                <Sparkles
                  className="h-10 w-10 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h2 className="text-3xl font-black text-neutral-950 dark:!text-[#fff7e6] lg:text-4xl">
              {mode === "login"
                ? "Welcome Back!"
                : "Join GOSH"}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-neutral-700 dark:!text-[#fff7e6]/75">
              {mode === "login"
                ? "Continue your journey through the world of luxury fragrances. Your perfect scent awaits."
                : "Discover handcrafted perfumes that tell your story. Experience elegance in every drop."}
            </p>

            <div className="mx-auto mt-10 max-w-sm space-y-4">

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50 dark:border-[#d4af37]/35 dark:bg-[#0f0b07]/80">
                  <Diamond
                    className="h-4 w-4 text-yellow-600"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-neutral-900 dark:!text-[#fff7e6]">
                  Premium artisan fragrances
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50 dark:border-[#d4af37]/35 dark:bg-[#0f0b07]/80">
                  <Gem
                    className="h-4 w-4 text-yellow-600"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-neutral-900 dark:!text-[#fff7e6]">
                  Handcrafted with finest ingredients
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50 dark:border-[#d4af37]/35 dark:bg-[#0f0b07]/80">
                  <Sparkles
                    className="h-4 w-4 text-yellow-600"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-neutral-900 dark:!text-[#fff7e6]">
                  Exclusive luxury collections
                </span>
              </div>

            </div>

            <div className="mt-10 hidden lg:block">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 transition hover:text-yellow-700 dark:!text-[#fff7e6]/75 dark:hover:!text-[#d4af37]"
              >
                ← Back to Website
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</main>

);
}

export default function LoginPage() {
return (
<Suspense
fallback={ <main
       role="main"
       className="min-h-screen bg-[var(--site-bg)] px-4 py-10 text-neutral-950"
     > <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center"> <div className="text-center"> <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" /> </div> </div> </main>
}
> <LoginForm /> </Suspense>
);
}
