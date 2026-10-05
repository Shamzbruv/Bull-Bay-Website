import QRCode from "qrcode";
import { SITE_URL } from "@/lib/org";
import { loadFormByPublicId } from "@/lib/forms/server";

// A QR code for a form's link: for the bulletin, a poster, or the screen at
// the end of a service. Only the public address is encoded, so it's safe to
// hand out to anyone.

export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const form = await loadFormByPublicId(publicId);
  if (!form) return new Response("Not found", { status: 404 });
  const query = new URL(request.url).searchParams;
  const url = `${SITE_URL}/f/${publicId}`;
  const color = { dark: "#14254a", light: "#ffffff" };
  if (query.get("format") === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
  }
  const width = Math.min(2000, Math.max(200, Number(query.get("size")) || 900));
  const png = await QRCode.toBuffer(url, { width, margin: 2, errorCorrectionLevel: "M", color });
  const name = `${form.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "form"}-qr.png`;
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
      ...(query.get("download") === "1" ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
