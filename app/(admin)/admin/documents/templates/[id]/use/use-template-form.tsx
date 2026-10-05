"use client";
import { useState } from "react";
import { OfficeActionForm } from "@/components/office-action-form";
import { templateFields,fieldLabel } from "@/lib/documents/design";
import { UrgentSignFields } from "../../../urgent-sign-fields";
import { PreviewNote, PreviewPdfButton } from "../../../preview-pdf-button";
import { useDocumentTemplate } from "./actions";
type Person={id:string;first_name:string|null;last_name:string|null;email:string|null;address_line1:string|null;joined_at:string|null};
const nameOf=(p?:Person)=>[p?.first_name,p?.last_name].filter(Boolean).join(" ");
export function UseTemplateForm({id,body,people,canUrgentSign,signingReady}:{id:string;body:string;people:Person[];canUrgentSign:boolean;signingReady:boolean}){
 const [mode,setMode]=useState<"member"|"outside">("member");
 const [person,setPerson]=useState("");
 const [outside,setOutside]=useState({name:"",email:"",address:""});
 const [urgent,setUrgent]=useState(false);
 const [values,setValues]=useState<Record<string,string>>({church_name:"New Testament Church of God, Bull Bay",date_today:new Date().toLocaleDateString("en-JM",{timeZone:"America/Jamaica"})});
 const fields=templateFields(body);
 // Choosing a member fills in what the template knows about them; for a
 // document going outside the church, the typed-in name and address fill
 // the addressee fields instead.
 const chooseMember=(personId:string)=>{setPerson(personId);const p=people.find(p=>p.id===personId);setValues(v=>({...v,member_name:nameOf(p)||(mode==="outside"?outside.name:""),membership_since:p?.joined_at??"",...(mode==="member"?{recipient_address:p?.address_line1??""}:{})}));};
 const chooseMode=(next:"member"|"outside")=>{setMode(next);if(next==="outside")setValues(v=>({...v,recipient_name:outside.name,recipient_address:outside.address,...(person?{}:{member_name:outside.name})}));};
 const editOutside=(key:"name"|"email"|"address",value:string)=>{const next={...outside,[key]:value};setOutside(next);if(key==="name")setValues(v=>({...v,recipient_name:value,...(person?{}:{member_name:value})}));if(key==="address")setValues(v=>({...v,recipient_address:value}));};
 return <OfficeActionForm action={useDocumentTemplate.bind(null,id)} label={urgent?"Sign, stamp and send now":"Prepare document for certification"} actions={<PreviewPdfButton href={`/api/office/documents/templates/${id}/preview`}/>}>
  <fieldset className="doc-send-to">
   <legend>Send the finished PDF to</legend>
   <div className="choice-row">
    <label className="check-label"><input type="radio" name="recipient_mode" value="member" checked={mode==="member"} onChange={()=>chooseMode("member")}/>A church member</label>
    <label className="check-label"><input type="radio" name="recipient_mode" value="outside" checked={mode==="outside"} onChange={()=>chooseMode("outside")}/>Someone not in the members list</label>
   </div>
  </fieldset>
  {mode==="outside"&&<div className="outside-recipient">
   <div className="form-row">
    <label>Name of the person or organisation<input name="outside_name" required maxLength={200} value={outside.name} onChange={e=>editOutside("name",e.target.value)} placeholder="e.g. Canadian High Commission"/></label>
    <label>Their email address<input type="email" name="outside_email" required maxLength={320} value={outside.email} onChange={e=>editOutside("email",e.target.value)} placeholder="name@example.com"/></label>
   </div>
   <label>Postal address (optional)<textarea name="outside_address" maxLength={1000} value={outside.address} onChange={e=>editOutside("address",e.target.value)} style={{minHeight:72}}/></label>
  </div>}
  <label>{mode==="member"?"Member":"Is it about a member? (optional)"}
   <select name="recipient_id" required={mode==="member"} value={person} onChange={e=>chooseMember(e.target.value)}>
    <option value="">{mode==="member"?"Choose a member":"No, it isn't about a member"}</option>
    {people.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.email?` — ${p.email}`:""}</option>)}
   </select>
   {mode==="outside"&&<small className="form-note" style={{display:"block",marginTop:6}}>Choosing them keeps the document on their record and fills in their details. It is still emailed only to the address above.</small>}
  </label>
  {fields.map(k=><label key={k}>{fieldLabel(k)}<input name={`field_${k}`} required value={values[k]??""} onChange={e=>setValues({...values,[k]:e.target.value})}/></label>)}
  <details><summary>Preview document text</summary><p style={{whiteSpace:"pre-wrap"}}>{body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(match,key:string)=>values[key]||match)}</p></details>
  {canUrgentSign&&<UrgentSignFields urgent={urgent} onChange={setUrgent} signingReady={signingReady}/>}
  <PreviewNote/>
 </OfficeActionForm>;
}
