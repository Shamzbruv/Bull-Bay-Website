"use server";
import { z } from "zod";
import { officeContext,recordOfficeAction } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { deliverOfficeEmail,queueOfficeEmail } from "@/lib/office/email";
import { greetingName } from "@/lib/members/name";
import type { ActionState } from "@/app/(public)/actions";
export async function saveEmailTemplate(_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("emails.manage");const id=formText(form,"id",40),name=formText(form,"name",200),subject=formText(form,"subject",250),body=formText(form,"body",20000),reply=formText(form,"reply_to",254);
 if(!name||!subject||!body)throw new Error("Add a name, subject, and email message.");if(reply&&!z.email().safeParse(reply).success)throw new Error("Enter a valid reply-to email.");
 const payload={name,subject,body,reply_to:reply||null,updated_at:new Date().toISOString()};
 const result=id?await db.from("email_templates").update(payload).eq("organization_id",org).eq("id",id).select("id").single():await db.from("email_templates").insert({...payload,organization_id:org,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}).select("id").single();
 if(result.error)throw new Error("Could not save the email. Use a unique template name.");await recordOfficeAction(org,user.id,"email.template_saved","email_templates",result.data.id);return "Email template saved.";
});}
export async function retryEmail(_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org}=await officeContext("emails.manage");const id=formText(form,"id",40);const {data:d}=await db.from("email_deliveries").select("id,status").eq("organization_id",org).eq("id",id).maybeSingle();if(!d||d.status!=="failed")throw new Error("Only a failed email can be retried.");await db.from("email_deliveries").update({attempts:0}).eq("id",id);const result=await deliverOfficeEmail(id);if(!result.sent)throw new Error(result.error||"Email delivery failed.");return "Email sent.";
});}
export async function sendTemplateEmail(_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("emails.manage");const {data:p}=await db.from("profiles").select("id,email,first_name,last_name").eq("organization_id",org).eq("id",formText(form,"recipient_id",40)).maybeSingle();if(!p?.email)throw new Error("Choose a member with an email address.");
 const fields:Record<string,string>={recipient_name:greetingName(p)};for(const [key,value]of form.entries())if(key.startsWith("field_"))fields[key.slice(6)]=String(value).slice(0,10000);
 const result=await queueOfficeEmail({org,recipient:p.email,template:formText(form,"template_id",40),fields,dedupeKey:`composed-${crypto.randomUUID()}`,actor:user.id});return result.sent?"Email sent.":"Email saved for retry. Check delivery status.";
});}
