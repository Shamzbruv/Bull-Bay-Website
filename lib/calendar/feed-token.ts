import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A calendar app subscribing "by URL" (Google Calendar, Apple/phone
 * Calendar) can't send a session cookie or bearer header — the URL itself
 * has to prove who it's for. Rather than add a database column and
 * another migration this environment has no way to apply promptly, the
 * token is a signed profile id: `<profileId>.<hmac>`, verified with an
 * HMAC keyed on the service-role key (already present in every
 * deployment, never new setup). The service-role key isn't weakened by
 * this — HMAC output reveals nothing about the key — and this use is
 * namespaced so it can never collide with any other HMAC use of it.
 */
function feedSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function sign(profileId: string): string {
  return createHmac("sha256", feedSecret()).update(`calendar-feed:${profileId}`).digest("hex").slice(0, 32);
}

export function createCalendarFeedToken(profileId: string): string {
  return `${profileId}.${sign(profileId)}`;
}

export function verifyCalendarFeedToken(token: string): string | null {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;
  const profileId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(profileId);

  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null;
  return profileId;
}
