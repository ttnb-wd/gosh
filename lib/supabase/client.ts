import { createBrowserClient } from '@supabase/ssr';

const getSupabaseAuthStorageKey = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
};

const isSupabaseAuthStorageName = (name: string) => {
  const storageKey = getSupabaseAuthStorageKey();

  if (!storageKey) {
    return name === 'supabase.auth.token' || (name.startsWith('sb-') && name.includes('auth-token'));
  }

  return (
    name === storageKey ||
    name.startsWith(`${storageKey}.`) ||
    name === `${storageKey}-code-verifier` ||
    name.startsWith(`${storageKey}-code-verifier.`) ||
    name === `${storageKey}-user` ||
    name.startsWith(`${storageKey}-user.`)
  );
};

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
};

const getStoredSupabaseSession = () => {
  if (typeof window === 'undefined') return null;

  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return null;

  try {
    const rawSession = window.localStorage.getItem(storageKey);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as {
      currentSession?: { expires_at?: number | null } | null;
      expires_at?: number | null;
    };

    return parsed.currentSession ?? parsed;
  } catch {
    return null;
  }
};

const hasExpiredStoredSupabaseSession = () => {
  const session = getStoredSupabaseSession();
  const expiresAt = session?.expires_at;

  if (!expiresAt) return false;

  return expiresAt <= Math.floor(Date.now() / 1000);
};

export const isInvalidRefreshTokenError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : null;

  return (
    code === 'refresh_token_not_found' ||
    (message.includes('invalid refresh token') && message.includes('refresh token not found'))
  );
};

export const clearSupabaseAuthStorage = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const clearStorage = (storage: Storage) => {
    try {
      Object.keys(storage)
        .filter(isSupabaseAuthStorageName)
        .forEach((key) => storage.removeItem(key));
    } catch {
      // Browser privacy modes can block storage access.
    }
  };

  try {
    clearStorage(window.localStorage);
    clearStorage(window.sessionStorage);
  } catch {
    // Browser privacy modes can block storage access.
  }

  document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name && isSupabaseAuthStorageName(name)))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
};

const supabaseClientOptions = {
  auth: {
    flowType: 'pkce' as const,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-client-info': 'gosh-perfume-client',
    },
    fetch: async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await globalThis.fetch(...args);
        const requestUrl = typeof args[0] === 'string'
          ? args[0]
          : args[0] instanceof URL
            ? args[0].toString()
            : args[0].url;

        if (!response.ok && requestUrl.includes('/auth/v1/')) {
          response
            .clone()
            .text()
            .then((body) => {
              if (isInvalidRefreshTokenError({ message: body })) {
                clearSupabaseAuthStorage();
              }
            })
            .catch(() => {
              // Ignore response clone/body read issues.
            });
        }

        return response;
      } catch {
        return new Response(
          JSON.stringify({
            message: 'Supabase is unreachable. Please check your internet connection or Supabase project settings.',
          }),
          {
            status: 503,
            headers: {
              'content-type': 'application/json',
            },
          }
        );
      }
    },
  },
};

// Client-side Supabase client for use in Client Components
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration is missing. Please check your .env.local file.');
  }

  return createBrowserClient(supabaseUrl, supabaseKey, supabaseClientOptions);
};

export const getSupabaseUser = async (client = createSupabaseClient()) => {
  if (hasExpiredStoredSupabaseSession()) {
    clearSupabaseAuthStorage();
    return {
      data: { user: null },
      error: null,
    };
  }

  const response = await client.auth.getUser();

  if (response.error && isInvalidRefreshTokenError(response.error)) {
    clearSupabaseAuthStorage();
  }

  return response;
};

// Browser client for direct usage
let supabase: ReturnType<typeof createBrowserClient> | null = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createBrowserClient(supabaseUrl, supabaseKey, supabaseClientOptions);
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export { supabase };
