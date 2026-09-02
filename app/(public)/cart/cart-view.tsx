"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CartItem, cartTotal, clearCart, getCart, onCartUpdated, removeFromCart, updateQuantity } from "@/lib/cart";
import { formatJmd } from "@/lib/money";

export function CartView({ signedInEmail }: { signedInEmail: string | null }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [name, setName] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");

  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    return onCartUpdated(refresh);
  }, []);

  async function checkout() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          customerName: name || undefined,
          customerEmail: email || undefined,
          fulfillmentMethod: fulfillment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(`${data.message} Order reference: ${data.orderNumber}.`);
      clearCart();
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="section" style={{ paddingTop: 50, maxWidth: 640 }}>
        <div className="alert success">{message}</div>
        <Link className="primary-button" href="/shop">
          Continue shopping <span>→</span>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="section" style={{ paddingTop: 50 }}>
        <p className="panel-empty">Your bag is empty.</p>
        <Link className="primary-button" href="/shop">
          Browse the shop <span>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="section two-col" style={{ paddingTop: 50 }}>
      <div className="panel">
        <h2>Your bag</h2>
        {items.map((item) => (
          <div key={item.variantId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--color-border)", gap: 12 }}>
            <div>
              <b>{item.name}</b>
              <div style={{ fontSize: ".78rem", color: "var(--color-muted)" }}>{formatJmd(item.priceMinor)} each</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.variantId, Number(e.target.value) || 1)}
                style={{ width: 56, borderRadius: 8, border: "1px solid var(--color-border)", padding: 6 }}
              />
              <button type="button" className="secondary-button compact" onClick={() => removeFromCart(item.variantId)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <p style={{ textAlign: "right", fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-blue-700)", marginTop: 16 }}>
          Total: {formatJmd(cartTotal(items))}
        </p>
      </div>

      <form
        className="clay-form"
        onSubmit={(e) => {
          e.preventDefault();
          checkout();
        }}
      >
        <h3 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", margin: "0 0 16px" }}>Checkout</h3>
        {!signedInEmail && (
          <>
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Email address
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          </>
        )}
        <label>
          Fulfillment
          <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
            <option value="pickup">Pickup at Bull Bay</option>
            <option value="local_delivery">Kingston / St. Andrew delivery</option>
            <option value="parish_delivery">Other parish delivery</option>
            <option value="international_shipping">International shipping</option>
            <option value="digital_delivery">Digital delivery</option>
          </select>
        </label>
        {status === "error" && <div className="alert warn">{message}</div>}
        <button type="submit" className="primary-button" disabled={status === "submitting"}>
          {status === "submitting" ? "Placing order…" : "Place Order →"}
        </button>
        <small>Payment details are collected by our office once a Jamaican payment provider is connected.</small>
      </form>
    </div>
  );
}
