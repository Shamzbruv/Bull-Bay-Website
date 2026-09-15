import { redirect } from "next/navigation";
import { PAYMENT_URL } from "@/lib/payments/external";

/** Keep existing bookmarks and shared giving links working. */
export default function GivePage() {
  redirect(PAYMENT_URL);
}
