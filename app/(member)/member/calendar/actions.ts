"use server";
import { randomBytes,createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { officeContext,recordOfficeAction } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { canSubscribe,googleAccessToken,googleRequest,syncGoogleCalendar } from "@/lib/calendar/integrations";
import { SITE_URL } from "@/lib/org";
import type { ActionState } from "@/app/(public)/actions";
export async function createSubscription(_:ActionState,form:FormData){return officeAction(async()=>{const {db,org,user,profile}=await officeContext();const target=formText(form,'profile_id',40)||profile.id;if(!await canSubscribe(user.id,org,target))throw new Error('Your role cannot subscribe to this calendar.');const token=randomBytes(32).toString('base64url');const {error}=await db.from('calendar_subscriptions').insert({organization_id:org,user_id:user.id,calendar_profile_id:target,token_hash:createHash('sha256').update(token).digest('hex')});if(error)throw error;return `${SITE_URL}/api/calendar/pastoral/${token}`;});}
export async function revokeSubscriptions(_:ActionState,form:FormData){return officeAction(async()=>{const {db,org,user,profile}=await officeContext();const {error}=await db.from('calendar_subscriptions').update({revoked_at:new Date().toISOString()}).eq('organization_id',org).eq('user_id',user.id).eq('calendar_profile_id',formText(form,'profile_id',40)||profile.id);if(error)throw error;return 'Phone subscription links revoked. Create a new link to reconnect.';});}
export async function syncCalendarNow(_:ActionState,form:FormData){return officeAction(async()=>{const {db,org,user,profile,permissions}=await officeContext();const {data:c}=await db.from('calendar_connections').select('*').eq('organization_id',org).eq('id',formText(form,'id',40)).maybeSingle();
 // Whoever connected the account, the person whose calendar it is, and the office staff who manage it may all ask for a sync.
 if(!c||!(c.user_id===user.id||c.calendar_profile_id===profile.id||permissions.has('pastoral_calendar.manage')))throw new Error('Connection not found.');
 const result=await syncGoogleCalendar(c);
 for(const path of ['/member/calendar','/member/team-calendar','/pastor/calendar','/member/church-calendar'])revalidatePath(path);
 if(result.skipped)return 'A sync is already running. Give it a moment, then check the activity list.';
 const fromGoogle=result.fromGoogle.created+result.fromGoogle.updated+result.fromGoogle.deleted,toGoogle=result.toGoogle.created+result.toGoogle.updated+result.toGoogle.deleted;
 if(result.errors.length)throw new Error(`${result.errors.length} ${result.errors.length===1?'change':'changes'} could not be synced: ${result.errors[0]}`);
 return fromGoogle+toGoogle===0?'Already in step with Google Calendar.':`Synced: ${fromGoogle} ${fromGoogle===1?'change':'changes'} from Google Calendar, ${toGoogle} sent to it.`;});}
export async function disconnectGoogle(_:ActionState,form:FormData){return officeAction(async()=>{const {db,org,user}=await officeContext();const id=formText(form,'id',40);const {data:c}=await db.from('calendar_connections').select('*').eq('organization_id',org).eq('user_id',user.id).eq('id',id).maybeSingle();if(!c)throw new Error('Connection not found.');try{await googleRequest(`/calendars/${encodeURIComponent(c.google_calendar_id)}`,await googleAccessToken(c.refresh_token),'DELETE');}catch{/* The user can still disconnect after revoking Google access. */}const {error}=await db.from('calendar_connections').delete().eq('id',id).eq('user_id',user.id);if(error)throw error;await recordOfficeAction(org,user.id,'calendar.google_disconnected','calendar_connections',id);return 'Disconnected. If Google access had already expired, remove the old church calendar in Google Calendar manually.';});}
