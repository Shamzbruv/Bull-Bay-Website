"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart, onCartUpdated } from "@/lib/cart";

export function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getCart().reduce((sum, i) => sum + i.quantity, 0));
    refresh();
    return onCartUpdated(refresh);
  }, []);

  return (
    <Link href="/cart" className="cart-button" aria-label="View shopping cart">
      Bag <span>{count}</span>
    </Link>
  );
}
