"use server";
import { officeContext,recordOfficeAction,roleMembers } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { templateFields } from "@/lib/documents/design";
import { mergeTemplate } from "@/lib/documents/merge";
import { notifyUsers } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";
export async function useDocumentTemplate(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("documents.manage");const person=formText(form,"recipient_id",40);
 const [{data:t},{data:p}]=await Promise.all([db.from("document_templates").select("*").eq("organization_id",org).eq("id",id).eq("is_active",true).maybeSingle(),db.from("profiles").select("id,email").eq("organization_id",org).eq("id",person).maybeSingle()]);if(!t||!p?.email)throw new Error("Choose an available template and a member with an email address.");
 const fields:Record<string,string>={};for(const key of templateFields(t.body)){fields[key]=formText(form,`field_${key}`,5000);if(!fields[key])throw new Error(`Fill in ${key.replaceAll('_',' ')}.`);}
 const body=mergeTemplate(t.body,fields).join("\n\n");if(templateFields(body).length)throw new Error("Some template fields are still blank.");
 const {data:r,error}=await db.from("document_requests").insert({organization_id:org,requester_profile_id:person,template_id:id,title:t.name,purpose:t.category,prepared_body:body,details:fields,template_snapshot:t,status:"pending_pastor",assigned_to:user.id,prepared_by:user.id}).select("id").single();if(error)throw error;
 await recordOfficeAction(org,user.id,"document.created_from_template","document_requests",r.id,{template:id});const pastors=await roleMembers(org,['pastor']);await notifyUsers(org,pastors.flatMap(p=>p.auth_user_id?[p.auth_user_id]:[]),{title:"A document awaits certification",body:t.name,url:`/pastor/documents?request=${r.id}`,type:"document"});return "Document prepared. Open Documents → Awaiting certification to review, preview, and sign.";
});}
