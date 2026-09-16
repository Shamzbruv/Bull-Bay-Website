import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { officeContext } from "@/lib/office/context";
import { allowedPushEndpoint,pushConfig } from "@/lib/push/server";
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Sign in required", { status: 401 });
  try {
    const config = await pushConfig();
    const { data, error } = await createServiceRoleClient().from("push_subscriptions").select("endpoint").eq("user_id", profile.auth_user_id!);
    if (error) throw error;
    return NextResponse.json({ publicKey: config?.publicKey ?? null, endpoints: (data ?? []).map(s => s.endpoint) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return new Response("Notification settings unavailable", { status: 503 }); }
}
export async function POST(request:Request){try{const {db,org,user}=await officeContext();const value=await request.json() as {endpoint?:string;keys?:{p256dh?:string;auth?:string}};if(!value.endpoint||value.endpoint.length>4096||!allowedPushEndpoint(value.endpoint)||!value.keys?.p256dh||!value.keys.auth||value.keys.p256dh.length>200||value.keys.auth.length>100)return new Response('Invalid browser push subscription',{status:400});const {error}=await db.from('push_subscriptions').upsert({organization_id:org,user_id:user.id,endpoint:value.endpoint,p256dh:value.keys.p256dh,auth:value.keys.auth},{onConflict:'endpoint'});if(error)throw error;return NextResponse.json({saved:true});}catch{return new Response('Could not enable notifications',{status:403});}}
export async function DELETE(request:Request){try{const {db,user}=await officeContext();const {endpoint}=await request.json();const {error}=await db.from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',String(endpoint));if(error)throw error;return NextResponse.json({removed:true});}catch{return new Response('Could not remove notification subscription',{status:403});}}
