"use client";

import { useActionState, useState } from "react";
import { submitGivingIntent, initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];

export function GivingForm({ funds, signedIn }: { funds: { id: string; name: string }[]; signedIn: boolean }) {
  const [state, formAction] = useActionState(submitGivingIntent, initialActionState);
  const [amount, setAmount] = useState<number | null>(null);

  return (
    <form className="give-card clay-form" action={formAction}>
      <h3>Choose your gift</h3>
      <div className="amount-grid">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={amount === preset ? "selected" : ""}
            onClick={() => setAmount(preset)}
          >
            ${preset.toLocaleString()}
          </button>
        ))}
      </div>
      <label>
        Custom amount (JMD)
        <input
          name="amount"
          inputMode="numeric"
          placeholder="Enter amount"
          value={amount ?? ""}
          onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, "")) || null)}
        />
      </label>
      <label>
        Give to
        <select name="fundId" defaultValue={funds[0]?.id}>
          {funds.map((fund) => (
            <option key={fund.id} value={fund.id}>
              {fund.name}
            </option>
          ))}
        </select>
      </label>
      {!signedIn && (
        <>
          <label>
            Your name (optional)
            <input name="donorName" autoComplete="name" />
          </label>
          <label>
            Email (optional, for a receipt)
            <input name="donorEmail" type="email" autoComplete="email" />
          </label>
        </>
      )}
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Recording…">
        Continue Securely <span>→</span>
      </SubmitButton>
      <small>
        Online payment is being finalized while the church selects a Jamaica-supported provider. Your gift intent is
        recorded now and our office will follow up to complete it.
      </small>
    </form>
  );
}
