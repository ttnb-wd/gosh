"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create Supabase client
      const supabase = createSupabaseClient();

      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Get user data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

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
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-yellow-50/30 px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black text-black">
              GOSH <span className="text-yellow-600">ADMIN</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-600">Perfume Dashboard</p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-zinc-100 bg-gradient-to-br from-yellow-50 to-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 shadow-lg shadow-yellow-400/30">
              <Lock className="h-8 w-8 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-black">Admin Login</h2>
            <p className="mt-2 text-sm text-zinc-600">Sign in to access the dashboard</p>
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
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@goshperfume.com"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm font-medium text-black transition focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-400/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-12 text-sm font-medium text-black transition focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black shadow-lg shadow-yellow-400/30 transition hover:bg-yellow-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50 px-8 py-4 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition hover:text-yellow-600"
            >
              ← Back to Website
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-center text-xs text-zinc-500">
          Protected by Supabase Authentication
        </p>
      </div>
    </div>
  );
}
