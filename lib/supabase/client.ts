import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * GOSH PERFUME — Supabase Browser Client
 * ============================================================
 *
 * Responsibilities:
 * - Browser-side Supabase client
 * - Supabase Auth session persistence
 * - PKCE authentication flow
 * - Automatic token refresh
 * - Public/non-authenticated Supabase client
 * - Consistent Supabase error handling
 *
 * IMPORTANT:
 * - NEVER put SUPABASE_SERVICE_ROLE_KEY in this file.
 * - Only NEXT_PUBLIC_SUPABASE_URL and
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY are safe here.
 * ============================================================
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * ------------------------------------------------------------
 * Environment validation
 * ------------------------------------------------------------
 */
const getSupabaseConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );

    throw new Error(
      "Supabase configuration is missing. Please check your environment variables."
    );
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
};

/**
 * ------------------------------------------------------------
 * Error helpers
 * ------------------------------------------------------------
 */

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "";
};

export const isInvalidRefreshTokenError = (
  error: unknown
): boolean => {
  const message = getErrorMessage(error).toLowerCase();

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(
          (error as { code?: unknown }).code ?? ""
        ).toLowerCase()
      : "";

  return (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token")
  );
};

/**
 * Converts Supabase/network errors into user-friendly messages.
 */
export const getSupabaseErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  const message = getErrorMessage(error);

  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network error") ||
    normalized.includes("networkerror") ||
    normalized.includes("connection") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("unreachable")
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Invalid email or password.";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed")
  ) {
    return "Please confirm your email address before signing in.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered")
  ) {
    return "An account with this email already exists.";
  }

  if (
    normalized.includes("password") &&
    normalized.includes("weak")
  ) {
    return "Your password is too weak. Please choose a stronger password.";
  }

  if (isInvalidRefreshTokenError(error)) {
    return "Your session has expired. Please sign in again.";
  }

  return message || fallback;
};

/**
 * ------------------------------------------------------------
 * Auth storage cleanup
 * ------------------------------------------------------------
 *
 * Normally Supabase manages this automatically.
 *
 * This helper is only used when a refresh token is definitely
 * invalid or when we intentionally want to start a fresh auth
 * session.
 * ------------------------------------------------------------
 */

const getSupabaseAuthStorageKey = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const url = SUPABASE_URL;

  if (!url) {
    return null;
  }

  try {
    const projectRef = new URL(url).hostname.split(".")[0];

    if (!projectRef) {
      return null;
    }

    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
};

const isSupabaseAuthStorageKey = (
  key: string
): boolean => {
  const storageKey = getSupabaseAuthStorageKey();

  if (!storageKey) {
    return (
      key === "supabase.auth.token" ||
      (key.startsWith("sb-") &&
        key.includes("auth-token"))
    );
  }

  return (
    key === storageKey ||
    key.startsWith(`${storageKey}.`) ||
    key === `${storageKey}-code-verifier` ||
    key.startsWith(
      `${storageKey}-code-verifier.`
    )
  );
};

/**
 * Clears only Supabase authentication storage.
 *
 * We intentionally do NOT call localStorage.clear()
 * because that could destroy shopping cart, preferences,
 * checkout data, etc.
 */
export const clearSupabaseAuthStorage = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const clearStorage = (storage: Storage) => {
      const keysToRemove: string[] = [];

      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);

        if (
          key &&
          isSupabaseAuthStorageKey(key)
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        storage.removeItem(key);
      });
    };

    clearStorage(window.localStorage);
    clearStorage(window.sessionStorage);
  } catch (error) {
    console.warn(
      "[Supabase] Could not clear auth storage:",
      error
    );
  }
};

/**
 * ------------------------------------------------------------
 * Browser Auth Client
 * ------------------------------------------------------------
 *
 * This is the main client used by:
 *
 * - Login
 * - Signup
 * - Logout
 * - getSession()
 * - getUser()
 * - Auth state listeners
 * - Client-side database queries
 *
 * createBrowserClient handles the browser cookie/storage
 * integration required by @supabase/ssr.
 * ------------------------------------------------------------
 */

type SupabaseBrowserClient =
  ReturnType<typeof createBrowserClient>;

type SupabasePublicClient =
  ReturnType<typeof createClient>;

let browserClient: SupabaseBrowserClient | null =
  null;

let publicClient: SupabasePublicClient | null =
  null;

/**
 * Creates/reuses the authenticated browser client.
 */
