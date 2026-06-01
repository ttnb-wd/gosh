/**
 * API Route Authentication Utilities
 * Server-side authentication helpers for API routes
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Get authenticated user from Bearer token
 * @param request Next.js request object
 * @returns User object or null
 */
export async function getAuthenticatedUser(request: NextRequest | Request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if authenticated user is admin
 * @param request Next.js request object
 * @returns Admin status and user object
 */
export async function checkAdminApiAuth(request: NextRequest | Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return { isAdmin: false, user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';

  return { isAdmin, user };
}

/**
 * Require admin authentication for API route
 * @param request Next.js request object
 * @returns User object if admin, throws error otherwise
 */
export async function requireAdminApiAuth(request: NextRequest | Request) {
  const { isAdmin, user } = await checkAdminApiAuth(request);

  if (!isAdmin || !user) {
    throw new Error('Admin access required');
  }

  return user;
}
