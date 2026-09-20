import { getCurrentProfile,getUserPermissions } from "@/lib/auth/session";
import { createClient,createServiceRoleClient } from "@/lib/supabase/server";
import { generateDocumentPdf } from "@/lib/documents/pdf";
import { getLogoBuffer,getStaffAssetBuffer } from "@/lib/documents/assets";
import { cleanDesign } from "@/lib/documents/design";
import { fullName } from "@/lib/members/name";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const profile=await getCurrentProfile();if(!profile)return new Response("Sign in required",{status:401});const permissions=await getUserPermissions(profile.organization_id);if(!permissions.has("documents.manage")&&!permissions.has("documents.certify"))return new Response("Forbidden",{status:403});
 const {id}=await params;const db=await createClient();const {data:r}=await db.from("document_requests").select("*").eq("organization_id",profile.organization_id).eq("id",id).maybeSingle();if(!r)return new Response("Not found",{status:404});
 let bytes:Buffer;
 if(r.status==='completed'&&r.pdf_path){const {data,error}=await createServiceRoleClient().storage.from("member-resources").download(r.pdf_path);if(error||!data)return new Response("PDF unavailable",{status:503});bytes=Buffer.from(await data.arrayBuffer());}
 else {
  const [{data:p},{data:preparerProfile}]=await Promise.all([
   db.from("profiles").select("first_name,last_name").eq("id",r.requester_profile_id??"").maybeSingle(),
   r.prepared_by?db.from("profiles").select("auth_user_id,first_name,last_name,signature_path").eq("organization_id",profile.organization_id).eq("auth_user_id",r.prepared_by).maybeSingle():Promise.resolve({data:null}),
  ]);
  // Same preview a member-facing certification would produce, shown before
  // the pastor has actually signed anything — the point is to let whoever
  // prepared it see their own signature land in the right place first.
  let preparer:{name:string;title?:string;signatureImage?:Buffer|null}|undefined;
  if(preparerProfile?.auth_user_id){
   const preparerName=fullName(preparerProfile);
   if(preparerName){
    const {data:preparerRole}=await db.from("user_roles").select("roles(name)").eq("organization_id",profile.organization_id).eq("user_id",preparerProfile.auth_user_id).limit(1).maybeSingle();
    preparer={name:preparerName,title:(preparerRole?.roles as unknown as {name:string}|null)?.name,signatureImage:await getStaffAssetBuffer(preparerProfile.signature_path)};
   }
  }
  const snapshot=(r.template_snapshot??{}) as {layout?:string;design?:unknown};bytes=await generateDocumentPdf({title:r.title,documentNumber:r.document_number||"DRAFT",recipientName:[p?.first_name,p?.last_name].filter(Boolean).join(" ")||'(no name on file — this will block certification)',bodyParagraphs:(r.prepared_body||"Document text has not yet been prepared.").split(/\n\s*\n/),issuedDate:new Date().toLocaleDateString("en-JM",{timeZone:"America/Jamaica"}),logoImage:await getLogoBuffer(),draft:true,layout:snapshot.layout,design:cleanDesign(snapshot.design),preparer});
 }
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="church-document.pdf"`,"Cache-Control":"private, no-store"}});
}
