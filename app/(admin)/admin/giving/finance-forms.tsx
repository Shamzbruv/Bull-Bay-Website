"use client";

import { useActionState } from "react";
import { recordExpense, recordInServiceGiving } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type Fund = { id: string; name: string };

export function InServiceGivingForm({ funds }: { funds: Fund[] }) {
  const [state, formAction] = useActionState(recordInServiceGiving, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
      <label>
        Fund
        <select name="fund_id" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount (JMD)
        <input name="amount" required placeholder="25,000" />
      </label>
      <label>
        Method
        <select name="method" defaultValue="cash">
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </label>
      <label>
        Note (optional)
        <input name="note" placeholder="Sunday service, first collection" />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Saving…">Record giving</SubmitButton>
      </div>
    </form>
  );
}

export function ExpenseForm({ funds }: { funds: Fund[] }) {
  const [state, formAction] = useActionState(recordExpense, initialActionState);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
      <label>
        Category
        <input name="category" required placeholder="Utilities, Maintenance, Ministry supplies…" />
      </label>
      <label>
        Vendor (optional)
        <input name="vendor" />
      </label>
      <label>
        Amount (JMD)
        <input name="amount" required placeholder="10,000" />
      </label>
      <label>
        Date
        <input type="date" name="expense_date" defaultValue={today} />
      </label>
      <label>
        Fund (optional)
        <select name="fund_id" defaultValue="">
          <option value="">General</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 2" }}>
        Description (optional)
        <input name="description" />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Saving…">Record expense</SubmitButton>
      </div>
    </form>
  );
}
