import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { useSettingsStore } from '../state/settingsStore';

/**
 * Host-window keyboard shortcuts (spec §16) plus the buzzer keys (spec §15)
 * for running a two-team buzzer round from a single shared keyboard.
 * SPACE = pause/resume timer · R = reveal the answer — works from the moment
 * the question appears through to a team being locked in, so the host can
 * always jump straight to the reveal without waiting on a buzz · C = correct
 * · X = incorrect (once the answer is revealed and still ungraded) · N =
 * next · team buzzer keys default to Q / P / Z / M.
 */
export function useHostKeyboardShortcuts() {
  const buzzerKeys = useSettingsStore((s) => s.buzzerKeys);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const store = useGameStore.getState();
      const game = store.game;
      if (!game) return;

      const key = e.key.toLowerCase();

      // Buzzer keys — only live while buzzers are open.
      if (game.phase === 'answering') {
        const slot = Object.entries(buzzerKeys).find(([, k]) => k === key)?.[0];
        if (slot !== undefined) {
          const sortedTeams = [...game.teams].sort((a, b) => a.order - b.order);
          const team = sortedTeams[Number(slot)];
          if (team) {
            e.preventDefault();
            store.buzzIn(team.id);
            return;
          }
        }
      }

      switch (key) {
        case ' ': {
          e.preventDefault();
          if (game.timerRunning) store.pauseTimer();
          else store.resumeTimer();
          break;
        }
        case 'c':
          if (game.phase === 'reveal' && !game.lastAwardedPoints) store.markCorrect();
          break;
        case 'x':
          if (game.phase === 'reveal' && !game.lastAwardedPoints) store.markIncorrect();
          break;
        case 'r':
          store.revealAnswer();
          break;
        case 'n':
          switch (game.phase) {
            case 'reveal':
              store.continueAfterReveal();
              break;
            case 'leaderboard':
              store.continueFromLeaderboard();
              break;
            case 'round_intro':
              store.continueFromRoundIntro();
              break;
            case 'intro':
              store.beginRoundIntro();
              break;
            case 'tie_breaker':
              store.continueFromTieAnnouncement();
              break;
            case 'sudden_death':
              store.continueFromSuddenDeathIntro();
              break;
          }
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [buzzerKeys]);
}
