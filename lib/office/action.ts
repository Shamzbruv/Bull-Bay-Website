import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/(public)/actions";
export async function officeAction(work: () => Promise<string>): Promise<ActionState> {
  try { const message = await work(); revalidatePath("/", "layout"); return { status: "success", message }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "The change could not be saved." }; }
}
export function formText(form: FormData, key: string, max = 10000) { return String(form.get(key) ?? "").trim().slice(0, max); }
