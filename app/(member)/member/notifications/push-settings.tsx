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
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    navigator.serviceWorker
      .getRegistration("/")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setEnabled(Boolean(subscription));
      })
      .catch(() => {});
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

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const key = Uint8Array.from(atob(publicKey.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));

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

  return (
    <section className="panel">
      <h2>Phone &amp; browser notifications</h2>
      <p>Receive church updates and assignment alerts even when this page is closed.</p>
      {supported ? (
        <button className="primary-button" disabled={busy} onClick={enabled ? disable : enable}>
          {busy ? "Updating…" : enabled ? "Disable on this device" : "Enable notifications on this device"}
        </button>
      ) : (
        <p>
          On iPhone or iPad, open this site in Safari, choose Share → Add to Home Screen, then open the installed
          church app to enable notifications. iOS 16.4 or later is required.
        </p>
      )}
      <p className="form-note">
        Notifications are enabled separately on each phone or browser. On shared devices, disable them before signing
        out.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
