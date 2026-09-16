import webpush from "web-push";
import { officeContext } from "@/lib/office/context";
import { allowedPushEndpoint, pushConfig } from "@/lib/push/server";
import { unseal } from "@/lib/calendar/integrations";
export async function POST(request: Request) {
  try {
    const { db, user } = await officeContext();
    const { endpoint } = await request.json();
    if (typeof endpoint !== "string" || !allowedPushEndpoint(endpoint)) return new Response("Invalid device", { status: 400 });
    const { data: subscription, error } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", user.id).eq("endpoint", endpoint).maybeSingle();
    if (error) throw error;
    if (!subscription) return new Response("Enable notifications on this device first.", { status: 404 });
    const config = await pushConfig();
    if (!config) return new Response("Phone notifications are not configured.", { status: 503 });
    await webpush.sendNotification({ endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "Your church notifications are connected", body: "This phone can now receive church updates and assignment alerts.", url: "/member/notifications", tag: "connection-test" }), { vapidDetails: { subject: "mailto:notifications@bullbayntcog.org", publicKey: config.publicKey, privateKey: unseal(config.privateKey) }, TTL: 60, timeout: 5000 });
    return Response.json({ sent: true });
  } catch { return new Response("The test could not be delivered. Try disabling and enabling notifications on this device again.", { status: 503 }); }
}
