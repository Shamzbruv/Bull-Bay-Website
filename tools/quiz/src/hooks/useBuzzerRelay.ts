import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { getCurrentQuestion } from '../lib/game/selectors';
import { BuzzerChannel, buzzerRelayAvailable } from '../lib/realtime/buzzerChannel';

/** Mounted once in the Host route — relays phone buzzes (see PhoneBuzzer.tsx) into the store and keeps phones' team lists in sync. */
export function useBuzzerRelay() {
  const game = useGameStore((s) => s.game);
  const buzzIn = useGameStore((s) => s.buzzIn);
  const channelRef = useRef<BuzzerChannel | null>(null);

  useEffect(() => {
    if (!buzzerRelayAvailable || !game) return;
    const channel = new BuzzerChannel(game.id);
    channelRef.current = channel;
    channel.connect({ onBuzz: (buzz) => buzzIn(buzz.teamId) });
    return () => {
      channel.close();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  useEffect(() => {
    if (!game || !channelRef.current) return;
    const q = getCurrentQuestion(game);
    channelRef.current.sendRoster({
      teams: game.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, order: t.order })),
      phase: game.phase,
      round: game.round,
      questionNumber: q?.questionNumber,
      buzzedTeamId: game.buzzedTeamId,
    });
  }, [game]);
}
