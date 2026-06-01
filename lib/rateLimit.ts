/**
 * Rate Limiting Utilities
 * Simple in-memory rate limiting for API routes
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
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
 * Check if a request should be rate limited
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowSeconds, identifier } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }
  
  // Increment count
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      error: `Rate limit exceeded. Please try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
    };
  }
  
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP address from request headers
 * @param headers Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
  // Check common headers for IP address
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return 'unknown';
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
