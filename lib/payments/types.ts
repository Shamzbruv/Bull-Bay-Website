export type CheckoutInput = {
  amountMinor: number;
  currency: string;
  reference: string; // internal order or donation id
  description: string;
  customerEmail?: string | null;
  returnUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  /** Where to send the customer to complete payment. Null means the adapter
   * can't actually collect payment yet (ComingSoonAdapter). */
  redirectUrl: string | null;
  providerReference: string;
};

export type PaymentEvent = {
  providerEventId: string;
  eventType: string;
  reference: string;
  status: "succeeded" | "failed" | "refunded" | "partially_refunded";
  amountMinor: number;
  raw: unknown;
};

export type RefundInput = {
  providerPaymentId: string;
  amountMinor: number;
  reason?: string;
};

export type RefundResult = {
  providerRefundId: string;
  status: "pending" | "succeeded" | "failed";
};

export type PaymentStatus = {
  providerPaymentId: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  amountMinor: number;
};

/**
 * A Jamaica-capable payment gateway (PayPal / WiPay / Powertranz). Every
 * provider integration implements this same contract so giving, shop
 * checkout and refunds never couple to one processor. See
 * docs/ARCHITECTURE.md — Payments.
 */
export interface PaymentGateway {
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
  getPayment(providerPaymentId: string): Promise<PaymentStatus>;
}
