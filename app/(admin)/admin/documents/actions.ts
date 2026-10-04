"use server";
import { officeContext,recordOfficeAction,roleMembers } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { cleanDesign,templateFields } from "@/lib/documents/design";
import { notifyUsers } from "@/lib/notifications";
import { urgentReasonFrom } from "@/lib/documents/delivery";
import { certifierName,certifyPreparedDocument } from "@/lib/documents/certify";
import type { ActionState } from "@/app/(public)/actions";
export async function saveTemplate(_:ActionState,form:FormData):Promise<ActionState>{return officeAction(async()=>{
 const {db,org,user}=await officeContext("documents.manage");const id=formText(form,"id",40),name=formText(form,"name",200),body=formText(form,"body",30000);
 if(!name||!body)throw new Error("Provide a name and the document text.");
 const emailId=formText(form,"email_template_id",40);if(emailId){const {data:t}=await db.from("email_templates").select("id").eq("organization_id",org).eq("id",emailId).maybeSingle();if(!t)throw new Error("Choose an email template from this church.");}
 const design=cleanDesign(Object.fromEntries(['accent','banner','footer','subtitle','orientation','signer_name','secretary_name'].map(k=>[k,formText(form,k)])));
 const {data:existing}=id?await db.from("document_templates").select("version").eq("organization_id",org).eq("id",id).maybeSingle():{data:null};
 const payload={organization_id:org,name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),body,description:formText(form,"description",1000)||null,category:formText(form,"category",100)||null,layout:formText(form,"layout")==='certificate'?'certificate':'letter',design,email_template_id:emailId||null,version:(existing?.version??0)+1};
 const result=id?await db.from("document_templates").update(payload).eq("organization_id",org).eq("id",id).select("id").single():await db.from("document_templates").insert({...payload,created_by:user.id}).select("id").single();if(result.error)throw new Error("Could not save the template. Its name must be unique.");
 await recordOfficeAction(org,user.id,"document.template_saved","document_templates",result.data.id,{version:String(payload.version)});return "Master template saved. Documents already prepared keep their original template.";
});}
export async function toggleTemplateActive(id:string,isActive:boolean):Promise<ActionState>{return officeAction(async()=>{const {db,org,user}=await officeContext("documents.manage");const {error}=await db.from("document_templates").update({is_active:isActive}).eq("organization_id",org).eq("id",id);if(error)throw error;await recordOfficeAction(org,user.id,"document.template_visibility","document_templates",id);return "Template visibility updated.";});}
export async function claimRequest(id:string):Promise<ActionState>{return officeAction(async()=>{const {db,org,user}=await officeContext("documents.manage");const {data,error}=await db.from("document_requests").update({status:"in_review",assigned_to:user.id}).eq("organization_id",org).eq("id",id).eq("status","submitted").select("id").maybeSingle();if(error||!data)throw new Error("This request was already assigned or changed.");await recordOfficeAction(org,user.id,"document.claimed","document_requests",id);return "Request assigned to you.";});}
export async function prepareRequest(id:string,_:ActionState,form:FormData):Promise<ActionState>{return officeAction(async()=>{
 const {db,org,user,profile,permissions}=await officeContext("documents.manage");const body=formText(form,"prepared_body",30000);if(!body||templateFields(body).length)throw new Error("Fill every template field before submitting the document.");
 const urgentReason=urgentReasonFrom(form);if(urgentReason&&!permissions.has("documents.urgent_sign"))throw new Error("Your role can't sign documents on the Pastor's behalf.");
 const {data:r}=await db.from("document_requests").select("template_id,template_snapshot,status").eq("organization_id",org).eq("id",id).maybeSingle();if(!r||!['submitted','in_review','prepared','pending_pastor'].includes(r.status))throw new Error("This request can no longer be edited.");
 const {data:t}=r.template_id?await db.from("document_templates").select("*").eq("organization_id",org).eq("id",r.template_id).maybeSingle():{data:null};
 const {data,error}=await db.from("document_requests").update({prepared_body:body,status:"pending_pastor",prepared_by:user.id,template_snapshot:r.template_snapshot??t}).eq("organization_id",org).eq("id",id).eq("status",r.status).select("id").maybeSingle();if(error||!data)throw new Error("The request changed. Refresh and try again.");
 await recordOfficeAction(org,user.id,"document.prepared","document_requests",id);
 const tellPastors=async()=>{const pastors=await roleMembers(org,['pastor']);await notifyUsers(org,pastors.flatMap(p=>p.auth_user_id?[p.auth_user_id]:[]),{title:"A document is ready for your approval",url:`/pastor/documents?request=${id}`,type:"document"});};
 if(urgentReason){
  try{return await certifyPreparedDocument({org,requestId:id,actor:{userId:user.id,name:await certifierName(org,user.id,profile),permissions},urgentReason});}
  catch(error){await tellPastors();throw new Error(`Sent to the Pastor, but it couldn't be signed now: ${error instanceof Error?error.message:"unknown error"}`);}
 }
 await tellPastors();return "Sent to the Pastor for review. Authorized signers can now certify it.";
});}
export async function denyRequest(id:string,reason:string):Promise<ActionState>{return officeAction(async()=>{const {db,org,user}=await officeContext("documents.manage");if(!reason.trim())throw new Error("Add a reason for the member.");const {data,error}=await db.from("document_requests").update({status:"denied",denial_reason:reason.trim().slice(0,2000)}).eq("organization_id",org).eq("id",id).in("status",['submitted','in_review','prepared','pending_pastor']).select("id").maybeSingle();if(error||!data)throw new Error("This request can no longer be declined.");await recordOfficeAction(org,user.id,"document.denied","document_requests",id);return "Request declined.";});}

/** For a document sent by mistake, or a test: removes it, its PDF and any
 *  email still waiting to go out with it. The audit log keeps a note of
 *  what was deleted (title, number, recipient) and by whom; an email that
 *  already went out can't be unsent. */
export async function deleteDocumentRequest(id:string):Promise<ActionState>{return officeAction(async()=>{
 const {db,org,user}=await officeContext("documents.manage");
 const {data:r}=await db.from("document_requests").select("id,title,status,document_number,pdf_path,recipient_name,recipient_email,requester_profile_id").eq("organization_id",org).eq("id",id).maybeSingle();
 if(!r)throw new Error("That document has already been deleted.");
 if(r.status==="stamped")throw new Error("This document is being certified right now. Try again in a moment.");
 const {data:files}=await db.storage.from("member-resources").list(`documents/${id}`,{limit:100});
 const paths=[...new Set([...(files??[]).map(f=>`documents/${id}/${f.name}`),...(r.pdf_path?[r.pdf_path]:[])])];
 if(paths.length)await db.storage.from("member-resources").remove(paths);
 await db.from("email_deliveries").delete().eq("organization_id",org).eq("dedupe_key",`document-${id}`).neq("status","sent");
 const {error}=await db.from("document_requests").delete().eq("organization_id",org).eq("id",id);
 if(error)throw new Error("The document couldn't be deleted. Please try again.");
 await recordOfficeAction(org,user.id,"document.deleted","document_requests",id,{title:r.title,status:r.status,document_number:r.document_number??"",recipient:r.recipient_name??r.requester_profile_id??""});
 return "Deleted.";
});}
