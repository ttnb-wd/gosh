import { createServerClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * ============================================================
 * Supabase Environment Configuration
 * ============================================================
 */

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
};

/**
 * ============================================================
 * Server Supabase Client
 * ============================================================
 *
 * Used by:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 *
 * Authentication is stored in cookies.
 *
 * IMPORTANT:
 * A new client must be created for every request.
 * Never store this client in a global variable.
 */

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /**
       * Read authentication cookies.
       */
      getAll() {
        return cookieStore.getAll();
      },

      /**
       * Write refreshed authentication cookies.
       *
       * Server Components may not be able to modify cookies.
       * The Proxy handles session refreshes and response cookies.
       */
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /**
           * Expected when called from a Server Component.
           *
           * The Proxy is responsible for refreshing the
           * authentication session and writing cookies.
           */
        }
      },
    },

    auth: {
      /**
       * PKCE is the correct flow for SSR applications.
       */
      flowType: "pkce",

      /**
       * Session refresh is handled by proxy.ts.
       */
      autoRefreshToken: false,

      /**
       * URL-based auth callback handling is performed
       * by the browser/auth callback flow.
       */
      detectSessionInUrl: false,

      /**
       * Server authentication state is stored in cookies.
       */
      persistSession: false,
    },
  });
};

/**
 * ============================================================
 * Authenticated User Result
 * ============================================================
 */

export type AuthenticatedUserResult = {
  user: User | null;
  claims: Record<string, unknown> | null;
  error: Error | null;
};

/**
 * ============================================================
 * Get Authenticated User
 * ============================================================
 *
 * This is the standard server-side authentication helper.
 *
 * Flow:
 *
 * 1. Create request-scoped Supabase client.
 * 2. Verify JWT using getClaims().
 * 3. Extract user ID from `sub`.
 * 4. Fetch the current user with getUser().
 *
 * `getClaims()` is used for authentication verification.
 * `getUser()` is used when we need the current user record.
 */

export const getAuthenticatedUser =
  async (): Promise<AuthenticatedUserResult> => {
    const supabase = await createSupabaseServerClient();

    /**
     * Verify the JWT.
     *
     * Do NOT replace this with getSession() for authorization.
     */
    const {
      data: claimsData,
      error: claimsError,
    } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims) {
      return {
        user: null,
        claims: null,
        error:
          claimsError ??
          new Error("Authentication required."),
      };
    }

    const claims = claimsData.claims as Record<string, unknown>;

    /**
     * Supabase JWT subject = user ID.
     */
    const userId =
      typeof claims.sub === "string"
        ? claims.sub
        : null;

    if (!userId) {
      return {
        user: null,
        claims,
        error: new Error(
          "Authenticated token does not contain a valid user ID."
        ),
      };
    }

    /**
     * Get the current user from Supabase Auth.
     *
     * This makes a server-side request and gives us
     * the authoritative user record.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        user: null,
        claims,
        error:
          userError ??
          new Error("Authenticated user not found."),
      };
    }

    /**
     * Make sure the authenticated user matches
     * the JWT subject.
     */
    if (user.id !== userId) {
      return {
        user: null,
        claims,
        error: new Error(
          "Authenticated user does not match token."
        ),
      };
    }

    return {
      user,
      claims,
      error: null,
    };
  };

/**
 * ============================================================
 * Admin / Service Role Client
 * ============================================================
 *
 * SECURITY:
 *
 * SUPABASE_SERVICE_ROLE_KEY:
 * - MUST remain server-side
 * - MUST NEVER use NEXT_PUBLIC_
 * - MUST NEVER be sent to the browser
 * - MUST NEVER be returned in an API response
 *
 * This client bypasses Row Level Security.
 *
 * Only use it in trusted server-side code.
 */

export const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        /**
         * Service-role clients do not manage
         * browser authentication sessions.
         */
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },

      global: {
        headers: {
          "x-client-info":
            "gosh-perfume-admin-server",
        },
      },
    }
  );
};

/**
 * ============================================================
 * Get Authenticated Admin
 * ============================================================
 *
 * Authentication:
 *   Supabase Auth / JWT
 *
 * Authorization:
 *   profiles.role === "admin"
 *
 * IMPORTANT:
 * Never trust:
 * - user_metadata.role
 * - request body role
 * - query parameters
 * - client-side role
 *
 * The database `profiles.role` is authoritative.
 */

export const getAuthenticatedAdmin = async () => {
  /**
   * First verify authentication.
   */
  const authResult = await getAuthenticatedUser();

  if (authResult.error || !authResult.user) {
    return {
      user: null,
      profile: null,
      claims: authResult.claims,
      error:
        authResult.error ??
        new Error("Authentication required."),
    };
  }

  /**
   * Use service role only for the server-side
   * authorization lookup.
   */
  const adminClient = getSupabaseAdmin();

  const {
    data: profile,
    error: profileError,
  } = await adminClient
    .from("profiles")
    .select(
      "id, email, role, full_name"
    )
    .eq("id", authResult.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      user: authResult.user,
      profile: null,
      claims: authResult.claims,
      error: profileError,
    };
  }

  if (!profile) {
    return {
      user: authResult.user,
      profile: null,
      claims: authResult.claims,
      error: new Error(
        "User profile not found."
      ),
    };
  }

  /**
   * Database role is the authorization source.
   */
  if (profile.role !== "admin") {
    return {
      user: authResult.user,
      profile,
      claims: authResult.claims,
      error: new Error(
        "Admin access required."
      ),
    };
  }

  return {
    user: authResult.user,
    profile,
    claims: authResult.claims,
    error: null,
  };
};

/**
 * ============================================================
 * Legacy Compatibility
 * ============================================================
 *
 * Some old files may still import `supabaseAdmin`.
 *
 * DO NOT create a service-role client globally.
 *
 * Use:
 *
 *   getSupabaseAdmin()
 *
 * instead.
 */

export const supabaseAdmin: SupabaseClient | null =
  null;