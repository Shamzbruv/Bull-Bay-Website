import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed private subscription URL. Rotate CALENDAR_FEED_SECRET to invalidate all subscriptions. */
function feedSecret() {
  const key = process.env.CALENDAR_FEED_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Calendar signing secret is not configured.");
  return key;
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) return null;
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(profileId);

  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null;
  return profileId;
}
