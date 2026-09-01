"use client";
import devLog from "@/lib/dev-log";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
signInWithEmail,
signOutUser,
signUpWithEmail,
} from "@/lib/firebase/auth";
import {
ensureUserProfile,
getUserProfile,
} from "@/lib/firebase/users";
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

function getFirebaseErrorMessage(
error: unknown,
fallback = "Something went wrong. Please try again."
): string {
if (!error || typeof error !== "object") {
return fallback;
}

const firebaseError = error as {
code?: string;
message?: string;
};

switch (firebaseError.code) {
case "auth/invalid-email":
return "Please enter a valid email address.";

case "auth/user-disabled":
  return "This account has been disabled.";

case "auth/user-not-found":
  return "No account found with this email.";

case "auth/wrong-password":
  return "Invalid email or password.";

case "auth/invalid-credential":
  return "Invalid email or password.";

case "auth/email-already-in-use":
  return "An account with this email already exists.";

case "auth/weak-password":
  return "Password is too weak.";

case "auth/network-request-failed":
  return "Network error. Please check your internet connection.";

case "auth/too-many-requests":
  return "Too many attempts. Please try again later.";

case "auth/operation-not-allowed":
  return "Email/password authentication is not enabled.";

default:
  return firebaseError.message || fallback;

}
}

function LoginForm() {
const router = useRouter();
const searchParams = useSearchParams();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [mode, setMode] =
useState<"login" | "signup">("login");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const [redirectTo, setRedirectTo] =
useState<string>("/");

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
  redirect.startsWith("/")
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

const passwordValidation =
  validatePassword(password);

if (!passwordValidation.isValid) {
  newErrors.password =
    passwordValidation.error ||
    "Invalid password";
}

setFieldErrors(newErrors);

return (
  Object.keys(newErrors).length === 0
);


};

const createServerSession = async (
firebaseUser: {
getIdToken: (
forceRefresh?: boolean
) => Promise<string>;
}
) => {
devLog.log(
"[AUTH] Creating Firebase server session..."
);

const idToken =
  await firebaseUser.getIdToken(true);

if (!idToken) {
  throw new Error(
    "Could not get Firebase authentication token."
  );
}

const sessionResponse =
  await fetch(
    "/api/auth/session",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${idToken}`,
      },
      credentials: "include",
    }
  );

const sessionResult =
  (await sessionResponse.json()) as {
    success?: boolean;
    error?: string;
  };

devLog.log(
  "[AUTH] Session HTTP status:",
  sessionResponse.status
);

if (!sessionResponse.ok) {
  devLog.error(
    "[AUTH] Session creation failed:",
    sessionResult
  );

  throw new Error(
    sessionResult.error ||
      "Could not create secure session."
  );
}

devLog.log(
  "[AUTH] Server session created successfully."
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
  devLog.log(
    "[AUTH] STEP 1: Validating form"
  );

  if (!validateForm()) {
    setLoading(false);
    return;
  }

  /*
   * STEP 2
   * Turnstile check
   */
  devLog.log(
    "[AUTH] STEP 2: Turnstile check"
  );

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
    devLog.log(
      "[AUTH] STEP 3: Verifying Turnstile"
    );

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

    if (
      !turnstileResponse.ok
    ) {
      setError(
        turnstileResult.error ||
          "Security check failed. Please try again."
      );

      resetTurnstile();
      setLoading(false);
      return;
    }

    devLog.log(
      "[AUTH] STEP 3 SUCCESS"
    );
  } else {
    devLog.log(
      "[AUTH] STEP 3 SKIPPED - Turnstile unavailable"
    );
  }

  /*
   * SIGNUP
   */
  if (mode === "signup") {
    devLog.log(
      "[AUTH] SIGNUP: Creating Firebase account"
    );

    const credential =
      await signUpWithEmail(
        email.trim(),
        password
      );

    const firebaseUser =
      credential.user;

    await ensureUserProfile(
      firebaseUser.uid,
      firebaseUser.email,
      null
    );

    try {
      await signOutUser();
    } catch (signOutError) {
      devLog.error(
        "[AUTH] Sign out error:",
        signOutError
      );
    }

    router.replace(
      "/login?created=1"
    );

    return;
  }

  /*
   * STEP 4
   * Firebase Login
   */
  devLog.log(
    "[AUTH] STEP 4: Firebase login"
  );

  const credential =
    await signInWithEmail(
      email.trim(),
      password
    );

  const firebaseUser =
    credential.user;

  if (!firebaseUser) {
    throw new Error(
      "Could not verify logged in user."
    );
  }

  devLog.log(
    "[AUTH] STEP 4 SUCCESS",
    {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
    }
  );

  /*
   * STEP 5
   * Load Firestore profile
   */
  devLog.log(
    "[AUTH] STEP 5: Loading profile"
  );

  let profile =
    await getUserProfile(
      firebaseUser.uid
    );

  /*
   * Create profile if missing
   */
  if (!profile) {
    devLog.log(
      "[AUTH] Profile missing. Creating profile..."
    );

    profile =
      await ensureUserProfile(
        firebaseUser.uid,
        firebaseUser.email,
        null
      );
  }

  if (!profile) {
    await signOutUser();

    throw new Error(
      "Profile not found. Please contact admin."
    );
  }

  devLog.log(
    "[AUTH] Profile loaded:",
    {
      role: profile.role,
    }
  );

  /*
   * STEP 6
   * Check account role
   */
  const isAdmin =
    profile.role === "admin";

  devLog.log(
    "[AUTH] STEP 6: Account role",
    {
      role: profile.role,
      isAdmin,
    }
  );

  /*
   * STEP 7
   * Create Firebase server session
   *
   * IMPORTANT:
   *
   * Admin and customer both use
   * the SAME login page.
   *
   * The server session is created
   * for BOTH account types.
   *
   * Admin access is controlled later
   * by requireAdmin().
   */
  devLog.log(
    "[AUTH] STEP 7: Creating server session"
  );

  await createServerSession(
    firebaseUser
  );

  devLog.log(
    "[AUTH] STEP 7 SUCCESS"
  );

  /*
   * STEP 8
   * Redirect
   *
   * Admin does NOT automatically go
   * to /admin anymore.
   *
   * Everyone returns to the website.
   *
   * Admin dashboard button/icon will
   * be displayed by the website UI
   * based on profile.role.
   */
  devLog.log(
    "[AUTH] STEP 8: Redirecting to website"
  );

  const safeRedirect =
    redirectTo &&
    redirectTo.startsWith("/")
      ? redirectTo
      : "/";

  /*
   * Never allow the normal login flow
   * to redirect directly to /admin.
   *
   * Admin enters dashboard by clicking
   * the Admin Dashboard button/icon.
   */
  if (
    safeRedirect === "/admin" ||
    safeRedirect.startsWith(
      "/admin/"
    )
  ) {
    router.replace("/");
  } else {
    router.replace(
      safeRedirect
    );
  }

  router.refresh();

  devLog.log(
    "[AUTH] LOGIN COMPLETE",
    {
      role: profile.role,
      isAdmin,
    }
  );
} catch (error) {
  devLog.error(
    "========================================"
  );

  devLog.error(
    "[AUTH] AUTHENTICATION FAILED"
  );

  devLog.error(
    error
  );

  devLog.error(
    "========================================"
  );

  setError(
    getFirebaseErrorMessage(
      error,
      mode === "signup"
        ? "Could not create account."
        : "Invalid email or password."
    )
  );

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
            className="space-y-5"
          >

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
                minLength={8}
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
