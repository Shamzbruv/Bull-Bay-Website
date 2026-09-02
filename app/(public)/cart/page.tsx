import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your Bag", alternates: { canonical: "/cart" } };

export default async function CartPage() {
  const user = await getSessionUser();
  return <CartView signedInEmail={user?.email ?? null} />;
}
