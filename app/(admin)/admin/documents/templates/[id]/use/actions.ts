"use server";
import { officeContext,recordOfficeAction,roleMembers } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { templateFields } from "@/lib/documents/design";
import { mergeTemplate } from "@/lib/documents/merge";
import { readOutsideRecipient,urgentReasonFrom } from "@/lib/documents/delivery";
import { certifierName,certifyPreparedDocument } from "@/lib/documents/certify";
import { notifyUsers } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";
export async function useDocumentTemplate(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user,profile,permissions}=await officeContext("documents.manage");
 // "member": the PDF goes to the chosen member. "outside": it goes to the
 // name and email typed in; a member may still be chosen when the document
 // is about them, so it stays on their record.
 const outside=formText(form,"recipient_mode",20)==="outside"?readOutsideRecipient(form):null;
 const person=formText(form,"recipient_id",40);
 const urgentReason=urgentReasonFrom(form);
 if(urgentReason&&!permissions.has("documents.urgent_sign"))throw new Error("Your role can't sign documents on the Pastor's behalf.");
 const [{data:t},{data:p}]=await Promise.all([db.from("document_templates").select("*").eq("organization_id",org).eq("id",id).eq("is_active",true).maybeSingle(),person?db.from("profiles").select("id,email").eq("organization_id",org).eq("id",person).maybeSingle():Promise.resolve({data:null})]);
 if(!t)throw new Error("Choose an available template.");
 if(person&&!p)throw new Error("That member could not be found. Choose them again.");
 if(!outside&&!p?.email)throw new Error("Choose a member with an email address, or send it to someone not in the members list.");
 const fields:Record<string,string>={};for(const key of templateFields(t.body)){fields[key]=formText(form,`field_${key}`,5000);if(!fields[key])throw new Error(`Fill in ${key.replaceAll('_',' ')}.`);}
 const body=mergeTemplate(t.body,fields).join("\n\n");if(templateFields(body).length)throw new Error("Some template fields are still blank.");
 const {data:r,error}=await db.from("document_requests").insert({organization_id:org,requester_profile_id:p?.id??null,recipient_name:outside?.name??null,recipient_email:outside?.email??null,recipient_address:outside?.address??null,template_id:id,title:t.name,purpose:t.category,prepared_body:body,details:fields,template_snapshot:t,status:"pending_pastor",assigned_to:user.id,prepared_by:user.id}).select("id").single();if(error)throw error;
 await recordOfficeAction(org,user.id,"document.created_from_template","document_requests",r.id,{template:id,sent_to:outside?"outside_recipient":"member"});
 const tellPastors=async()=>{const pastors=await roleMembers(org,['pastor']);await notifyUsers(org,pastors.flatMap(p=>p.auth_user_id?[p.auth_user_id]:[]),{title:"A document awaits certification",body:t.name,url:`/pastor/documents?request=${r.id}`,type:"document"});};
 if(urgentReason){
  try{return await certifyPreparedDocument({org,requestId:r.id,actor:{userId:user.id,name:await certifierName(org,user.id,profile),permissions},urgentReason});}
  catch(error){await tellPastors();throw new Error(`Prepared and sent to the Pastor, but it couldn't be signed now: ${error instanceof Error?error.message:"unknown error"}`);}
 }
 await tellPastors();return "Document prepared. Open Documents → Awaiting certification to review, preview, and sign.";
});}
