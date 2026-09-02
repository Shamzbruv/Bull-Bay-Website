"use client";

import { updateOrderStatus } from "@/app/(admin)/admin/actions";

const STATUSES = ["pending", "awaiting_payment", "paid", "processing", "fulfilled", "cancelled", "refunded", "partially_refunded"];

export function OrderStatus({ orderId, status }: { orderId: string; status: string }) {
  return (
    <select
      defaultValue={status}
      onChange={(e) => updateOrderStatus(orderId, e.target.value)}
      style={{ borderRadius: 8, border: "1px solid var(--color-border)", padding: "4px 8px", fontSize: ".78rem" }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
