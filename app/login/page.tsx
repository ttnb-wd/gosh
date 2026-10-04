"use client";

import StudioErrorText from "@/components/ui/StudioErrorText";
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
   className="studio-login studio-page min-h-screen flex items-center justify-center bg-surface px-4 py-10  lg:py-16"
 > <div className="w-full max-w-5xl"> <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-panel   ">

      <div className="relative grid grid-cols-1 lg:grid-cols-2">

        <div
          className={`studio-login-form relative z-10 order-1 p-8 sm:p-10 lg:p-12 transition-all duration-700 ${
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
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
                GOSH PERFUME
              </p>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="studio-gradient text-3xl font-semibold text-ink  lg:text-4xl">
              {mode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h1>

            <p className="mt-2 text-sm text-muted ">
              {mode === "login"
                ? "Sign in to continue your journey"
                : "Join us and discover luxury fragrances"}
            </p>
          </div>

          {searchParams.get("verified") === "1" && <p role="status" className="mb-6 rounded-xl border border-success bg-success-soft px-5 py-4 text-sm text-success">Your email is verified. Sign in to continue.</p>}
          {accountCreated && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-success bg-success-soft px-5 py-4 text-sm font-bold text-success"
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
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink  " />
                {fieldErrors.fullName && <p id="full-name-error" role="alert" className="mt-1 text-sm text-destructive">{fieldErrors.fullName}</p>}
              </div>
            )}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-bold text-ink "
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
                    ? "border-destructive focus:border-destructive focus:ring-destructive/60"
                    : "border-line focus:border-focus focus:ring-focus/15"
                } bg-surface px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:ring-4    `}
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
                  className="mt-1 text-sm text-destructive"
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
                className="mb-2 block text-sm font-bold text-ink "
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
                    ? "border-destructive focus:border-destructive focus:ring-destructive/60"
                    : "border-line focus:border-focus focus:ring-focus/15"
                } bg-surface px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:ring-4    `}
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
                  className="mt-1 text-sm text-destructive"
                >
                  {
                    fieldErrors.password
                  }
                </p>
              )}

              {mode === "signup" &&
                !fieldErrors.password && (
                  <p className="mt-1 text-xs text-muted ">
                    At least 8 characters with letters and numbers
                  </p>
                )}
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Confirm Password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" required aria-invalid={!!fieldErrors.confirmPassword} aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink  " />
                {fieldErrors.confirmPassword && <p id="confirm-password-error" role="alert" className="mt-1 text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
              </div>
            )}
            {mode === "login" && <Link href="/forgot-password" className="block text-sm text-accent">Forgot Password?</Link>}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-semibold text-destructive"
              >
                <StudioErrorText message={error} />
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
              className="studio-button studio-button--primary w-full rounded-full bg-gradient-to-r from-accent to-accent px-6 py-3 text-sm font-semibold text-ink shadow-panel transition hover:from-accent hover:to-accent disabled:cursor-not-allowed disabled:opacity-60"
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
            className="mt-6 w-full text-center text-sm font-semibold text-muted transition hover:text-accent  "
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          <div className="mt-6 text-center lg:hidden">
            <Link
              href="/"
              className="text-sm font-medium text-secondary transition hover:text-accent  "
            >
              ← Back to Website
            </Link>
          </div>

        </div>

        <div
          className={`studio-login-art relative order-2 hidden overflow-hidden lg:flex lg:items-center lg:justify-center lg:p-12 transition-all duration-700 ${
            mode === "signup"
              ? "lg:order-1"
              : "lg:order-2"
          }`}
        >

          <div className="absolute inset-0 bg-gradient-to-br from-accent via-surface to-accent/80   " />

          <div className="relative z-10 max-w-md text-center">

            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-accent to-accent p-4 shadow-soft">
                <Sparkles
                  className="h-10 w-10 text-on-brand"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h2 className="text-3xl font-semibold text-ink  lg:text-4xl">
              {mode === "login"
                ? "Welcome Back!"
                : "Join GOSH"}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-secondary ">
              {mode === "login"
                ? "Continue your journey through the world of luxury fragrances. Your perfect scent awaits."
                : "Discover handcrafted perfumes that tell your story. Experience elegance in every drop."}
            </p>

            <div className="mx-auto mt-10 max-w-sm space-y-4">

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface/50  ">
                  <Diamond
                    className="h-4 w-4 text-accent"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-ink ">
                  Premium artisan fragrances
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface/50  ">
                  <Gem
                    className="h-4 w-4 text-accent"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-ink ">
                  Handcrafted with finest ingredients
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface/50  ">
                  <Sparkles
                    className="h-4 w-4 text-accent"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm font-semibold text-ink ">
                  Exclusive luxury collections
                </span>
              </div>

            </div>

            <div className="mt-10 hidden lg:block">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-secondary transition hover:text-accent  "
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
       className="studio-page min-h-screen bg-[var(--site-bg)] px-4 py-10 text-ink"
     > <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center"> <div className="text-center"> <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" /> </div> </div> </main>
}
> <LoginForm /> </Suspense>
);
}
