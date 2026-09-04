import type { ActionState } from "@/app/(public)/actions";

/**
 * Split out from app/(public)/actions.ts on purpose: that file has
 * "use server" at the top, and Next.js requires every export from a
 * server-actions file to be an async function — a plain object constant
 * like this one is invalid there. Turbopack didn't seem to enforce that at
 * runtime, but webpack (this project's production bundler — see the build
 * script) does, and threw "A 'use server' file can only export async
 * functions, found object" on every page that imported initialActionState
 * from that file. The ActionState *type* is fine to still import from
 * there — type exports are erased at compile time, so they never exist at
 * runtime and never trip this check.
 */
export const initialActionState: ActionState = { status: "idle", message: "" };
