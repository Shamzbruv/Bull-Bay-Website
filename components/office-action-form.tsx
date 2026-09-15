"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
export function OfficeActionForm({action,children,label="Save",className="clay-form"}:{action:(state:ActionState,form:FormData)=>Promise<ActionState>;children?:React.ReactNode;label?:string;className?:string}) {
 const [state,submit]=useActionState(action,initialActionState);
 return <form action={submit} className={className}>{children}<FormStatus state={state}/><SubmitButton pendingLabel="Saving…">{label}</SubmitButton></form>;
}
