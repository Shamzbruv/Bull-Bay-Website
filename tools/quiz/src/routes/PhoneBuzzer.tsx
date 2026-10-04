import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { BackgroundScene } from '../components/brand/BackgroundScene';
import { ChurchLogo } from '../components/brand/ChurchLogo';
import { BuzzerChannel, buzzerRelayAvailable, getOrCreatePhoneClientId, type BuzzerRoster } from '../lib/realtime/buzzerChannel';
import { brand } from '../config/brand';

/**
 * What a team scans onto their phone: pick your team once, then a single
 * big BUZZ button. No login, no app install — just the QR code the host
 * shows on the projector. Lives entirely outside the host's PIN gate.
 */
export function PhoneBuzzer() {
  const { gameId } = useParams();
  const [roster, setRoster] = useState<BuzzerRoster | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [justBuzzed, setJustBuzzed] = useState(false);
  const channelRef = useRef<BuzzerChannel | null>(null);
  const clientId = useRef(getOrCreatePhoneClientId());
  const storageKey = `bbntcog-buzzer-team-${gameId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setTeamId(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameId || !buzzerRelayAvailable) return;
    const channel = new BuzzerChannel(gameId);
    channelRef.current = channel;
    channel.connect({ onRoster: setRoster });
    return () => channel.close();
  }, [gameId]);

  useEffect(() => {
    if (roster?.phase !== 'answering') setJustBuzzed(false);
  }, [roster?.phase]);

  function chooseTeam(id: string) {
    setTeamId(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // ignore
    }
  }

  function buzz() {
    if (!teamId || !gameId || roster?.phase !== 'answering' || roster.buzzedTeamId) return;
    setJustBuzzed(true);
    if (navigator.vibrate) navigator.vibrate(60);
    channelRef.current?.sendBuzz({ teamId, clientId: clientId.current, timestamp: Date.now() });
  }

  if (!buzzerRelayAvailable) {
    return (
      <BackgroundScene variant="dark">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
          <ChurchLogo size="lg" />
          <h1 className="font-display text-xl font-bold">Phone buzzers aren't set up yet</h1>
          <p className="text-white/60 max-w-sm text-sm">Ask the host to finish connecting phone buzzers, then rescan the QR code.</p>
        </div>
      </BackgroundScene>
    );
  }

  const myTeam = roster?.teams.find((t) => t.id === teamId);

  return (
    <BackgroundScene variant="dark">
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <ChurchLogo size="md" />
        <p className="text-white/50 uppercase tracking-[0.3em] text-xs">{brand.abbreviatedTitle} Buzzer</p>

        {!roster ? (
          <p className="text-white/50 animate-pulse">Connecting…</p>
        ) : !teamId || !myTeam ? (
          <div className="w-full max-w-sm space-y-3">
            <p className="font-semibold text-white/80">Which team are you?</p>
            {[...roster.teams].sort((a, b) => a.order - b.order).map((team) => (
              <button
                key={team.id}
                onClick={() => chooseTeam(team.id)}
                className="w-full rounded-2xl border border-white/15 py-4 font-display text-lg font-bold"
                style={{ backgroundColor: `${team.color}22`, borderColor: `${team.color}66`, color: team.color }}
              >
                {team.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: myTeam.color }} />
              <span className="font-semibold">{myTeam.name}</span>
              <button onClick={() => setTeamId(null)} className="text-white/40 underline ml-2">
                switch
              </button>
            </div>

            <motion.button
              onClick={buzz}
              disabled={roster.phase !== 'answering' || Boolean(roster.buzzedTeamId)}
              whileTap={roster.phase === 'answering' ? { scale: 0.92 } : undefined}
              animate={roster.phase === 'answering' && !roster.buzzedTeamId ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.8, repeat: roster.phase === 'answering' && !roster.buzzedTeamId ? Infinity : 0 }}
              className="h-56 w-56 rounded-full flex flex-col items-center justify-center gap-2 font-display text-3xl font-black shadow-2xl disabled:opacity-40"
              style={{
                backgroundColor: roster.phase === 'answering' ? myTeam.color : 'rgba(255,255,255,0.08)',
                color: roster.phase === 'answering' ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              <Zap size={40} fill="currentColor" />
              BUZZ
            </motion.button>

            <p className="text-white/60 text-sm min-h-[1.5em]">
              {roster.buzzedTeamId
                ? roster.buzzedTeamId === teamId
                  ? justBuzzed
                    ? "You're locked in!"
                    : 'Locked in!'
                  : `${roster.teams.find((t) => t.id === roster.buzzedTeamId)?.name ?? 'Another team'} buzzed first`
                : roster.phase === 'answering'
                  ? 'Buzz now!'
                  : 'Get ready…'}
            </p>
          </div>
        )}
      </div>
    </BackgroundScene>
  );
}
