import type { CheckoutInput, CheckoutSession, PaymentEvent, PaymentGateway, PaymentStatus, RefundInput, RefundResult } from "./types";

/**
 * The default gateway until the church has chosen and been underwritten by
 * a Jamaican payment provider (PayPal, WiPay or Powertranz — see
 * docs/ARCHITECTURE.md). It never claims to collect real payment: it hands
 * back a null redirect URL so callers can show "online payment is being
 * finalized" instead of a fake success page, matching the blueprint's rule
 * that live payment code should only be written after a merchant account
 * exists.
 */
export class ComingSoonAdapter implements PaymentGateway {
  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    return { redirectUrl: null, providerReference: `pending_${input.reference}` };
  }

  async verifyWebhook(): Promise<PaymentEvent> {
    throw new Error("No payment provider is configured yet — there are no webhooks to verify.");
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error("No payment provider is configured yet — refunds must be handled manually.");
  }

  async getPayment(providerPaymentId: string): Promise<PaymentStatus> {
    return { providerPaymentId, status: "pending", amountMinor: 0 };
  }
}
