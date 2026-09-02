import type { ActionState } from "@/app/(public)/actions";

export function FormStatus({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return <div className={`alert ${state.status === "success" ? "success" : "warn"}`}>{state.message}</div>;
}
