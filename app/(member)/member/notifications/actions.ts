"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared by the notification bell in every workspace (member/pastor/admin),
 * not just the member notifications page it lives next to — RLS ("notifications
 * own mark read") already confines either call to rows the signed-in user
 * owns, so no extra permission check is needed here.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null).throwOnError();
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).throwOnError();
  revalidatePath("/", "layout");
}
