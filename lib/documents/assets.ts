import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServiceRoleClient } from "@/lib/supabase/server";

let cachedLogo: Buffer | null = null;

/** The church logo ships in the repo's public/ folder, so it's read straight
 * off disk rather than fetched over HTTP — faster and doesn't depend on the
 * deployment's own URL being reachable from itself. */
export async function getLogoBuffer(): Promise<Buffer> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = await readFile(path.join(process.cwd(), "public/images/brand/bull-bay-logo.png"));
  return cachedLogo;
}

/** Signature/stamp images live in the private staff-assets bucket — only
 * ever read here, server-side, with the service-role client. */
export async function getStaffAssetBuffer(storagePath: string | null): Promise<Buffer | null> {
  if (!storagePath) return null;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from("staff-assets").download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
