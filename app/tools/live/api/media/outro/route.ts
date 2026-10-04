import { access } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MEDIA = path.join(process.cwd(), "public/tools/live/media");

const exists = (file: string) => access(path.join(MEDIA, file)).then(() => true, () => false);

/** Lets the control panel warn the operator if the outro audio is missing. */
export async function GET() {
  const [hasMp3, hasMp4] = await Promise.all([exists("Go in Peace.mp3"), exists("outro.mp4")]);
  return Response.json({ exists: hasMp3 || hasMp4, kind: hasMp3 ? "audio" : hasMp4 ? "video" : null });
}
