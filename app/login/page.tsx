"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirectTo, setRedirectTo] = useState<string>("/");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const accountCreated = searchParams.get("created") === "1";

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
  }, []);

  // Get redirect parameter from URL
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectTo(redirect);
    }
    
    // Switch to login mode if account was just created
    if (accountCreated) {
      setMode("login");
    }
  }, [searchParams, accountCreated]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!turnstileToken) {
        setError("Please complete the security check.");
        setLoading(false);
        return;
      }

      const turnstileResponse = await fetch("/api/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const turnstileResult = (await turnstileResponse.json()) as { error?: string };
      if (!turnstileResponse.ok) {
        setError(turnstileResult.error || "Security check failed. Please try again.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      // Signup flow - creates customer and redirects to login page
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          resetTurnstile();
          setLoading(false);
          return;
        }

        const user = data.user;
        if (user) {
          // Create profile with customer role
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            role: "customer",
          });
        }

        // Sign out to prevent auto-login
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Sign out error:", signOutError);
        }

        // Redirect to login page with success message (replace to prevent back navigation)
        router.replace("/login?created=1");
        return;
      }

      // Login flow - check role and redirect accordingly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        resetTurnstile();
        setLoading(false);
        return;
      }

      // Get user data after successful sign in
      const {
        data: { user },
        error: userError,
      } = await getSupabaseUser(supabase);

      if (userError || !user) {
        setError("Could not verify logged in user.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      // Fetch profile to check role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error details:", {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        });
        setError("Could not load user profile.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      if (!profile) {
        setError("Profile not found. Please contact admin.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      // Redirect logic:
      // 1. If redirect parameter exists, respect it (unless admin going to non-checkout page)
      // 2. If no redirect and user is admin, go to /admin
      // 3. Otherwise go to home
      if (redirectTo && redirectTo !== "/") {
        // If there's a redirect, use it
        router.push(redirectTo);
      } else if (profile.role === "admin") {
        // Admin without redirect goes to admin dashboard
        router.push("/admin");
      } else {
        // Normal user without redirect goes home
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      resetTurnstile();
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffdf6] px-4 py-10 text-neutral-950">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-yellow-300/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(234,179,8,0.18)] sm:p-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-600">
                GOSH PERFUME
              </p>
            </Link>
            <h1 className="mt-3 text-3xl font-black text-neutral-950">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {mode === "login"
                ? "Sign in to your account"
                : "Sign up to start shopping"}
            </p>
          </div>

          {accountCreated && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
              Account created successfully. Please log in.
            </div>
          )}

          <form onSubmit={handleAuth} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-neutral-800">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-neutral-800">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <TurnstileWidget
              action={mode === "login" ? "login" : "signup"}
              resetKey={turnstileResetKey}
              onVerify={setTurnstileToken}
              onExpire={resetTurnstile}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
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
              setMode((prev) => (prev === "login" ? "signup" : "login"));
            }}
            className="mt-5 w-full text-center text-sm font-semibold text-neutral-500 transition hover:text-yellow-700"
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition hover:text-yellow-600"
            >
              ← Back to Website
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#fffdf6] px-4 py-10 text-neutral-950">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent"></div>
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
