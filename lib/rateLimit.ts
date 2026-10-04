/**
 * Rate Limiting Utilities
 *
 * Production-safe, shared/durable rate limiting for serverless (Vercel).
 *
 * Previous implementation used a process-local `Map`. That is unreliable on
 * serverless because each instance has its own memory, memory is lost on cold
 * starts, and attackers can bypass limits by spreading requests across
 * instances. This module now uses Upstash Redis (REST API) as the shared store
 * when configured, with a safe in-memory fallback for local development.
 *
 * Design goals:
 *  - shared across serverless instances (Upstash Redis)
 *  - survives cold starts (durable store)
 *  - has expiration/TTL (EXPIRE)
 *  - atomic increment + expire (Lua script) to prevent race-condition bypass
 *  - fails safely: if the Redis provider is unavailable or not configured, we
 *    fall back to an in-memory limiter so the application is never blocked by a
 *    rate-limit provider outage
 *  - never logs or exposes Redis credentials
 */

import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Server-only credentials. These are NEVER logged, printed, or sent to the
 * browser. They are read from the server environment only.
 */
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const USE_UPSTASH = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

let redis: Redis | null = null;
if (USE_UPSTASH) {
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL!,
    token: UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Atomic Lua script: increment a key and set its TTL on first use.
 * Returns [currentCount, ttlSeconds].
 *
 * Using a single script makes the increment + expire atomic, closing the
 * classic race where two concurrent requests both see count === 1 and both
 * reset the TTL, which would let an attacker extend the window indefinitely.
 */
const INCR_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback store (used only when Upstash is not configured).
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes (fallback store only).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Unique identifier for this rate limit (e.g., IP address, email, user ID)
   */
  identifier: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

/**
 * Check if a request should be rate limited.
 *
 * Async because the shared store (Upstash Redis) is network-backed.
 *
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds, identifier } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Safety: never allow an unbounded window or zero/negative max.
  if (windowSeconds <= 0 || maxRequests <= 0) {
    return {
      success: true,
      remaining: maxRequests,
      resetAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Upstash Redis path (shared, durable, atomic)
  // ---------------------------------------------------------------------------
  if (redis) {
    try {
      const key = `rl:${identifier}`;
      const result = (await redis.eval(
        INCR_EXPIRE_SCRIPT,
        [key],
        [String(windowSeconds)]
      )) as [number, number];

      const count = Number(Array.isArray(result) ? result[0] : result);
      const ttl = Number(Array.isArray(result) ? result[1] : windowSeconds);
      const resetAt = now + Math.max(0, ttl) * 1000;

      if (count > maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetAt,
          error: `Rate limit exceeded. Please try again in ${Math.max(
            1,
            Math.ceil(ttl)
          )} seconds.`,
        };
      }

      return {
        success: true,
        remaining: Math.max(0, maxRequests - count),
        resetAt,
      };
    } catch (error) {
      // Fail safe: if Redis is temporarily unavailable, do NOT block the
      // application. Log a minimal, non-sensitive message and allow the request.
      console.error(
        "[rateLimit] Upstash Redis unavailable, falling back to in-memory:",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Fall through to in-memory below.
    }
  }

  // ---------------------------------------------------------------------------
  // In-memory fallback (local dev / provider outage). Best-effort only.
  // ---------------------------------------------------------------------------
  let entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      error: `Rate limit exceeded. Please try again in ${Math.ceil(
        (entry.resetAt - now) / 1000
      )} seconds.`,
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP address from request headers.
 *
 * IP TRUST DECISION (documented for the audit):
 *
 * On Vercel, the platform edge overwrites the `x-forwarded-for` header with the
 * actual connecting client IP, so the FIRST value is the platform-provided,
 * trustworthy client address. We therefore prefer `x-forwarded-for`'s first
 * value. `x-real-ip` is used as a fallback for hosts that set it (e.g. nginx).
 *
 * We do NOT trust arbitrary client-supplied forwarded headers beyond the first
 * value, and we never trust a bare client-supplied `x-real-ip` when a
 * platform-provided `x-forwarded-for` is present.
 *
 * @param headers Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
  // Vercel sets/overwrites this at the edge; first value is the client IP.
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }

  return "unknown";
}

/**
 * Create a rate limit identifier from IP and optional suffix
 * @param ip IP address
 * @param suffix Optional suffix (e.g., 'contact', 'checkout')
 * @returns Rate limit identifier
 */
export function createRateLimitId(ip: string, suffix?: string): string {
  return suffix ? `${ip}:${suffix}` : ip;
}