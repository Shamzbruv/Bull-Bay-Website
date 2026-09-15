"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CartItem, cartTotal, getCart, onCartUpdated, removeFromCart, updateQuantity } from "@/lib/cart";
import { PAYMENT_URL } from "@/lib/payments/external";
import { formatJmd } from "@/lib/money";

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    return onCartUpdated(refresh);
  }, []);

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

      <div className="panel">
        <h2>Pay through SpurrOpen</h2>
        <p>All payments are completed on SpurrOpen. This website does not collect payments or card details.</p>
        <p className="form-note">Your bag is a shopping list. Items and totals are not transferred automatically to SpurrOpen. Contact the church office to confirm your items and arrange collection or delivery.</p>
        <a className="primary-button" href={PAYMENT_URL}>Continue to SpurrOpen →</a>
      </div>
    </div>
  );
}
