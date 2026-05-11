"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import { Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
import { validateEmail, validatePassword } from "@/lib/validation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
  }, []);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

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

      // Create Supabase client
      const supabase = createSupabaseClient();

      // Sign in with Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Get user data
      const {
        data: { user },
        error: userError,
      } = await getSupabaseUser(supabase);

      if (userError || !user) {
        throw new Error("Could not verify logged in user");
      }

      // Check if user is admin using profiles table
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
        await supabase.auth.signOut();
        throw new Error("Could not load user profile");
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error("Profile not found. Please contact admin");
      }

      if (profile.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("You do not have admin access");
      }

      // Redirect to admin dashboard
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Invalid email or password");
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main role="main" className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_34%),linear-gradient(135deg,#fffaf0_0%,#ffffff_52%,#fff7e6_100%)] px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#f7e7b3]/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#f8eeee]/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black text-[#1f1a14]">
              GOSH <span className="text-[#b88705]">ADMIN</span>
            </h1>
            <p className="mt-2 text-sm text-[#7a6a55]">Perfume Dashboard</p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-[#d4af37]/15 bg-gradient-to-br from-[#fff7e6] to-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d4af37,#f7d774)] shadow-lg shadow-[#d4af37]/30">
              <Lock className="h-8 w-8 text-[#1f1a14]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1f1a14]">Admin Login</h2>
            <p className="mt-2 text-sm text-[#7a6a55]">Sign in to access the dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#7a6a55]">
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
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }
                  }}
                  required
                  placeholder="admin@goshperfume.com"
                  className={`w-full rounded-xl border ${fieldErrors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : 'border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-[#f7e7b3]/70'} bg-white py-3 pl-12 pr-4 text-sm font-medium text-[#1f1a14] transition focus:outline-none focus:ring-4`}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#7a6a55]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a6a55]/70" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
                  required
                  placeholder="Enter your password"
                  className={`w-full rounded-xl border ${fieldErrors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : 'border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-[#f7e7b3]/70'} bg-white py-3 pl-12 pr-12 text-sm font-medium text-[#1f1a14] transition focus:outline-none focus:ring-4`}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6a55]/70 transition hover:text-[#1f1a14]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <TurnstileWidget
                action="admin_login"
                resetKey={turnstileResetKey}
                onVerify={setTurnstileToken}
                onExpire={resetTurnstile}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#d4af37,#f7d774)] py-3 text-sm font-bold text-[#1f1a14] shadow-lg shadow-[#d4af37]/30 transition hover:scale-[1.02] hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-[#d4af37]/15 bg-[#fffaf0] px-8 py-4 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#7a6a55] transition hover:text-[#6f1d1b]"
            >
              ← Back to Website
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-center text-xs text-[#7a6a55]">
          Protected by Supabase Authentication
        </p>
      </div>
    </main>
  );
}
