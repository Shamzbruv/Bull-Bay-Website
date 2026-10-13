"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Sending…",
  className = "primary-button",
  disabled = false,
  name,
  value,
  formNoValidate,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formNoValidate={formNoValidate}
      className={className}
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
