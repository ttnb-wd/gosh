import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function checkAdminAuth() {
  const supabase = await createSupabaseServerClient();

  // Get current user (validates with Supabase Auth server)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { isAdmin: false, user: null };
  }

  // Check if user has admin role in profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { isAdmin: false, user };
  }

  const isAdmin = profile.role === "admin";

  return { isAdmin, user, profile };
}

export async function requireAdminAuth() {
  const { isAdmin, user } = await checkAdminAuth();

  if (!isAdmin) {
    return null;
  }

  return user;
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  // Get current user (validates with Supabase Auth server)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // If not logged in, redirect to login
  if (userError || !user) {
    redirect("/login");
  }

  // Check if user has admin role in profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // If no profile or not admin, redirect to home
  if (profileError || !profile || profile.role !== "admin") {
    redirect("/");
  }

  return user;
}
