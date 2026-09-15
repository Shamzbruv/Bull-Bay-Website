"use server";
import { officeContext,recordOfficeAction } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { seal } from "@/lib/calendar/integrations";
import { enablePush } from "@/lib/push/server";
import type { ActionState } from "@/app/(public)/actions";
export async function saveGoogleConfig(_:ActionState,form:FormData){return officeAction(async()=>{const {db,org,user}=await officeContext('integrations.manage');const client=formText(form,'client_id',500),secret=formText(form,'client_secret',1000);if(!client.endsWith('.apps.googleusercontent.com')||!secret)throw new Error('Enter the Google Web application client ID and client secret.');const {error}=await db.from('integration_settings').upsert({key:'google_oauth',value:{client_id:client,client_secret:seal(secret)},updated_at:new Date().toISOString()});if(error)throw error;await recordOfficeAction(org,user.id,'integration.google_configured','integration_settings','google_oauth');return 'Google Calendar configured. Members can now choose an account and connect.';});}
export async function enablePhoneNotifications(_:ActionState,_form:FormData){return officeAction(async()=>{await officeContext('integrations.manage');await enablePush();return 'Phone notifications enabled. Each user must opt in on their device.';});}
