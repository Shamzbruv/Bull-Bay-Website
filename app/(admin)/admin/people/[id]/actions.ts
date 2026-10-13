"use server";
import { z } from "zod";
import { officeContext,recordOfficeAction } from "@/lib/office/context";
import { officeAction,formText } from "@/lib/office/action";
import type { ActionState } from "@/app/(public)/actions";
import { memberDates, memberDetail, membershipStatus } from "@/lib/members/records";
export async function saveMember(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("people.write");const email=formText(form,"email",254);if(email&&!z.email().safeParse(email).success)throw new Error("Enter a valid email address.");
 const fields=['first_name','last_name','phone','date_of_birth','gender','address_line1','city','parish','marital_status','occupation','employer','job_title','emergency_contact_name','emergency_contact_phone','joined_at','notes'] as const;
 const dates=memberDates.safeParse(Object.fromEntries(['joined_at','deceased_at','date_of_birth'].map(k=>[k,String(form.get(k)||'')])));
 if(!dates.success)throw new Error(dates.error.issues[0]?.message ?? "Check the information and try again.");
 const status=membershipStatus.parse(form.get('membership_status'));
 if(dates.data.deceased_at&&status!=='deceased')throw new Error('Choose deceased status when recording a date of death.');
 if(!formText(form,'first_name')||!formText(form,'last_name'))throw new Error('First and last names are required.');
 const changes=Object.fromEntries(fields.map(k=>[k,formText(form,k,k==='notes'?10000:500)||null]));
 const {data,error}=await db.from("profiles").update({...changes,...dates.data,membership_status:status,membership_information:formText(form,'membership_information',10000)||null,email:email||null}).eq("organization_id",org).eq("id",id).eq('updated_at',formText(form,'updated_at')).select("id").maybeSingle();if(error)throw new Error("The member record could not be saved. Check the dates and required fields.");if(!data)throw new Error('This record has changed or been removed. Refresh the page before saving so another staff member’s updates are preserved.');await recordOfficeAction(org,user.id,"member.updated","profiles",id);return "Member information saved. Sign-in email changes are handled separately from the contact address.";
});}

export async function saveMemberDetail(person:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext('people.write');
 const parsed=memberDetail.safeParse(Object.fromEntries(['category','label','value'].map(k=>[k,String(form.get(k)||'')])));
 if(!parsed.success)throw new Error(parsed.error.issues[0]?.message ?? "Check the information and try again.");
 const id=formText(form,'detail_id');
 const payload={...parsed.data,updated_by:user.id};
 const query=id?db.from('member_details').update(payload).eq('organization_id',org).eq('profile_id',person).eq('id',id).eq('updated_at',formText(form,'updated_at')):db.from('member_details').insert({...payload,organization_id:org,profile_id:person});
 const {data,error}=await query.select('id').maybeSingle();
 if(error)throw new Error('The detail could not be saved. The person may have been removed.');
 if(!data)throw new Error('This detail has changed or been removed. Refresh before editing.');
 await recordOfficeAction(org,user.id,id?'member.detail_updated':'member.detail_added','member_details',data.id);
 return 'Member detail saved and available to the church office.';
});}
export async function deleteMemberDetail(person:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext('people.write');
 if(formText(form,'confirmation')!=='DELETE')throw new Error('Type DELETE to remove this detail.');
 const id=formText(form,'detail_id');
 const {data,error}=await db.from('member_details').delete().eq('organization_id',org).eq('profile_id',person).eq('id',id).eq('updated_at',formText(form,'updated_at')).select('id').maybeSingle();
 if(error||!data)throw new Error('The detail has changed or could not be removed. Refresh and try again.');
 await recordOfficeAction(org,user.id,'member.detail_deleted','member_details',id);return 'Member detail removed.';
});}
export async function createMemberRecord(_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext('people.write');
 const parsed=z.object({first_name:z.string().trim().min(1).max(100),last_name:z.string().trim().min(1).max(100),email:z.union([z.email(),z.literal('')]),phone:z.string().trim().max(50),membership_status:membershipStatus,joined_at:memberDates.shape.joined_at}).safeParse(Object.fromEntries(['first_name','last_name','email','phone','membership_status','joined_at'].map(k=>[k,String(form.get(k)||'').trim()])));
 if(!parsed.success)throw new Error(parsed.error.issues[0]?.message ?? "Check the information and try again.");
 const {data,error}=await db.from('profiles').insert({...parsed.data,email:parsed.data.email||null,organization_id:org}).select('id').single();
 if(error)throw new Error('The person could not be added. Check whether their email is already in the directory.');
 await recordOfficeAction(org,user.id,'member.created','profiles',data.id);return 'Person added to the directory. Open their record to add more information.';
});}
export async function deleteMember(id:string,_:ActionState,form:FormData){return officeAction(async()=>{
 const {db,org,user}=await officeContext("people.delete");if(formText(form,"confirmation")!=="DELETE")throw new Error("Type DELETE to confirm removal of this member record.");
 const {error}=await db.rpc("office_delete_member",{org,actor:user.id,person:id});if(error)throw error;return "Member record deleted and sign-in access disabled. Return to the directory.";
});}
