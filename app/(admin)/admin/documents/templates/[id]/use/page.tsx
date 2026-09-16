import { getOrganizationId,getUserPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AccessDenied } from "@/components/access-denied";
import { notFound } from "next/navigation";
import { UseTemplateForm } from "./use-template-form";
export default async function UseTemplatePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const org=await getOrganizationId();if(!org||!(await getUserPermissions(org)).has("documents.manage"))return <AccessDenied/>;const db=await createClient();const [{data:t},{data:people}]=await Promise.all([db.from("document_templates").select("*").throwOnError().eq("organization_id",org).eq("id",id).maybeSingle(),db.from("profiles").select("id,first_name,last_name,email,address_line1,joined_at").throwOnError().eq("organization_id",org).order("last_name")]);if(!t)notFound();return <><div className="dashboard-header"><div><p className="section-kicker">Use master template · Version {t.version}</p><h1>{t.name}</h1><p>{t.description}</p></div></div><div className="panel"><UseTemplateForm id={id} body={t.body} people={people??[]}/></div></>;}
