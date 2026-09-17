"use server";
import { randomBytes, createHash } from "node:crypto";
import { officeContext, recordOfficeAction } from "@/lib/office/context";
import { officeAction, formText } from "@/lib/office/action";
import { formFieldsSchema } from "@/lib/office/forms";
import { queueOfficeEmail } from "@/lib/office/email";
import { greetingName } from "@/lib/members/name";
import { SITE_URL } from "@/lib/org";
import type { ActionState } from "@/app/(public)/actions";
export async function saveOfficeForm(_:ActionState,form:FormData) {return officeAction(async()=>{
 const {db,org,user}=await officeContext("forms.manage");
 const title=formText(form,"title",200),id=formText(form,"id",40);
 if(!title) throw new Error("Give the form a title.");
 const parsed=formFieldsSchema.safeParse(JSON.parse(formText(form,"fields",100000)||"[]"));
 if(!parsed.success) throw new Error("Add clearly labelled fields with unique IDs and valid options.");
 if(parsed.data.some(f=>f.type==="select"&&!f.options?.length)) throw new Error("Add choices to each dropdown field.");
 const payload={title,description:formText(form,"description",5000),fields:parsed.data,updated_at:new Date().toISOString()};
 const result=id?await db.from("office_forms").update(payload).eq("organization_id",org).eq("id",id).select("id").single():await db.from("office_forms").insert({...payload,organization_id:org,created_by:user.id}).select("id").single();
 if(result.error) throw result.error;
 await recordOfficeAction(org,user.id,id?"form.updated":"form.created","office_forms",result.data.id);
 return "Form saved. Existing invitations retain the questions they were sent.";
});}
export async function sendOfficeForm(_:ActionState,form:FormData) {return officeAction(async()=>{
 const {db,org,user}=await officeContext("forms.manage");
 const id=formText(form,"form_id",40),person=formText(form,"recipient_id",40);
 const [{data:definition},{data:recipient}]=await Promise.all([db.from("office_forms").select("*").eq("organization_id",org).eq("id",id).eq("is_active",true).maybeSingle(),db.from("profiles").select("id,email,first_name,last_name").eq("organization_id",org).eq("id",person).maybeSingle()]);
 if(!definition||!recipient?.email) throw new Error("Choose an active form and a member with an email address.");
 const token=randomBytes(32).toString("base64url"),tokenHash=createHash("sha256").update(token).digest("hex");
 const {data:assignment,error}=await db.from("form_assignments").insert({organization_id:org,form_id:id,recipient_profile_id:person,token_hash:tokenHash,form_snapshot:{title:definition.title,description:definition.description,fields:definition.fields},expires_at:new Date(Date.now()+30*86400000).toISOString(),sent_by:user.id}).select("id").single();
 if(error) throw error;
 await recordOfficeAction(org,user.id,"form.sent","form_assignments",assignment.id,{recipient:person});
 const result=await queueOfficeEmail({org,recipient:recipient.email,template:"form-invitation",fields:{recipient_name:greetingName(recipient),form_title:definition.title,action_url:`${SITE_URL}/forms/${token}`},dedupeKey:`form-${assignment.id}`,actor:user.id});
 return result.sent?"The form invitation was emailed. Its link expires in 30 days.":"The invitation is saved and queued for email retry. Check Email delivery.";
});}
