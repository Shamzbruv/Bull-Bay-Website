import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runOfficeWorker } from "@/lib/office/worker";
export const maxDuration = 60;
export async function POST(request: Request) {
  const { data: config, error } = await createServiceRoleClient().from("integration_settings").select("value").eq("key", "office_worker").maybeSingle();
  if (error) return new Response("Scheduler configuration unavailable", { status: 503 });
  const expected = (config?.value as { secret?: string } | undefined)?.secret;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return NextResponse.json(await runOfficeWorker());
}
