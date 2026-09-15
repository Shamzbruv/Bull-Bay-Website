import Image from "next/image";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { OfficeActionForm } from "@/components/office-action-form";
import { formFieldsSchema } from "@/lib/office/forms";
import { submitOfficeForm } from "./actions";
export const metadata={title:"Church form",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function PublicForm({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const {data:assignment}=await createServiceRoleClient().from("form_assignments").select("form_snapshot,submitted_at,expires_at").eq("token_hash",createHash("sha256").update(token).digest("hex")).maybeSingle();if(!assignment)notFound();
 const snapshot=assignment.form_snapshot as {title:string;description:string;fields:unknown};
 return <div className="panel office-form-public"><Image src="/images/brand/bull-bay-logo.png" alt="New Testament Church of God, Bull Bay" width={90} height={90}/><p className="section-kicker">New Testament Church of God · Bull Bay</p><h1>{snapshot.title}</h1>{assignment.submitted_at?<p>Thank you. This form has already been submitted.</p>:new Date(assignment.expires_at)<new Date()?<p>This invitation has expired. Please contact the church office for a new link.</p>:<><p>{snapshot.description}</p><OfficeActionForm action={submitOfficeForm.bind(null,token)} label="Submit to the church office">{formFieldsSchema.parse(snapshot.fields).map(f=><label key={f.id}>{f.label}{f.required?" *":""}{f.type==="textarea"?<textarea name={f.id} required={f.required} rows={4}/>:f.type==="select"?<select name={f.id} required={f.required}><option value="">Choose…</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:<input name={f.id} type={f.type} required={f.required} {...(f.type==="checkbox"?{value:"yes"}:{})}/>}</label>)}</OfficeActionForm></>}</div>;
}
