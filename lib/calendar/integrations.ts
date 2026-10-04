import { createCipheriv,createDecipheriv,createHash,randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/office/types";
import { SITE_URL } from "@/lib/org";
import { googleRestApi } from "@/lib/calendar/google-api";
import { runSync } from "@/lib/calendar/sync-engine";
import { databaseSyncStore } from "@/lib/calendar/sync-store";

/**
 * pastoral_calendar_events.location/meeting_url are new columns (see
 * supabase/migrations/20260919130000_calendar_meeting_location.sql).
 * Until that migration is applied to a given database, selecting them
 * fails with Postgres 42703 ("column does not exist") — every caller here
 * retries without them rather than taking the whole calendar down for the
 * sake of two columns that aren't live yet. Once the migration lands, the
 * first attempt succeeds and this fallback stops running, permanently,
 * with no follow-up change needed anywhere that calls it.
 */
export async function selectWithColumnFallback<T>(
  primary: () => PromiseLike<{ data: T | null; error: { code?: string } | null }>,
  fallback: () => PromiseLike<{ data: T | null; error: { code?: string } | null }>,
) {
  const result = await primary();
  return result.error?.code === "42703" ? fallback() : result;
}
export function seal(value:string){const key=createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY!).digest();const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function unseal(value:string){const key=createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY!).digest();const b=Buffer.from(value,'base64url');const decipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');}
export async function googleConfig(){const {data}=await createServiceRoleClient().from('integration_settings').select('value').eq('key','google_oauth').maybeSingle();const v=data?.value as {client_id?:string;client_secret?:string}|undefined;return {clientId:process.env.GOOGLE_CLIENT_ID||v?.client_id,clientSecret:process.env.GOOGLE_CLIENT_SECRET||(v?.client_secret?unseal(v.client_secret):undefined),redirectUri:`${SITE_URL}/api/calendar/google/callback`};}
export async function canSubscribe(userId:string,org:string,target:string){const db=createServiceRoleClient();const {data:me}=await db.from('profiles').select('id').eq('organization_id',org).eq('auth_user_id',userId).maybeSingle();if(!me)return false;if(me.id===target)return true;const [{data:pastor},{data:grants}]=await Promise.all([db.from('pastoral_team_members').select('id').eq('organization_id',org).eq('profile_id',target).eq('is_pastor',true).eq('is_active',true).maybeSingle(),db.from('user_roles').select('roles!inner(code)').eq('organization_id',org).eq('user_id',userId)]);return Boolean(pastor&&grants?.some(g=>['pastor','super_admin','secretary','church_executive'].includes((g.roles as unknown as {code:string}).code)));}
export async function googleRequest(path:string,accessToken:string,method='GET',body?:unknown){const response=await fetch(`https://www.googleapis.com/calendar/v3${path}`,{method,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error(`Google Calendar returned ${response.status}. Reconnect your account if access has expired.`);return response.status===204?{}:response.json();}
export async function googleAccessToken(refreshToken:string){const config=await googleConfig();if(!config.clientId||!config.clientSecret)throw new Error('Google Calendar is not configured.');const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:unseal(refreshToken),grant_type:'refresh_token'})});if(!response.ok)throw new Error('Google authorization expired. Reconnect your account.');return (await response.json() as {access_token:string}).access_token;}
/**
 * Runs one two-way sync for a connection: what changed on the website goes
 * to Google and what changed in Google comes to the website (see
 * sync-core.ts for the rules). Safe to call from several places at once; a
 * per-connection lock makes the second caller step aside.
 */
export async function syncGoogleCalendar(connection: CalendarConnection) {
  const db = createServiceRoleClient();
  try {
    if (!connection.calendar_profile_id || !(await canSubscribe(connection.user_id, connection.organization_id, connection.calendar_profile_id))) {
      throw new Error("Calendar sharing is no longer permitted for this role.");
    }
    const token = await googleAccessToken(connection.refresh_token);
    return await runSync({
      target: { connectionId: connection.id, profileId: connection.calendar_profile_id },
      store: databaseSyncStore(connection.organization_id),
      google: googleRestApi(connection.google_calendar_id, token),
    });
  } catch (error) {
    // runSync records its own failures; this covers the steps before it starts.
    await db.from("calendar_connections").update({ last_error: error instanceof Error ? error.message : "Sync failed", last_synced_at: new Date().toISOString() }).eq("id", connection.id);
    throw error;
  }
}

/** Pushes a website change to every Google calendar linked to this person's calendar. Best effort: the background worker retries anything missed. */
export async function syncConnectionsForProfile(profileId: string) {
  const { data: connections } = await createServiceRoleClient().from("calendar_connections").select("*").eq("calendar_profile_id", profileId);
  for (const connection of connections ?? []) await syncGoogleCalendar(connection).catch(() => {});
}

/**
 * Brings Google up to date when someone opens a calendar that has not been
 * checked lately, so what they see is seconds old rather than minutes. A
 * connection checked within `maxAgeMs` is left alone, which also keeps
 * a busy page from hammering Google.
 */
export async function syncStaleConnectionsForProfiles(profileIds: string[], maxAgeMs: number) {
  if (profileIds.length === 0) return;
  const staleBefore = new Date(Date.now() - maxAgeMs).toISOString();
  const { data: connections } = await createServiceRoleClient()
    .from("calendar_connections")
    .select("*")
    .in("calendar_profile_id", profileIds)
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleBefore}`);
  for (const connection of connections ?? []) await syncGoogleCalendar(connection).catch(() => {});
}
