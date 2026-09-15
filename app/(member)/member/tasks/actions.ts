"use server";
import { officeContext, recordOfficeAction, roleMembers } from "@/lib/office/context";
import { officeAction, formText } from "@/lib/office/action";
import { notifyUser } from "@/lib/notifications";
import { queueOfficeEmail } from "@/lib/office/email";
import type { ActionState } from "@/app/(public)/actions";

export async function saveTask(_: ActionState, form: FormData) {
 return officeAction(async () => {
  const { db, org, user, permissions } = await officeContext("tasks.assign");
  const title = formText(form,"title",200), assignedTo = formText(form,"assigned_to",40), parentId = formText(form,"parent_id",40);
  if (!title || !assignedTo) throw new Error("Add a task title and choose a person.");
  const people = await roleMembers(org, ["secretary","church_executive","pastoral_care_team","student_pastor","pastor"]);
  if (!people.some(p => p.auth_user_id === assignedTo)) throw new Error("Choose an active church team member.");
  if (!permissions.has("prayer.review")) {
   const assistants = await roleMembers(org,["secretary"]);
   if (!assistants.some(p => p.auth_user_id === assignedTo)) throw new Error("The Executive Assistant can delegate to an Admin Assistant.");
  }
  if (parentId) {
   const { data: parent } = await db.from("office_tasks").select("id,assigned_to,status").eq("organization_id",org).eq("id",parentId).maybeSingle();
   if (!parent || parent.assigned_to !== user.id || ["completed","cancelled"].includes(parent.status)) throw new Error("You can only delegate an open task assigned to you.");
  }
  const due = formText(form,"due_at",30);
  const dueAt = due ? new Date(`${due}:00-05:00`) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Choose a valid deadline.");
  const { data, error } = await db.from("office_tasks").insert({ organization_id:org, title, description:formText(form,"description"), assigned_to:assignedTo, assigned_by:user.id, parent_id:parentId || null, due_at:dueAt?.toISOString() ?? null }).select("id").single();
  if (error) throw error;
  await recordOfficeAction(org,user.id,"task.assigned","office_tasks",data.id,{assigned_to:assignedTo});
  await notifyUser({organizationId:org,userId:assignedTo,title:"A task has been assigned to you",body:title,url:"/member/tasks",type:"task"});
  return "Task assigned.";
 });
}
export async function updateTask(_: ActionState, form: FormData) {
 return officeAction(async () => {
  const {db,org,user,permissions} = await officeContext();
  const id=formText(form,"id",40), decision=formText(form,"decision",30);
  const {data:task}=await db.from("office_tasks").select("*").eq("organization_id",org).eq("id",id).maybeSingle();
  if(!task) throw new Error("Task not found.");
  let status:string;
  if(decision==="start" && task.assigned_to===user.id && task.status==="assigned") status="in_progress";
  else if(decision==="submit" && task.assigned_to===user.id && ["assigned","in_progress"].includes(task.status)) status="awaiting_review";
  else if(["approve","return"].includes(decision) && task.status==="awaiting_review" && (task.assigned_by===user.id || permissions.has("prayer.review"))) status=decision==="approve"?"completed":"in_progress";
  else throw new Error("This task cannot be changed by your account in its current state.");
  const {data:updated,error}=await db.from("office_tasks").update({status,completion_note:formText(form,"note") || task.completion_note,updated_at:new Date().toISOString(),...(status==="completed"?{completed_at:new Date().toISOString(),reviewed_by:user.id}:{})}).eq("id",id).eq("status",task.status).select("id").maybeSingle();
  if(error || !updated) throw new Error("The task changed. Refresh and try again.");
  await recordOfficeAction(org,user.id,`task.${decision}`,"office_tasks",id);
  await notifyUser({organizationId:org,userId:decision==="submit"?task.assigned_by:task.assigned_to,title:`Task ${status.replaceAll('_',' ')}`,body:task.title,url:"/member/tasks",type:"task"});
  return status==="awaiting_review"?"Completion submitted for review.":"Task updated.";
 });
}
export async function prayerAction(_: ActionState, form: FormData) {
 return officeAction(async () => {
  const {db,org,user}=await officeContext();
  const id=formText(form,"id",40),decision=formText(form,"decision",30);
  const {data:prayer,error}=await db.rpc("office_prayer_transition",{org,actor:user.id,prayer:id,decision,...(formText(form,"assigned_to")?{assignee:formText(form,"assigned_to",40)}:{}),note:formText(form,"note")});
  if(error) throw error;
  if(decision==="approve") {
   let email=prayer.submitter_contact;
   if(prayer.submitter_profile_id) {const {data:p}=await db.from("profiles").select("email").eq("organization_id",org).eq("id",prayer.submitter_profile_id).maybeSingle();email=p?.email ?? email;}
   if(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const sent=await queueOfficeEmail({org,recipient:email,template:"prayer-completed",fields:{recipient_name:prayer.submitter_name || "Church family"},dedupeKey:`prayer-${id}`,actor:user.id});
    if(!sent.sent) return "Prayer approved. The email is queued for retry; its status is visible in Email delivery.";
   }
  }
  return decision==="approve"?"Prayer approved and the requester notified.":decision==="submit"?"Submitted to the Pastor for approval.":"Prayer assignment updated.";
 });
}
