"use client";

import { markDonationCompleted } from "@/app/(admin)/admin/actions";

export function CompleteButton({ donationId }: { donationId: string }) {
  return (
    <button type="button" className="secondary-button compact" onClick={() => markDonationCompleted(donationId)}>
      Mark completed
    </button>
  );
}
