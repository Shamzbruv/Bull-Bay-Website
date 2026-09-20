import { createCipheriv,createDecipheriv,createHash,randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/office/types";
import { SITE_URL } from "@/lib/org";

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
export async function calendarContents(profileId:string){const db=createServiceRoleClient();
 const eventsQuery=()=>db.from('pastoral_calendar_events').select('id,title,starts_at,ends_at,kind,location,meeting_url').eq('profile_id',profileId).gte('ends_at',new Date(Date.now()-90*86400000).toISOString()).order('starts_at').limit(1000);
 // Same shape as eventsQuery's rows either way — see selectWithColumnFallback above.
 const eventsFallback=async()=>{const result=await db.from('pastoral_calendar_events').select('id,title,starts_at,ends_at,kind').eq('profile_id',profileId).gte('ends_at',new Date(Date.now()-90*86400000).toISOString()).order('starts_at').limit(1000);return {...result,data:result.data?.map(row=>({...row,location:null,meeting_url:null}))??null};};
 const [{data:hours,error:hoursError},{data:events,error:eventsError},{data:requests,error:requestError}]=await Promise.all([db.from('pastoral_calendar_availability').select('id,day_of_week,start_time,end_time,label').eq('profile_id',profileId),selectWithColumnFallback(eventsQuery,eventsFallback),db.from('counsel_requests').select('id,scheduled_event_id').eq('requester_profile_id',profileId).eq('status','scheduled')]);if(hoursError||eventsError||requestError)throw new Error('Calendar data could not be loaded.');const ownIds=(requests??[]).flatMap(r=>r.scheduled_event_id?[r.scheduled_event_id]:[]);const {data:appointments,error:appointmentError}=ownIds.length?await db.from('pastoral_calendar_events').select('id,starts_at,ends_at').in('id',ownIds):{data:[],error:null};if(appointmentError)throw appointmentError;return {hours:hours??[],events:[...(events??[]),...(appointments??[]).filter(a=>!events?.some(e=>e.id===a.id)).map(a=>({...a,title:'Pastoral appointment',kind:'appointment'}))]};}
export async function syncGoogleCalendar(connection:CalendarConnection){const db=createServiceRoleClient();try{if(!connection.calendar_profile_id||!await canSubscribe(connection.user_id,connection.organization_id,connection.calendar_profile_id))throw new Error('Calendar sharing is no longer permitted for this role.');const token=await googleAccessToken(connection.refresh_token);const contents=await calendarContents(connection.calendar_profile_id);const desired=new Map<string,Record<string,unknown>>();for(const h of contents.hours){const date=new Date('2024-01-07T12:00:00Z');date.setUTCDate(date.getUTCDate()+h.day_of_week);const day=date.toISOString().slice(0,10);desired.set(`a${h.id.replaceAll('-','')}`,{summary:`Available${h.label?`: ${h.label}`:''}`,start:{dateTime:`${day}T${h.start_time}-05:00`,timeZone:'America/Jamaica'},end:{dateTime:`${day}T${h.end_time}-05:00`,timeZone:'America/Jamaica'},recurrence:['RRULE:FREQ=WEEKLY'],transparency:'transparent',colorId:'2'});}for(const e of contents.events){
 // Google Calendar shows LOCATION right under the title on every client —
 // the one field guaranteed to render "vividly" without opening the event.
 // A physical location and a video-call link can both be true at once, so
 // when there's no physical location the link goes there instead of being
 // buried in the description alone.
 const location=(e as {location?:string|null}).location;
 const meetingUrl=(e as {meeting_url?:string|null}).meeting_url;
 desired.set(`e${e.id.replaceAll('-','')}`,{summary:e.title,location:location||meetingUrl||undefined,description:meetingUrl?`Video call: ${meetingUrl}`:undefined,start:{dateTime:e.starts_at,timeZone:'America/Jamaica'},end:{dateTime:e.ends_at,timeZone:'America/Jamaica'},colorId:e.kind==='appointment'?'9':e.kind==='day_off'?'5':e.kind==='meeting'?'7':'11'});
}
 const path=`/calendars/${encodeURIComponent(connection.google_calendar_id)}/events`;const existing: {id:string;extendedProperties?:{private?:{church_managed?:string}}}[]=[];let pageToken:string|undefined;do{const page=await googleRequest(`${path}?maxResults=2500${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`,token) as {items?:typeof existing;nextPageToken?:string};existing.push(...(page.items??[]));pageToken=page.nextPageToken;}while(pageToken);
 for(const [id,event] of desired){const body={...event,description:'Managed by New Testament Church of God, Bull Bay. Make scheduling changes in the church platform.',extendedProperties:{private:{church_managed:'yes'}}};if(existing.some(e=>e.id===id))await googleRequest(`${path}/${id}`,token,'PUT',{id,...body});else await googleRequest(path,token,'POST',{id,...body});}
 for(const e of existing)if(e.extendedProperties?.private?.church_managed==='yes'&&!desired.has(e.id))await googleRequest(`${path}/${e.id}`,token,'DELETE');await db.from('calendar_connections').update({last_synced_at:new Date().toISOString(),last_error:null}).eq('id',connection.id);
 }catch(e){await db.from('calendar_connections').update({last_error:e instanceof Error?e.message:'Sync failed'}).eq('id',connection.id);throw e;}}
