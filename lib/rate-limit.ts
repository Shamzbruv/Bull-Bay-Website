import { headers } from "next/headers";

/**
 * A small fixed-window rate limiter for public endpoints — form spam and
 * password-reset flooding.
 *
 * Deliberately in-process. The church runs a single Railway instance, so a
 * shared Map is honest about what it protects: it stops the same source
 * hammering this server, and it resets on deploy. If the app is ever scaled
 * to more than one instance this must move to Postgres or Redis, because
 * each instance would otherwise keep its own count and the effective limit
 * would multiply by the instance count. That is the only thing to change.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = 0;

/** Drop expired windows occasionally so a long-running process can't grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * The caller's IP as seen through Railway's proxy. `x-forwarded-for` is a
 * client-supplied header and can be spoofed, so this is a throttle on
 * casual abuse, not an authorization boundary — nothing security-critical
 * may depend on it. The left-most entry is the original client.
 */
export async function callerIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}
