"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

function supportsPush() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Whether this browser can receive push at all — read via
 * useSyncExternalStore (not useState+useEffect) specifically because the
 * answer differs between the server render (always "no") and the real
 * client, and this is exactly the primitive React ships for that: one
 * render with the server snapshot, then a reconciled render with the
 * real one, no manual setState-in-an-effect involved.
 */
function usePushSupported() {
  return useSyncExternalStore(noSubscribe, supportsPush, () => false);
}

export function PushSettings() {
  const supported = usePushSupported();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    Promise.all([
      navigator.serviceWorker.getRegistration("/").then(r => r?.pushManager.getSubscription()),
      fetch("/api/push").then(async r => { if (!r.ok) throw new Error("Notification settings could not be loaded. Refresh and try again."); return r.json(); }),
    ]).then(([subscription, config]) => {
      if (!active) return;
      setConfigured(Boolean(config.publicKey));
      setEnabled(Boolean(subscription && config.endpoints.includes(subscription.endpoint)));
    }).catch(e => { if (active) setMessage(e.message); });
    return () => {
      active = false;
    };
  }, [supported]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notifications were not allowed. You can change this in your browser settings.");
      }
      const response = await fetch("/api/push");
      if (!response.ok) throw new Error("Please sign in again.");
      const { publicKey } = await response.json();
      if (!publicKey) throw new Error("The Super Administrator needs to enable phone notifications first.");

      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const ready = await navigator.serviceWorker.ready;
      const key = Uint8Array.from(atob(publicKey.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
      const subscription =
        (await ready.pushManager.getSubscription()) ||
        (await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));

      const saved = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!saved.ok) throw new Error("Your notification subscription could not be saved.");
      setEnabled(true);
      setMessage("Notifications are enabled on this device.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const r = await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!r.ok) throw new Error("Could not remove the subscription. Please retry.");
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage("Notifications disabled on this device.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("Enable notifications on this device first.");
      const response = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      if (!response.ok) throw new Error(await response.text());
      setMessage("Test sent. Check your phone’s notifications. If it is quiet, check Focus/Do Not Disturb and notification settings.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Test could not be sent."); }
    finally { setBusy(false); }
  }

  return (
    <section className="panel">
      <h2>Phone &amp; browser notifications</h2>
      <p>Receive church updates and assignment alerts even when this page is closed.</p>
      {supported ? (
        <button className="primary-button" disabled={busy || (!enabled && configured !== true)} onClick={enabled ? disable : enable}>
          {busy ? "Updating…" : enabled ? "Disable on this device" : "Enable notifications on this device"}
        </button>
      ) : (
        <p>
          On iPhone or iPad, open this site in Safari, choose Share → Add to Home Screen, then open the installed
          church app to enable notifications. iOS 16.4 or later is required.
        </p>
      )}
      {supported && configured === false && <p role="status">Phone notifications need to be enabled by the church administrator in Calendar &amp; phone setup.</p>}
      {supported && enabled && <button className="secondary-button" disabled={busy} onClick={testNotification}>Send a test notification</button>}
      <details><summary>How to connect your phone</summary>
        <p><strong>iPhone / iPad:</strong> Open this website in Safari → Share → Add to Home Screen. Open the church app from your Home Screen, sign in, then go to Phone &amp; notifications and tap Enable. Requires iOS/iPadOS 16.4 or later.</p>
        <p><strong>Android:</strong> Open this website in Chrome, sign in, and tap Enable above. Allow notifications when prompted. You can also choose Add to Home Screen from Chrome’s menu.</p>
        <p>If you previously blocked notifications, allow them in the phone’s app/browser notification settings, then return here.</p>
      </details>
      <p className="form-note">
        Notifications are enabled separately on each phone or browser. On shared devices, disable them before signing
        out.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
