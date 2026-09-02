"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export function AddToCartButton({
  productId,
  variantId,
  slug,
  name,
  priceMinor,
  className = "primary-button",
  label = "Add to bag +",
  disabled = false,
}: {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  priceMinor: number;
  className?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        addToCart({ productId, variantId, slug, name, priceMinor, quantity: 1 });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? "Added ✓" : label}
    </button>
  );
}
