"use server";
import { officeContext,recordOfficeAction,roleMembers } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import { cleanDesign,templateFields } from "@/lib/documents/design";
import { notifyUsers } from "@/lib/notifications";
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
 const {db,org,user}=await officeContext("documents.manage");const body=formText(form,"prepared_body",30000);if(!body||templateFields(body).length)throw new Error("Fill every template field before submitting the document.");
 const {data:r}=await db.from("document_requests").select("template_id,template_snapshot,status").eq("organization_id",org).eq("id",id).maybeSingle();if(!r||!['submitted','in_review','prepared','pending_pastor'].includes(r.status))throw new Error("This request can no longer be edited.");
 const {data:t}=r.template_id?await db.from("document_templates").select("*").eq("organization_id",org).eq("id",r.template_id).maybeSingle():{data:null};
 const {data,error}=await db.from("document_requests").update({prepared_body:body,status:"pending_pastor",prepared_by:user.id,template_snapshot:r.template_snapshot??t}).eq("organization_id",org).eq("id",id).eq("status",r.status).select("id").maybeSingle();if(error||!data)throw new Error("The request changed. Refresh and try again.");
 await recordOfficeAction(org,user.id,"document.prepared","document_requests",id);
 const pastors=await roleMembers(org,['pastor']);await notifyUsers(org,pastors.flatMap(p=>p.auth_user_id?[p.auth_user_id]:[]),{title:"A document is ready for your approval",url:"/pastor/documents",type:"document"});return "Sent to the Pastor for review. Authorized signers can now certify it.";
});}
export async function denyRequest(id:string,reason:string):Promise<ActionState>{return officeAction(async()=>{const {db,org,user}=await officeContext("documents.manage");if(!reason.trim())throw new Error("Add a reason for the member.");const {data,error}=await db.from("document_requests").update({status:"denied",denial_reason:reason.trim().slice(0,2000)}).eq("organization_id",org).eq("id",id).in("status",['submitted','in_review','prepared','pending_pastor']).select("id").maybeSingle();if(error||!data)throw new Error("This request can no longer be declined.");await recordOfficeAction(org,user.id,"document.denied","document_requests",id);return "Request declined.";});}
