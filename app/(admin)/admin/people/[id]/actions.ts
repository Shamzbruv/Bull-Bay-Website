"use server";
import { z } from "zod";
import { officeContext,recordOfficeAction } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import type { ActionState } from "@/app/(public)/actions";
export async function saveMember(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("people.write");const email=formText(form,"email",254);if(email&&!z.email().safeParse(email).success)throw new Error("Enter a valid email address.");
 const fields=['first_name','last_name','phone','date_of_birth','gender','address_line1','city','parish','marital_status','occupation','employer','job_title','emergency_contact_name','emergency_contact_phone','joined_at','notes'] as const;
 const changes=Object.fromEntries(fields.map(k=>[k,formText(form,k,k==='notes'?10000:500)||null]));
 const {data,error}=await db.from("profiles").update({...changes,email:email||null}).eq("organization_id",org).eq("id",id).select("id").maybeSingle();if(error||!data)throw new Error("The member record could not be saved. Check the dates and required fields.");await recordOfficeAction(org,user.id,"member.updated","profiles",id);return "Member information saved. Sign-in email changes are handled separately from the contact address.";
});}
export async function deleteMember(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("people.delete");if(formText(form,"confirmation")!=="DELETE")throw new Error("Type DELETE to confirm removal of this member record.");
 const {error}=await db.rpc("office_delete_member",{org,actor:user.id,person:id});if(error)throw error;return "Member record deleted and sign-in access disabled. Return to the directory.";
});}
