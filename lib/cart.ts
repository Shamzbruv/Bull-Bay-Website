"use client";

/**
 * Per-viewer cart state, kept in localStorage only (no live payment yet, so
 * there is nothing server-side to reserve until checkout actually creates a
 * pending order). See docs/ARCHITECTURE.md — Commerce.
 */
export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  priceMinor: number;
  quantity: number;
};

const STORAGE_KEY = "bullbay-cart-v1";
const EVENT_NAME = "bullbay-cart-updated";

function safeRead(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // localStorage unavailable (private mode etc.) — cart just won't persist.
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return safeRead();
}

export function addToCart(item: CartItem) {
  const items = safeRead();
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  safeWrite(items);
}

export function updateQuantity(variantId: string, quantity: number) {
  const items = safeRead()
    .map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  safeWrite(items);
}

export function removeFromCart(variantId: string) {
  safeWrite(safeRead().filter((i) => i.variantId !== variantId));
}

export function clearCart() {
  safeWrite([]);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.priceMinor * i.quantity, 0);
}

export function onCartUpdated(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