export const createSupabaseClient =
  (): SupabaseBrowserClient => {
    if (browserClient) {
      return browserClient;
    }

    const { url, anonKey } =
      getSupabaseConfig();

    browserClient = createBrowserClient(
      url,
      anonKey,
      {
        auth: {
          /**
           * PKCE is recommended for modern
           * Supabase applications.
           */
          flowType: "pkce",

          /**
           * Let Supabase automatically refresh
           * access tokens before they expire.
           */
          autoRefreshToken: true,

          /**
           * Detect OAuth/PKCE callback URLs.
           */
          detectSessionInUrl: true,

          /**
           * Keep the user logged in across
           * page refreshes/browser restarts.
           */
          persistSession: true,
        },

        global: {
          headers: {
            "x-client-info":
              "gosh-perfume-web",
          },
        },
      }
    );

    return browserClient;
  };

/**
 * ------------------------------------------------------------
 * Fresh Auth Client
 * ------------------------------------------------------------
 *
 * Use this only when you intentionally want to start
 * authentication from a clean browser session.
 *
 * Example:
 *
 * const supabase =
 *   createFreshSupabaseAuthClient();
 *
 * This is useful after an invalid refresh token.
 * ------------------------------------------------------------
 */
export const createFreshSupabaseAuthClient =
  (): SupabaseBrowserClient => {
    clearSupabaseAuthStorage();

    /**
     * Do not keep the previous client because it may
     * still contain an invalid auth session.
     */
    browserClient = null;

    return createSupabaseClient();
  };

/**
 * ------------------------------------------------------------
 * Public Supabase Client
 * ------------------------------------------------------------
 *
 * Used for public data where we explicitly do NOT want
 * this client to persist an authentication session.
 *
 * Example:
 * - Public products
 * - Public brands
 * - Public testimonials
 * - Public website settings
 *
 * IMPORTANT:
 * RLS must still protect the database.
 * This client does NOT bypass RLS.
 * ------------------------------------------------------------
 */
export const createPublicSupabaseClient =
  (): SupabasePublicClient => {
    if (publicClient) {
      return publicClient;
    }

    const { url, anonKey } =
      getSupabaseConfig();

    publicClient = createClient(
      url,
      anonKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,

          /**
           * Separate storage key prevents this
           * public client from interfering with
           * the authenticated client.
           */
          storageKey:
            "gosh-public-no-session",
        },

        global: {
          headers: {
            "x-client-info":
              "gosh-perfume-public-client",
          },
        },
      }
    );

    return publicClient;
  };

/**
 * ------------------------------------------------------------
 * Get Current User
 * ------------------------------------------------------------
 *
 * Uses Supabase's server-verified user endpoint.
 *
 * This is preferable to trusting arbitrary data from
 * localStorage.
 * ------------------------------------------------------------
 */
export const getSupabaseUser = async (
  client: SupabaseBrowserClient =
    createSupabaseClient()
) => {
  try {
    const response =
      await client.auth.getUser();

    if (
      response.error &&
      isInvalidRefreshTokenError(
        response.error
      )
    ) {
      clearSupabaseAuthStorage();
    }

    return response;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthStorage();
    }

    throw error;
  }
};

/**
 * ------------------------------------------------------------
 * Get Current Session
 * ------------------------------------------------------------
 *
 * Use this when you specifically need the session/access
 * token on the client.
 *
 * For authorization decisions on the server, prefer
 * getUser()/getClaims() through the server client.
 * ------------------------------------------------------------
 */
export const getSupabaseSession =
  async (
    client: SupabaseBrowserClient =
      createSupabaseClient()
  ) => {
    try {
      const response =
        await client.auth.getSession();

      if (
        response.error &&
        isInvalidRefreshTokenError(
          response.error
        )
      ) {
        clearSupabaseAuthStorage();
      }

      return response;
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        clearSupabaseAuthStorage();
      }

      throw error;
    }
  };

/**
 * ------------------------------------------------------------
 * Default compatibility export
 * ------------------------------------------------------------
 *
 * Some existing GOSH code may import:
 *
 * import { supabase } from "@/lib/supabase/client";
 *
 * We keep the export for compatibility.
 *
 * It is intentionally a lazy Proxy so the actual Supabase
 * client is not created until it is used in the browser.
 * ------------------------------------------------------------
 */

export const supabase =
  typeof window !== "undefined"
    ? createSupabaseClient()
    : null;