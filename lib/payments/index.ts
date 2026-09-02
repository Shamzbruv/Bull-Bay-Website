import type { PaymentGateway } from "./types";
import { ComingSoonAdapter } from "./coming-soon-adapter";

export * from "./types";

/**
 * Selects the active payment gateway from PAYMENT_PROVIDER. Only
 * "coming-soon" is implemented today — the paypal/wipay/powertranz branches
 * are placeholders for when the church has a merchant account, so the rest
 * of the app (giving, shop checkout, refunds) never has to change when a
 * real provider is wired in.
 */
export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_PROVIDER;

  switch (provider) {
    case "paypal":
      throw new Error("PAYPAL_CLIENT_ID/SECRET not yet configured — see docs/ROADMAP.md.");
    case "wipay":
      throw new Error("WiPay credentials not yet configured — see docs/ROADMAP.md.");
    case "powertranz":
      throw new Error("Powertranz credentials not yet configured — see docs/ROADMAP.md.");
    default:
      return new ComingSoonAdapter();
  }
}
