"use server";
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formFieldsSchema,validateAnswers } from "@/lib/office/forms";
import { roleMembers } from "@/lib/office/context";
import { notifyUsers } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";
export async function submitOfficeForm(token:string,_:ActionState,form:FormData):Promise<ActionState>{
 try{
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error("This form link is invalid.");
  const db=createServiceRoleClient();const {data:assignment}=await db.from("form_assignments").select("*").eq("token_hash",createHash("sha256").update(token).digest("hex")).maybeSingle();
  if(!assignment||assignment.submitted_at||new Date(assignment.expires_at)<new Date())throw new Error("This link has expired or was already submitted.");
  const snapshot=assignment.form_snapshot as {fields:unknown;title:string};const fields=formFieldsSchema.parse(snapshot.fields);const answers=validateAnswers(fields,form);
  const {data:updated,error}=await db.from("form_assignments").update({answers,submitted_at:new Date().toISOString()}).eq("id",assignment.id).is("submitted_at",null).gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
  if(error||!updated)throw new Error("This form could not be submitted. Please refresh.");
  const office=await roleMembers(assignment.organization_id,["secretary","church_executive"]);
  await notifyUsers(assignment.organization_id,office.flatMap(p=>p.auth_user_id?[p.auth_user_id]:[]),{title:"A form has been submitted",body:snapshot.title,url:"/admin/forms",type:"form"});
  return {status:"success",message:"Thank you. Your form has been submitted to the administrative team."};
 }catch(e){return {status:"error",message:e instanceof Error?e.message:"Please check your answers and try again."};}
}
