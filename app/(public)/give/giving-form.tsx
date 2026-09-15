import { PAYMENT_URL } from "@/lib/payments/external";

export function GivingForm() {
  return (
    <div className="give-card clay-form">
      <h3>Give through SpurrOpen</h3>
      <p>Offerings and all online payments are handled on SpurrOpen. This website does not collect payments or card details.</p>
      <a className="primary-button" href={PAYMENT_URL}>Give on SpurrOpen →</a>
    </div>
  );
}
