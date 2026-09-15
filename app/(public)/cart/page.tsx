import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your Bag", alternates: { canonical: "/cart" } };

export default async function CartPage() {
  return <CartView />;
}
