import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';

/**
 * Drives the countdown for the host window. One timer, one interval, no
 * duplicate intervals — mirrors the safe-timer pattern from the spec (§30):
 * a single setTimeout re-armed each second, torn down on every dependency
 * change so nothing stacks up.
 */
export function useGameTimer() {
  const timerRunning = useGameStore((s) => s.game?.timerRunning ?? false);
  const timerRemaining = useGameStore((s) => s.game?.timerRemaining ?? 0);
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    if (!timerRunning) return;

    const timeout = window.setTimeout(() => {
      tick();
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [timerRunning, timerRemaining, tick]);
}
