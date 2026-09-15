import { NextResponse } from "next/server";
import { PAYMENT_URL } from "@/lib/payments/external";

/** Legacy checkout URLs redirect without creating orders or collecting details.
 * 303 ensures a POST becomes a GET and its body is not forwarded. */
export async function POST() {
  return NextResponse.redirect(PAYMENT_URL, 303);
}

export async function GET() {
  return NextResponse.redirect(PAYMENT_URL, 303);
}
