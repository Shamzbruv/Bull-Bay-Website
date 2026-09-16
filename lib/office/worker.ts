import { randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { dispatchPush } from "@/lib/push/server";
import { deliverOfficeEmail } from "@/lib/office/email";
import { syncGoogleCalendar } from "@/lib/calendar/integrations";

/** Shared by the Railway process and the authenticated scheduler endpoint. */
export async function runOfficeWorker() {
  const db = createServiceRoleClient();
  const { error: setupError } = await db.from("integration_settings").upsert({
    key: "office_worker", value: { secret: randomBytes(32).toString("hex") },
    updated_at: new Date(0).toISOString(),
  }, { onConflict: "key", ignoreDuplicates: true });
  if (setupError) throw setupError;
  const { data: claimed, error: claimError } = await db.rpc("claim_office_worker", {});
  if (claimError) throw claimError;
  if (!claimed) return { busy: true };
  const [emails, connections] = await Promise.all([
    db.from("email_deliveries").select("id").in("status", ["pending", "failed"]).lt("attempts", 5).order("created_at").limit(10),
    db.from("calendar_connections").select("*").or(`last_synced_at.is.null,last_synced_at.lt.${new Date(Date.now() - 5 * 60000).toISOString()}`).order("last_synced_at", { nullsFirst: true }).limit(3),
  ]);
  if (emails.error || connections.error) throw emails.error || connections.error;
  const results = await Promise.allSettled([
    dispatchPush(),
    ...(emails.data ?? []).map(e => deliverOfficeEmail(e.id)),
    ...(connections.data ?? []).map(c => syncGoogleCalendar(c)),
  ]);
  return { processed: results.length, failed: results.filter(r => r.status === "rejected").length };
}

let started = false;
let running = false;
export function startOfficeWorker() {
  if (started) return;
  started = true;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runOfficeWorker(); }
    catch (error) { console.error("Office background processing failed", error instanceof Error ? error.message : "database error"); }
    finally { running = false; }
  };
  // Railway runs a persistent Node server. The database claim also prevents
  // duplicate runs during rolling deployments or an external scheduler call.
  setInterval(() => { void tick(); }, 60_000).unref();
  void tick();
}
