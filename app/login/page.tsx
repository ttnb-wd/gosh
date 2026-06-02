"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
import { validateEmail, validatePassword } from "@/lib/validation";
import { Sparkles, Diamond, Gem } from "lucide-react";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || "Invalid email";
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || "Invalid password";
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      // Validate form
      if (!validateForm()) {
        setLoading(false);
        return;
      }

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
    <main role="main" className="min-h-screen flex items-center justify-center bg-[#fffaf0] px-4 py-10 lg:py-16">
      {/* Split Card Container */}
      <div className="w-full max-w-5xl">
        {/* Premium Auth Card */}
        <div className="relative overflow-hidden rounded-3xl border border-yellow-300/70 bg-white shadow-[0_24px_80px_rgba(234,179,8,0.18)]">
          
          {/* Desktop Split Layout */}
          <div className="relative grid grid-cols-1 lg:grid-cols-2">
            
            {/* Form Side - Left on Login, Right on Signup */}
            <div className={`relative z-10 order-1 p-8 sm:p-10 lg:p-12 transition-all duration-700 ${mode === "signup" ? "lg:order-2" : "lg:order-1"}`}>
              
              {/* Logo */}
              <div className="mb-8">
                <Link href="/" className="inline-block">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-600">
                    GOSH PERFUME
                  </p>
                </Link>
              </div>

              {/* Form Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-black text-neutral-950 lg:text-4xl">
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  {mode === "login"
                    ? "Sign in to continue your journey"
                    : "Join us and discover luxury fragrances"}
                </p>
              </div>

              {accountCreated && (
                <div role="alert" className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
                  Account created successfully. Please log in.
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleAuth} className="space-y-5">
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-2xl border ${fieldErrors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-200/60' : 'border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200/60'} bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:ring-4`}
                    placeholder="your@email.com"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.password;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-2xl border ${fieldErrors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-200/60' : 'border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200/60'} bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:ring-4`}
                    placeholder="••••••••"
                    minLength={8}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  />
                  {fieldErrors.password && (
                    <p id="password-error" className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                  )}
                  {mode === "signup" && !fieldErrors.password && (
                    <p className="mt-1 text-xs text-neutral-500">At least 8 characters with letters and numbers</p>
                  )}
                </div>

                {error && (
                  <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
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
                  className="w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:from-yellow-300 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>

              {/* Switch Mode */}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  resetTurnstile();
                  setMode((prev) => (prev === "login" ? "signup" : "login"));
                }}
                className="mt-6 w-full text-center text-sm font-semibold text-neutral-500 transition hover:text-yellow-700"
              >
                {mode === "login"
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>

              {/* Back Link */}
              <div className="mt-6 text-center lg:hidden">
                <Link
                  href="/"
                  className="text-sm font-medium text-zinc-600 transition hover:text-yellow-600"
                >
                  ← Back to Website
                </Link>
              </div>
            </div>

            {/* Welcome Panel - Right on Login, Left on Signup */}
            <div className={`relative order-2 hidden overflow-hidden lg:flex lg:items-center lg:justify-center lg:p-12 transition-all duration-700 ${mode === "signup" ? "lg:order-1" : "lg:order-2"}`}>
              
              {/* Premium Gold Panel Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-[#fff4c2] to-yellow-200/80" />
              
              {/* Content */}
              <div className="relative z-10 max-w-md text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 p-4 shadow-lg">
                    <Sparkles className="h-10 w-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-neutral-950 lg:text-4xl">
                  {mode === "login" ? "Welcome Back!" : "Join GOSH"}
                </h2>
                
                <p className="mt-4 text-base leading-relaxed text-neutral-700">
                  {mode === "login" 
                    ? "Continue your journey through the world of luxury fragrances. Your perfect scent awaits."
                    : "Discover handcrafted perfumes that tell your story. Experience elegance in every drop."}
                </p>

                <div className="mx-auto mt-10 max-w-sm space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50">
                      <Diamond className="h-4 w-4 text-yellow-600" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">Premium artisan fragrances</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50">
                      <Gem className="h-4 w-4 text-yellow-600" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">Handcrafted with finest ingredients</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/70 bg-white/50">
                      <Sparkles className="h-4 w-4 text-yellow-600" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">Exclusive luxury collections</span>
                  </div>
                </div>

                {/* Back Link - Desktop Only */}
                <div className="mt-10 hidden lg:block">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 transition hover:text-yellow-700"
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
    <Suspense fallback={
      <main role="main" className="min-h-screen bg-[var(--site-bg)] px-4 py-10 text-neutral-950">
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
